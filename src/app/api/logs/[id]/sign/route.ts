import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { computeLogEntryHash } from "@/lib/hash";
import { logAuditEvent } from "@/lib/audit";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["workplace_supervisor", "academic_supervisor", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { signature_reference, signature_type = "passkey", passkey_credential_id } = body;

    if (!signature_reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "signature_reference is required for digital sign-off.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: logEntry, error } = await supabase
      .from("log_entries")
      .select(`*, placement:placement_id (*)`)
      .eq("id", params.id)
      .single();

    if (error || !logEntry) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Log entry not found." },
        { status: 404 }
      );
    }

    if (logEntry.status === "locked") {
      return NextResponse.json(
        {
          success: false,
          error: "Record Locked",
          message: "This log entry has already been digitally signed and permanently locked.",
        },
        { status: 400 }
      );
    }

    const placement = logEntry.placement;
    const isWorkplaceSupervisor = placement.workplace_supervisor_id === auth.user.userId;
    const isAcademicSupervisor = placement.academic_supervisor_id === auth.user.userId;
    const isAdmin = auth.user.role === "administrator";

    if (!isWorkplaceSupervisor && !isAcademicSupervisor && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "You are not assigned as an authorized supervisor for this placement.",
        },
        { status: 403 }
      );
    }

    const recordHash = computeLogEntryHash(logEntry);

    const { data: newSig, error: sigError } = await supabase
      .from("signatures")
      .insert({
        log_entry_id: params.id,
        user_id: auth.user.userId,
        signature_type,
        signature_reference,
        passkey_credential_id: passkey_credential_id || null,
        content_hash: recordHash,
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
      })
      .select()
      .single();

    if (sigError) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: sigError.message },
        { status: 500 }
      );
    }

    const { data: updatedEntry, error: updateError } = await supabase
      .from("log_entries")
      .update({
        status: "locked",
        record_hash: recordHash,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: updateError.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "LOG_ENTRY_SIGNED_AND_LOCKED",
      resourceType: "log_entries",
      resourceId: params.id,
      metadata: {
        week_number: logEntry.week_number,
        signature_id: newSig.id,
        record_hash: recordHash,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: `Week ${logEntry.week_number} entry successfully signed and locked with SHA-256 integrity digest.`,
      signature: newSig,
      log_entry: updatedEntry,
      integrity_hash: recordHash,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
