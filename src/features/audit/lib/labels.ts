/** Human-readable labels for the action codes the API routes write via logAuditEvent. */
const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: "Registered an account",
  USER_LOGIN: "Signed in",
  PASSKEY_REGISTERED: "Registered a passkey",
  PLACEMENT_CREATED: "Created placement",
  PLACEMENT_UPDATED: "Updated placement",
  PLACEMENT_SUPERVISORS_ASSIGNED: "Assigned supervisors",
  SCAF_STATUS_UPDATED: "Updated SCAF status",
  LOG_ENTRY_CREATED: "Created entry",
  LOG_ENTRY_UPDATED: "Edited entry",
  LOG_ENTRY_DELETED: "Deleted draft entry",
  LOG_ENTRY_SUBMITTED: "Submitted for review",
  LOG_ENTRY_APPROVED: "Approved entry",
  LOG_ENTRY_REJECTED: "Returned entry for revision",
  LOG_ENTRY_SIGNED_AND_LOCKED: "Signed and locked record",
  VERIFICATION_GENERATED: "Generated verification code",
  SCAF_SAVED: "Saved SCAF draft",
  SCAF_SUBMITTED: "Submitted SCAF to ITF",
  SCAF_REVIEW_STARTED: "Opened SCAF for review",
  SCAF_APPROVED: "Approved SCAF",
  SCAF_CORRECTION_REQUESTED: "Requested SCAF correction",
  LOGBOOK_SUBMITTED_TO_ITF: "Submitted logbook for ITF review",
  LOGBOOK_ITF_OPENED: "Opened logbook for ITF review",
  LOGBOOK_ITF_APPROVED: "Approved and signed logbook for ITF",
  LOGBOOK_ITF_REJECTED: "Rejected logbook with reason",
  LOGBOOK_SUBMITTED_TO_ACADEMIC: "Submitted logbook for academic review",
  LOGBOOK_ACADEMIC_OPENED: "Opened logbook for academic review",
  LOGBOOK_ACADEMIC_GRADED: "Graded logbook",
  LOGBOOK_ACADEMIC_SIGNED: "Signed logbook as academic supervisor",
  LOGBOOK_SUBMITTED_TO_DEPARTMENT: "Submitted final logbook to department",
  LOGBOOK_DEPARTMENT_RECEIVED: "Received logbook for department",
  LOGBOOK_ARCHIVED: "Submitted logbook to ITF archive",
};

export function getAuditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.toLowerCase().replace(/_/g, " ");
}

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  users: "Users",
  placements: "Placements",
  log_entries: "Log entries",
  passkey_credentials: "Passkeys",
  verifications: "Verifications",
};
