import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { badRequest, forbidden, getAccessiblePlacementIds, getActor, getItfOfficerIds, serverError } from "@/lib/access";
import { notifyUsers } from "@/lib/notifications";
import { SCAF_SUBMISSION_SELECT, shapeScafSubmission } from "@/lib/scaf";
import { cleanScafDetails, getScafErrors } from "@/features/scaf/lib/fields";

/** SCAF submissions visible to the user: their own, or those routed to their ITF office. */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("scaf_submissions").select(SCAF_SUBMISSION_SELECT);

    const actor = await getActor(auth.user);
    if (actor.role === "itf_verifier") {
      if (!actor.itf_office_id) return NextResponse.json({ success: true, submissions: [] });
      // ITF officers never see a student's unsubmitted drafts.
      query = query.eq("itf_office_id", actor.itf_office_id).neq("status", "draft");
    } else {
      const scope = await getAccessiblePlacementIds(actor);
      if (scope !== "all") {
        if (scope.length === 0) return NextResponse.json({ success: true, submissions: [] });
        query = query.in("placement_id", scope);
      }
    }

    const status = new URL(request.url).searchParams.get("status");
    if (status) query = query.in("status", status.split(",").map((s) => s.trim()).filter(Boolean));

    const { data, error } = await query.order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) return serverError(error.message);

    return NextResponse.json({ success: true, submissions: (data ?? []).map(shapeScafSubmission) });
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}

/** Students save (`submit: false`) or submit their SCAF to the ITF office their placement is routed to. */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["student"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: placement } = await supabase
      .from("placements")
      .select("id, student_id, itf_office_id, organization_state")
      .eq("id", body.placement_id)
      .single();

    if (!placement || placement.student_id !== auth.user.userId) {
      return forbidden("Invalid placement or placement does not belong to you.");
    }

    const { data: existing } = await supabase
      .from("scaf_submissions")
      .select("id, status")
      .eq("placement_id", placement.id)
      .maybeSingle();

    if (existing && !["draft", "requires_correction"].includes(existing.status)) {
      return badRequest("Your SCAF has already been submitted to ITF and can't be changed now.", "Invalid State");
    }

    const details = cleanScafDetails(body.details);
    const submit = body.submit === true;

    if (submit) {
      if (!placement.itf_office_id) {
        return badRequest("Add your organization's state to your placement so the SCAF can be routed to an ITF office.");
      }
      const errors = getScafErrors(details);
      if (Object.keys(errors).length) {
        return NextResponse.json(
          { success: false, error: "Validation Error", message: "Complete every required SCAF field before submitting.", fields: errors },
          { status: 400 }
        );
      }
    }

    const row = {
      placement_id: placement.id,
      student_id: placement.student_id,
      itf_office_id: placement.itf_office_id,
      details,
      status: submit ? "submitted" : existing?.status ?? "draft",
      ...(submit ? { submitted_at: new Date().toISOString() } : {}),
    };

    const { data: saved, error } = existing
      ? await supabase.from("scaf_submissions").update(row).eq("id", existing.id).select(SCAF_SUBMISSION_SELECT).single()
      : await supabase.from("scaf_submissions").insert(row).select(SCAF_SUBMISSION_SELECT).single();

    if (error || !saved) return serverError(error?.message ?? "Failed to save SCAF.");

    if (submit) {
      await supabase.from("placements").update({ scaf_status: "submitted_to_itf" }).eq("id", placement.id);
      const resubmitted = existing?.status === "requires_correction";
      await notifyUsers(await getItfOfficerIds(placement.itf_office_id), {
        title: resubmitted ? "Corrected SCAF resubmitted" : "New SCAF submission",
        body: `${auth.user.fullName} ${resubmitted ? "resubmitted their corrected" : "submitted their"} SCAF form.`,
        link: `/itf/scaf/${saved.id}`,
      });
      await notifyUsers([auth.user.userId], {
        title: "SCAF submitted",
        body: "Your SCAF form was sent to your ITF office for review.",
        link: "/placement",
      });
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: submit ? "SCAF_SUBMITTED" : "SCAF_SAVED",
      resourceType: "placements",
      resourceId: placement.id,
      metadata: { scaf_id: saved.id },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      {
        success: true,
        message: submit ? "SCAF submitted to your ITF office." : "SCAF draft saved.",
        submission: shapeScafSubmission(saved),
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}
