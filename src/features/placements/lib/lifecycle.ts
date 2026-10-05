/**
 * Logbook lifecycle after the weekly entries. One placement + its entries is the
 * single logbook record; `placements.logbook_stage` tracks where it is:
 *
 *   in_progress → itf_submitted → itf_review → itf_approved (or itf_rejected → resubmit)
 *     → academic_submitted → academic_review → academic_completed
 *     → department_submitted → department_received → archived
 */
export const LOGBOOK_STAGES = [
  "in_progress",
  "itf_submitted",
  "itf_review",
  "itf_rejected",
  "itf_approved",
  "academic_submitted",
  "academic_review",
  "academic_completed",
  "department_submitted",
  "department_received",
  "archived",
] as const;

export type LogbookStage = (typeof LOGBOOK_STAGES)[number];

export const LOGBOOK_STAGE_LABELS: Record<LogbookStage, string> = {
  in_progress: "In progress",
  itf_submitted: "Submitted to ITF",
  itf_review: "Under ITF review",
  itf_rejected: "Returned by ITF",
  itf_approved: "ITF approved",
  academic_submitted: "Submitted for academic review",
  academic_review: "Under academic review",
  academic_completed: "Signed & graded",
  department_submitted: "Submitted to department",
  department_received: "Received by department",
  archived: "Archived with ITF",
};

/** Stage groups used by role queues. */
export const ITF_PENDING_STAGES: LogbookStage[] = ["itf_submitted", "itf_review"];
export const ITF_APPROVED_STAGES: LogbookStage[] = [
  "itf_approved",
  "academic_submitted",
  "academic_review",
  "academic_completed",
  "department_submitted",
  "department_received",
  "archived",
];
export const ACADEMIC_PENDING_STAGES: LogbookStage[] = ["academic_submitted", "academic_review"];
export const ACADEMIC_COMPLETED_STAGES: LogbookStage[] = [
  "academic_completed",
  "department_submitted",
  "department_received",
  "archived",
];
export const DEPARTMENT_STAGES: LogbookStage[] = ["department_submitted", "department_received", "archived"];

export function stageIndex(stage: LogbookStage) {
  return LOGBOOK_STAGES.indexOf(stage);
}

/** True once the logbook has reached (or passed) `stage`; a rejection sits before approval. */
export function hasReachedStage(current: LogbookStage, stage: LogbookStage) {
  return stageIndex(current) >= stageIndex(stage);
}

export type LogbookAction =
  | "submit_itf"
  | "itf_open"
  | "itf_approve"
  | "itf_reject"
  | "submit_academic"
  | "academic_open"
  | "academic_grade"
  | "academic_sign"
  | "submit_department"
  | "department_receive"
  | "archive";

export type LogbookEventAction =
  | "submitted_to_itf"
  | "itf_opened"
  | "itf_approved"
  | "itf_rejected"
  | "submitted_to_academic"
  | "academic_opened"
  | "academic_graded"
  | "academic_signed"
  | "submitted_to_department"
  | "department_received"
  | "archived";

export const LOGBOOK_EVENT_LABELS: Record<LogbookEventAction, string> = {
  submitted_to_itf: "Submitted logbook for ITF review",
  itf_opened: "Opened logbook for ITF review",
  itf_approved: "Approved and signed for ITF",
  itf_rejected: "Returned logbook for correction",
  submitted_to_academic: "Submitted logbook for academic review",
  academic_opened: "Opened logbook for academic review",
  academic_graded: "Recorded academic grade",
  academic_signed: "Signed logbook as academic supervisor",
  submitted_to_department: "Submitted final logbook to department",
  department_received: "Received logbook for departmental records",
  archived: "Submitted logbook to the ITF archive",
};

/** Nigerian 5-point scale used for the academic SIWES grade. */
export const GRADE_BANDS = [
  { grade: "A", min: 70 },
  { grade: "B", min: 60 },
  { grade: "C", min: 50 },
  { grade: "D", min: 45 },
  { grade: "E", min: 40 },
  { grade: "F", min: 0 },
] as const;

export type LetterGrade = (typeof GRADE_BANDS)[number]["grade"];

export function gradeForScore(score: number): LetterGrade {
  return GRADE_BANDS.find((band) => score >= band.min)!.grade;
}

export function isValidScore(score: unknown): score is number {
  return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
}
