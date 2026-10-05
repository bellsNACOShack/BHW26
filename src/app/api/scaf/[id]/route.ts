import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { forbidden, getActor, loadAccessiblePlacement, notFound, serverError } from "@/lib/access";
import { SCAF_SUBMISSION_SELECT, shapeScafSubmission } from "@/lib/scaf";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("scaf_submissions")
      .select(SCAF_SUBMISSION_SELECT)
      .eq("id", params.id)
      .single();
    if (error || !data) return notFound("SCAF submission not found.");

    const actor = await getActor(auth.user);
    const allowed =
      actor.role === "itf_verifier"
        ? Boolean(actor.itf_office_id) && data.itf_office_id === actor.itf_office_id && data.status !== "draft"
        : Boolean(await loadAccessiblePlacement(actor, data.placement_id));
    if (!allowed) return forbidden("You don't have access to this SCAF submission.");

    return NextResponse.json({ success: true, submission: shapeScafSubmission(data) });
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}
