import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { badRequest, forbidden, getActor, loadAccessiblePlacement } from "@/lib/access";

/** Each slot only accepts an account with the matching role. */
const SLOT_ROLES = {
  workplace_supervisor_id: { role: "workplace_supervisor", label: "workplace supervisor" },
  academic_supervisor_id: { role: "academic_supervisor", label: "academic supervisor" },
} as const;

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

    // Students change their own placement, academic supervisors only one they're assigned to.
    const placement = await loadAccessiblePlacement(await getActor(auth.user), params.id);
    if (!placement) return forbidden("You can only assign supervisors on a placement you own or supervise.");

    for (const [slot, { role, label }] of Object.entries(SLOT_ROLES)) {
      const userId = body[slot];
      if (!userId) continue;
      const { data: account } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
      if (!account) return badRequest(`No account matches that ${label} ID. Ask them to copy it from their dashboard.`);
      if (account.role !== role) return badRequest(`That ID belongs to an account that isn't a ${label}.`);
    }

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
