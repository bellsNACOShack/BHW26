import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: placement, error } = await supabase
      .from("placements")
      .select(`
        *,
        student:student_id (id, full_name, email, phone_number),
        workplace_supervisor:workplace_supervisor_id (id, full_name, email, phone_number),
        academic_supervisor:academic_supervisor_id (id, full_name, email, phone_number),
        log_entries (id, week_number, start_date, end_date, status, record_hash)
      `)
      .eq("id", params.id)
      .single();

    if (error || !placement) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Placement not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, placement }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: placement } = await supabase
      .from("placements")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!placement) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Placement not found." },
        { status: 404 }
      );
    }

    if (auth.user.role === "student" && placement.student_id !== auth.user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "You cannot edit another student's placement." },
        { status: 403 }
      );
    }

    const { data: updated, error } = await supabase
      .from("placements")
      .update({
        organization_name: body.organization_name || placement.organization_name,
        organization_address: body.organization_address || placement.organization_address,
        acceptance_letter_url: body.acceptance_letter_url ?? placement.acceptance_letter_url,
        status: body.status || placement.status,
      })
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
      action: "PLACEMENT_UPDATED",
      resourceType: "placements",
      resourceId: params.id,
      metadata: body,
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ success: true, message: "Placement updated.", placement: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
