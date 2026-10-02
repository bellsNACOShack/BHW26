import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

interface RouteParams {
  params: { id: string };
}

const VALID_SCAF_STATUSES = ["pending", "printed", "submitted_to_itf", "verified"];

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { scaf_status } = body;

    if (!scaf_status || !VALID_SCAF_STATUSES.includes(scaf_status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: `scaf_status must be one of: ${VALID_SCAF_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: placement } = await supabase
      .from("placements")
      .select("student_id")
      .eq("id", params.id)
      .single();

    if (!placement) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Placement not found." },
        { status: 404 }
      );
    }

    // Only the student owner, admin, or ITF verifier can update SCAF status
    const isOwner = auth.user.role === "student" && placement.student_id === auth.user.userId;
    const isAuthorizedStaff = auth.user.role === "administrator" || auth.user.role === "itf_verifier";

    if (!isOwner && !isAuthorizedStaff) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "Not authorized to update this placement." },
        { status: 403 }
      );
    }

    const { data: updated, error } = await supabase
      .from("placements")
      .update({ scaf_status })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "SCAF_STATUS_UPDATED",
      resourceType: "placements",
      resourceId: params.id,
      metadata: { scaf_status },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: `SCAF form status updated to '${scaf_status}'.`,
      placement: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
