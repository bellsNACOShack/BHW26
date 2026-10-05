import type { LogEntryStatus } from "../types";

export const LOG_STATUS_LABELS: Record<LogEntryStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Needs revision",
  locked: "Signed & locked",
};

/** Students may only edit, attach diagrams to, or (re)submit these states. */
export function isEditableStatus(status: LogEntryStatus) {
  return status === "draft" || status === "rejected";
}

export function isApprovedStatus(status: LogEntryStatus) {
  return status === "approved" || status === "locked";
}

export function isAwaitingReview(status: LogEntryStatus) {
  return status === "submitted" || status === "under_review";
}
