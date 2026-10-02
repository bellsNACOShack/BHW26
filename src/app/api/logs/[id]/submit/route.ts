import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["student"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: logEntry, error } = await supabase
      .from("log_entries")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !logEntry) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Log entry not found." },
        { status: 404 }
      );
    }

    if (logEntry.student_id !== auth.user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "You can only submit your own log entries." },
        { status: 403 }
      );
    }

    if (logEntry.status !== "draft" && logEntry.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid State",
          message: `Cannot submit entry with status '${logEntry.status}'. Must be 'draft' or 'rejected'.`,
        },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("log_entries")
      .update({ status: "submitted" })
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
      action: "LOG_ENTRY_SUBMITTED",
      resourceType: "log_entries",
      resourceId: params.id,
      metadata: { week_number: logEntry.week_number },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: `Week ${logEntry.week_number} entry submitted for supervisor review.`,
      log_entry: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
