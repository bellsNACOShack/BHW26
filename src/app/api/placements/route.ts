import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getPlacementDateError } from "@/features/placements/lib/dates";
import { isNigerianState } from "@/features/placements/lib/states";
import { getAccessiblePlacementIds, getActor } from "@/lib/access";
import { PLACEMENT_PEOPLE_SELECT, getItfOfficeIdForState, shapePlacement } from "@/lib/placements";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("placements").select(`*, ${PLACEMENT_PEOPLE_SELECT}`);

    // Role-based visibility: own / assigned / ITF office / department (see lib/access.ts)
    const scope = await getAccessiblePlacementIds(await getActor(auth.user));
    if (scope !== "all") {
      if (scope.length === 0) return NextResponse.json({ success: true, placements: [] }, { status: 200 });
      query = query.in("id", scope);
    }

    // Optional lifecycle filter, e.g. ?logbook_stage=itf_submitted,itf_review
    const stages = new URL(request.url).searchParams.get("logbook_stage");
    if (stages) query = query.in("logbook_stage", stages.split(",").map((s) => s.trim()).filter(Boolean));

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, placements: (data ?? []).map(shapePlacement) }, { status: 200 });
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
      organization_state,
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

    if (!isNigerianState(organization_state)) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Choose the state your organization is in.", field: "organization_state" },
        { status: 400 }
      );
    }

    const dateError = getPlacementDateError(start_date, end_date);
    if (dateError) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: dateError.message, field: dateError.field },
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
        organization_state,
        // Routed to the ITF area office serving the organization's state
        itf_office_id: await getItfOfficeIdForState(organization_state),
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
