import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { badRequest, forbidden, getActor, notFound, serverError } from "@/lib/access";
import { notifyUsers } from "@/lib/notifications";
import { SCAF_SUBMISSION_SELECT, shapeScafSubmission } from "@/lib/scaf";

interface RouteParams {
  params: { id: string };
}

const ACTIONS = ["open", "approve", "request_correction"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * ITF officers review SCAFs routed to their office:
 * - `open` marks a newly submitted SCAF as under review;
 * - `approve` verifies it;
 * - `request_correction` returns it to the student (a comment is mandatory).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["itf_verifier", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const action = body.action as Action;
    const comments = typeof body.comments === "string" ? body.comments.trim() : "";
    if (!ACTIONS.includes(action)) return badRequest(`action must be one of: ${ACTIONS.join(", ")}`);
    if (action === "request_correction" && !comments) {
      return badRequest("Explain what the student needs to correct.");
    }

    const supabase = getSupabaseAdmin();
    const { data: scaf } = await supabase.from("scaf_submissions").select("*").eq("id", params.id).single();
    if (!scaf) return notFound("SCAF submission not found.");

    const actor = await getActor(auth.user);
    if (actor.role === "itf_verifier" && (!actor.itf_office_id || scaf.itf_office_id !== actor.itf_office_id)) {
      return forbidden("This SCAF was routed to a different ITF office.");
    }

    const reviewable = scaf.status === "submitted" || scaf.status === "under_review";
    if (action === "open") {
      // Opening is idempotent: only the first view of a new submission changes anything.
      if (scaf.status !== "submitted") return NextResponse.json({ success: true, submission: null });
    } else if (!reviewable) {
      return badRequest(`This SCAF is '${scaf.status}' and isn't awaiting review.`, "Invalid State");
    }

    const now = new Date().toISOString();
    const update =
      action === "open"
        ? { status: "under_review", reviewer_id: actor.id }
        : {
            status: action === "approve" ? "approved" : "requires_correction",
            reviewer_id: actor.id,
            review_comments: comments || null,
            reviewed_at: now,
          };

    const { data: updated, error } = await supabase
      .from("scaf_submissions")
      .update(update)
      .eq("id", params.id)
      .select(SCAF_SUBMISSION_SELECT)
      .single();
    if (error || !updated) return serverError(error?.message ?? "Failed to update SCAF.");

    if (action !== "open") {
      await supabase
        .from("placements")
        .update({ scaf_status: action === "approve" ? "verified" : "pending" })
        .eq("id", scaf.placement_id);
      await notifyUsers([scaf.student_id], {
        title: action === "approve" ? "SCAF approved by ITF" : "SCAF needs correction",
        body: action === "approve" ? "ITF has verified your SCAF form." : comments,
        link: "/placement",
      });
    }

    await logAuditEvent({
      userId: actor.id,
      action: { open: "SCAF_REVIEW_STARTED", approve: "SCAF_APPROVED", request_correction: "SCAF_CORRECTION_REQUESTED" }[action],
      resourceType: "placements",
      resourceId: scaf.placement_id,
      metadata: { scaf_id: scaf.id, ...(comments ? { comments } : {}) },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({ success: true, submission: shapeScafSubmission(updated) });
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}
