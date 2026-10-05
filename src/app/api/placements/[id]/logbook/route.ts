import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, type UserRole } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import {
  badRequest,
  forbidden,
  getActor,
  getCoordinatorIdsForStudent,
  getItfOfficerIds,
  loadAccessiblePlacement,
  notFound,
  serverError,
} from "@/lib/access";
import { computeLogbookHash } from "@/lib/hash";
import { notifyUsers } from "@/lib/notifications";
import { getTotalWeeks } from "@/features/logbook/lib/weeks";
import {
  gradeForScore,
  isValidScore,
  type LogbookAction,
  type LogbookEventAction,
  type LogbookStage,
} from "@/features/placements/lib/lifecycle";

interface RouteParams {
  params: { id: string };
}

/** Who may perform each action, and from which stages. */
const RULES: Record<LogbookAction, { roles: UserRole[]; from: LogbookStage[] }> = {
  submit_itf: { roles: ["student"], from: ["in_progress", "itf_rejected"] },
  itf_open: { roles: ["itf_verifier", "administrator"], from: ["itf_submitted"] },
  itf_approve: { roles: ["itf_verifier", "administrator"], from: ["itf_submitted", "itf_review"] },
  itf_reject: { roles: ["itf_verifier", "administrator"], from: ["itf_submitted", "itf_review"] },
  submit_academic: { roles: ["student"], from: ["itf_approved"] },
  academic_open: { roles: ["academic_supervisor", "administrator"], from: ["academic_submitted"] },
  academic_grade: { roles: ["academic_supervisor", "administrator"], from: ["academic_submitted", "academic_review"] },
  academic_sign: { roles: ["academic_supervisor", "administrator"], from: ["academic_submitted", "academic_review"] },
  submit_department: { roles: ["student"], from: ["academic_completed"] },
  department_receive: { roles: ["departmental_coordinator", "administrator"], from: ["department_submitted"] },
  archive: { roles: ["departmental_coordinator", "administrator"], from: ["department_received"] },
};

/** "Opening" actions only record the first view; repeating them is a harmless no-op. */
const IDEMPOTENT: LogbookAction[] = ["itf_open", "academic_open", "department_receive"];

/**
 * Moves the single logbook record (placement + weekly entries) through its
 * verification chain. Every transition is checked here, recorded as a logbook
 * event (visible to everyone with access) and in the audit log, and notified.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const action = body.action as LogbookAction;
    const rule = RULES[action];
    if (!rule) return badRequest(`Unknown action '${body.action}'.`);
    if (!rule.roles.includes(auth.user.role)) {
      return forbidden(`Your role can't perform '${action}' on a logbook.`);
    }

    const actor = await getActor(auth.user);
    if (!(await loadAccessiblePlacement(actor, params.id))) {
      return forbidden("You don't have access to this logbook.");
    }

    const supabase = getSupabaseAdmin();
    const { data: placement } = await supabase
      .from("placements")
      .select("*, log_entries (id, week_number, status, record_hash)")
      .eq("id", params.id)
      .single();
    if (!placement) return notFound("Placement not found.");

    const stage = placement.logbook_stage as LogbookStage;
    if (!rule.from.includes(stage)) {
      if (IDEMPOTENT.includes(action)) return NextResponse.json({ success: true, logbook_stage: stage });
      return badRequest(`This logbook is at '${stage}' and can't be moved with '${action}'.`, "Invalid State");
    }

    // Role-specific ownership on top of the placement scope.
    if (actor.role === "student" && placement.student_id !== actor.id) return forbidden();
    if (actor.role === "academic_supervisor" && placement.academic_supervisor_id !== actor.id) {
      return forbidden("Only the student's assigned academic supervisor can act at this stage.");
    }

    const entries: { id: string; week_number: number; status: string; record_hash: string | null }[] =
      placement.log_entries ?? [];
    const studentId = placement.student_id as string;
    const comments = typeof body.comments === "string" ? body.comments.trim() : "";
    const ip = request.headers.get("x-forwarded-for");

    let nextStage: LogbookStage = stage;
    let event: LogbookEventAction;
    const metadata: Record<string, any> = {};

    /** Inserts a logbook-level passkey signature sealing the current logbook hash. */
    const signLogbook = async (signatureStage: "itf" | "academic") => {
      if (!body.signature_reference) return { error: badRequest("A passkey signature is required.") };
      const contentHash = computeLogbookHash(placement, entries);
      const { data: signature, error } = await supabase
        .from("signatures")
        .insert({
          placement_id: placement.id,
          stage: signatureStage,
          user_id: actor.id,
          signature_type: "passkey",
          signature_reference: body.signature_reference,
          passkey_credential_id: body.passkey_credential_id || null,
          content_hash: contentHash,
          ip_address: ip,
          user_agent: request.headers.get("user-agent"),
        })
        .select("id")
        .single();
      if (error || !signature) return { error: serverError(error?.message ?? "Failed to record signature.") };
      metadata.signature_id = signature.id;
      metadata.content_hash = contentHash;
      return { error: null };
    };

    switch (action) {
      case "submit_itf": {
        // The industry supervisor must have signed (locked) every week of the placement.
        const totalWeeks = getTotalWeeks(placement);
        const locked = new Set(entries.filter((e) => e.status === "locked").map((e) => e.week_number));
        const missing = Array.from({ length: totalWeeks }, (_, i) => i + 1).filter((week) => !locked.has(week));
        if (missing.length) {
          return badRequest(
            `Every week must be signed by your industry supervisor first. Still to sign: week ${missing.join(", ")}.`,
            "Invalid State"
          );
        }
        if (!placement.itf_office_id) {
          return badRequest("Add your organization's state to your placement so the logbook can be routed to an ITF office.");
        }
        event = "submitted_to_itf";
        nextStage = "itf_submitted";
        metadata.resubmission = stage === "itf_rejected";
        break;
      }
      case "itf_open":
        event = "itf_opened";
        nextStage = "itf_review";
        break;
      case "itf_approve": {
        const { error } = await signLogbook("itf");
        if (error) return error;
        event = "itf_approved";
        nextStage = "itf_approved";
        break;
      }
      case "itf_reject": {
        if (!comments) return badRequest("A reason is required to reject a logbook.");
        // Optionally reopen signed weeks so the student can correct them; the industry
        // supervisor then re-approves and re-signs them. Earlier signatures stay on record.
        const reopenWeeks: number[] = Array.isArray(body.reopen_weeks)
          ? Array.from(new Set(body.reopen_weeks.map(Number).filter(Number.isInteger)))
          : [];
        const toReopen = entries.filter((e) => reopenWeeks.includes(e.week_number) && e.status === "locked");
        if (toReopen.length !== reopenWeeks.length) {
          return badRequest("Only signed weeks of this logbook can be reopened.");
        }
        if (toReopen.length) {
          const ids = toReopen.map((e) => e.id);
          const { error: reopenError } = await supabase
            .from("log_entries")
            .update({ status: "rejected", record_hash: null })
            .in("id", ids);
          if (reopenError) return serverError(reopenError.message);
          await supabase.from("approvals").insert(
            ids.map((log_entry_id) => ({ log_entry_id, supervisor_id: actor.id, action: "reject", comments: `ITF: ${comments}` }))
          );
          metadata.reopened_weeks = toReopen.map((e) => e.week_number).sort((a, b) => a - b);
        }
        event = "itf_rejected";
        nextStage = "itf_rejected";
        break;
      }
      case "submit_academic":
        if (!placement.academic_supervisor_id) {
          return badRequest("Assign your academic supervisor on the Placement page before submitting.");
        }
        event = "submitted_to_academic";
        nextStage = "academic_submitted";
        break;
      case "academic_open":
        event = "academic_opened";
        nextStage = "academic_review";
        break;
      case "academic_grade": {
        const score = typeof body.score === "string" ? Number(body.score) : body.score;
        if (!isValidScore(score)) return badRequest("Enter a score between 0 and 100.");
        const rounded = Math.round(score * 100) / 100;
        const grade = gradeForScore(rounded);
        const remarks = typeof body.remarks === "string" && body.remarks.trim() ? body.remarks.trim() : null;
        const { error } = await supabase
          .from("logbook_assessments")
          .upsert({ placement_id: placement.id, supervisor_id: actor.id, score: rounded, grade, remarks }, { onConflict: "placement_id" });
        if (error) return serverError(error.message);
        event = "academic_graded";
        // Grading alone doesn't complete the stage; the signature does.
        nextStage = stage === "academic_submitted" ? "academic_review" : stage;
        Object.assign(metadata, { score: rounded, grade });
        break;
      }
      case "academic_sign": {
        const { data: assessment } = await supabase
          .from("logbook_assessments")
          .select("id, score, grade")
          .eq("placement_id", placement.id)
          .maybeSingle();
        if (!assessment) return badRequest("Grade the student before signing the logbook.", "Invalid State");
        const { error } = await signLogbook("academic");
        if (error) return error;
        Object.assign(metadata, { score: assessment.score, grade: assessment.grade });
        event = "academic_signed";
        nextStage = "academic_completed";
        break;
      }
      case "submit_department":
        if (body.confirm !== true) return badRequest("Confirm the final submission to your department.");
        event = "submitted_to_department";
        nextStage = "department_submitted";
        break;
      case "department_receive":
        event = "department_received";
        nextStage = "department_received";
        break;
      case "archive":
        event = "archived";
        nextStage = "archived";
        break;
    }

    const now = new Date().toISOString();
    const { error: stageError } = await supabase
      .from("placements")
      .update({
        logbook_stage: nextStage,
        logbook_stage_updated_at: now,
        // Archiving ends the placement's lifecycle.
        ...(nextStage === "archived" ? { status: "completed" } : {}),
      })
      .eq("id", placement.id);
    if (stageError) return serverError(stageError.message);

    await supabase.from("logbook_events").insert({
      placement_id: placement.id,
      actor_id: actor.id,
      action: event!,
      comments: comments || null,
      metadata,
    });

    await logAuditEvent({
      userId: actor.id,
      action: `LOGBOOK_${event!.toUpperCase()}`,
      resourceType: "placements",
      resourceId: placement.id,
      metadata: { ...metadata, ...(comments ? { comments } : {}), from: stage, to: nextStage },
      ipAddress: ip,
    });

    await sendNotifications(event!, placement, { comments, metadata, actorName: auth.user.fullName });

    return NextResponse.json({ success: true, logbook_stage: nextStage, metadata });
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}

async function sendNotifications(
  event: LogbookEventAction,
  placement: any,
  { comments, metadata, actorName }: { comments: string; metadata: Record<string, any>; actorName: string }
) {
  const student = [placement.student_id];
  const reviewLink = `/logbooks/${placement.id}`;
  const studentLink = "/logbook";

  switch (event) {
    case "submitted_to_itf":
      await notifyUsers(await getItfOfficerIds(placement.itf_office_id), {
        title: metadata.resubmission ? "Corrected logbook resubmitted" : "New logbook review request",
        body: `${actorName} ${metadata.resubmission ? "resubmitted their corrected" : "submitted their"} logbook for ITF review.`,
        link: reviewLink,
      });
      await notifyUsers(student, { title: "Logbook sent to ITF", body: "Your ITF office will review and sign it.", link: studentLink });
      break;
    case "itf_approved":
      await notifyUsers(student, {
        title: "ITF approved your logbook",
        body: "You can now submit it to your academic supervisor.",
        link: studentLink,
      });
      break;
    case "itf_rejected": {
      const weeks: number[] = metadata.reopened_weeks ?? [];
      await notifyUsers(student, {
        title: "ITF returned your logbook",
        body: weeks.length ? `${comments} (Reopened: week ${weeks.join(", ")})` : comments,
        link: studentLink,
      });
      if (weeks.length) {
        await notifyUsers([placement.workplace_supervisor_id], {
          title: "ITF reopened weeks for correction",
          body: `Week ${weeks.join(", ")} will need your approval and signature again once corrected.`,
          link: `/placements/${placement.id}`,
        });
      }
      break;
    }
    case "submitted_to_academic":
      await notifyUsers([placement.academic_supervisor_id], {
        title: "New logbook review request",
        body: `${actorName} submitted their ITF-approved logbook for review and grading.`,
        link: reviewLink,
      });
      await notifyUsers(student, { title: "Logbook sent to your academic supervisor", link: studentLink });
      break;
    case "academic_graded":
      await notifyUsers(student, { title: "Your SIWES grade was recorded", body: `Grade ${metadata.grade}.`, link: studentLink });
      break;
    case "academic_signed":
      await notifyUsers(student, {
        title: "Academic supervisor signed your logbook",
        body: "You can now submit your final logbook to your department.",
        link: studentLink,
      });
      break;
    case "submitted_to_department":
      await notifyUsers(await getCoordinatorIdsForStudent(placement.student_id), {
        title: "New completed logbook",
        body: `${actorName} submitted their signed and graded logbook to the department.`,
        link: reviewLink,
      });
      await notifyUsers(student, { title: "Final logbook submitted to your department", link: studentLink });
      break;
    case "department_received":
      await notifyUsers(student, { title: "Your department received your logbook", link: studentLink });
      break;
    case "archived":
      await notifyUsers(student, { title: "Logbook archived with ITF", body: "Your SIWES record is complete.", link: studentLink });
      await notifyUsers(await getItfOfficerIds(placement.itf_office_id), {
        title: "Logbook submitted to the ITF archive",
        link: reviewLink,
      });
      break;
  }
}
