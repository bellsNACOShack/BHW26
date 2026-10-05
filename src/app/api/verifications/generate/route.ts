import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { computeSha256 } from "@/lib/hash";
import { logAuditEvent } from "@/lib/audit";
import { canAccessPlacement, forbidden, getActor } from "@/lib/access";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["student", "administrator", "academic_supervisor"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { placement_id } = body;

    if (!placement_id) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "placement_id is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: placement, error: pError } = await supabase
      .from("placements")
      .select(`
        *,
        student:student_id (id, full_name, email),
        log_entries (id, week_number, status, record_hash)
      `)
      .eq("id", placement_id)
      .single();

    if (pError || !placement) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Placement not found." },
        { status: 404 }
      );
    }

    if (!(await canAccessPlacement(await getActor(auth.user), placement))) {
      return forbidden("Not authorized for this placement.");
    }

    const approvedOrLockedLogs = placement.log_entries.filter(
      (l: any) => l.status === "approved" || l.status === "locked"
    );

    const randomCode = "ITL-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const summaryPayload = {
      placement_id: placement.id,
      student_id: placement.student_id,
      organization: placement.organization_name,
      start_date: placement.start_date,
      end_date: placement.end_date,
      total_approved_weeks: approvedOrLockedLogs.length,
      hashes: approvedOrLockedLogs.map((l: any) => l.record_hash).filter(Boolean).sort(),
    };
    const recordHash = computeSha256(summaryPayload);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const qrData = `${appUrl}/verify/${randomCode}`;

    const { data: verification, error: vError } = await supabase
      .from("verifications")
      .insert({
        verification_code: randomCode,
        placement_id: placement.id,
        student_id: placement.student_id,
        record_hash: recordHash,
        total_weeks_approved: approvedOrLockedLogs.length,
        qr_code_data: qrData,
        status: "verified",
      })
      .select()
      .single();

    if (vError) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: vError.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "VERIFICATION_GENERATED",
      resourceType: "verifications",
      resourceId: randomCode,
      metadata: { placement_id, total_weeks: approvedOrLockedLogs.length },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      {
        success: true,
        message: "SIWES verification record and QR reference successfully generated.",
        verification,
        verification_url: qrData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
