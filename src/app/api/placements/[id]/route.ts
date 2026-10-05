import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { canAccessPlacement, forbidden, getActor } from "@/lib/access";
import { PLACEMENT_PEOPLE_SELECT, getItfOfficeIdForState, shapePlacement } from "@/lib/placements";
import { isNigerianState } from "@/features/placements/lib/states";

interface RouteParams {
  params: { id: string };
}

/**
 * The placement and its weekly entries are the single authoritative logbook; the
 * detail response carries its whole chain of custody (events, logbook-level
 * signatures, grade and SCAF) for every role that can access it.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: placement, error } = await supabase
      .from("placements")
      .select(`
        *,
        ${PLACEMENT_PEOPLE_SELECT},
        log_entries (id, week_number, start_date, end_date, status, record_hash, updated_at),
        logbook_events (id, action, comments, metadata, created_at, actor:actor_id (id, full_name, role)),
        signatures (id, stage, signature_type, content_hash, created_at, user:user_id (id, full_name, role)),
        scaf_submissions (id, status, submitted_at, reviewed_at, review_comments)
      `)
      .eq("id", params.id)
      .single();

    if (error || !placement) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Placement not found." },
        { status: 404 }
      );
    }

    if (!(await canAccessPlacement(await getActor(auth.user), placement))) {
      return forbidden("You don't have access to this placement.");
    }

    const shaped = shapePlacement(placement);
    shaped.logbook_events = [...(shaped.logbook_events ?? [])].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));

    return NextResponse.json({ success: true, placement: shaped }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["student", "administrator"]);
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

    const update: Record<string, any> = {
      organization_name: body.organization_name || placement.organization_name,
      organization_address: body.organization_address || placement.organization_address,
      acceptance_letter_url: body.acceptance_letter_url ?? placement.acceptance_letter_url,
      // Only administrators manage the placement's overall status.
      status: auth.user.role === "administrator" && body.status ? body.status : placement.status,
    };

    // Changing the organization's state re-routes the placement to another ITF office,
    // which is only allowed before anything has been sent to ITF.
    if (body.organization_state !== undefined && body.organization_state !== placement.organization_state) {
      if (!isNigerianState(body.organization_state)) {
        return NextResponse.json(
          { success: false, error: "Validation Error", message: "Choose the state your organization is in." },
          { status: 400 }
        );
      }
      const { data: scaf } = await supabase
        .from("scaf_submissions")
        .select("status")
        .eq("placement_id", params.id)
        .maybeSingle();
      const sentToItf = (scaf && scaf.status !== "draft") || placement.logbook_stage !== "in_progress";
      if (sentToItf) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            message: "The organization's state can't change after your SCAF or logbook has been sent to ITF.",
          },
          { status: 400 }
        );
      }
      update.organization_state = body.organization_state;
      update.itf_office_id = await getItfOfficeIdForState(body.organization_state);
    }

    const { data: updated, error } = await supabase
      .from("placements")
      .update(update)
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
