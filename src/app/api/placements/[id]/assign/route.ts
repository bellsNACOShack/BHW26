import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["administrator", "student", "academic_supervisor"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { workplace_supervisor_id, academic_supervisor_id } = body;

    const supabase = getSupabaseAdmin();

    const updatePayload: Record<string, any> = {};
    if (workplace_supervisor_id !== undefined) {
      updatePayload.workplace_supervisor_id = workplace_supervisor_id;
    }
    if (academic_supervisor_id !== undefined) {
      updatePayload.academic_supervisor_id = academic_supervisor_id;
    }

    const { data: updated, error } = await supabase
      .from("placements")
      .update(updatePayload)
      .eq("id", params.id)
      .select(`
        *,
        workplace_supervisor:workplace_supervisor_id (id, full_name, email),
        academic_supervisor:academic_supervisor_id (id, full_name, email)
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "PLACEMENT_SUPERVISORS_ASSIGNED",
      resourceType: "placements",
      resourceId: params.id,
      metadata: updatePayload,
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: "Supervisors assigned successfully.",
      placement: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
