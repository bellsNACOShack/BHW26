import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("placements").select(`
      *,
      student:student_id (id, full_name, email),
      workplace_supervisor:workplace_supervisor_id (id, full_name, email),
      academic_supervisor:academic_supervisor_id (id, full_name, email)
    `);

    // Role-based visibility per PRD
    if (auth.user.role === "student") {
      query = query.eq("student_id", auth.user.userId);
    } else if (auth.user.role === "workplace_supervisor") {
      query = query.eq("workplace_supervisor_id", auth.user.userId);
    } else if (auth.user.role === "academic_supervisor") {
      query = query.eq("academic_supervisor_id", auth.user.userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, placements: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["student", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const {
      organization_name,
      organization_address,
      start_date,
      end_date,
      acceptance_letter_url,
      student_id: customStudentId,
    } = body;

    if (!organization_name || !organization_address || !start_date || !end_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "organization_name, organization_address, start_date, and end_date are required.",
        },
        { status: 400 }
      );
    }

    const targetStudentId = auth.user.role === "administrator" && customStudentId ? customStudentId : auth.user.userId;
    const supabase = getSupabaseAdmin();

    const { data: newPlacement, error } = await supabase
      .from("placements")
      .insert({
        student_id: targetStudentId,
        organization_name: organization_name.trim(),
        organization_address: organization_address.trim(),
        start_date,
        end_date,
        acceptance_letter_url: acceptance_letter_url || null,
        status: "active",
        scaf_status: "pending",
      })
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
      action: "PLACEMENT_CREATED",
      resourceType: "placements",
      resourceId: newPlacement.id,
      metadata: { organization_name, start_date, end_date },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Placement created successfully with acceptance letter attached.",
        placement: newPlacement,
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
