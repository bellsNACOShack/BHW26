import type { UserRole } from "@/features/auth/types";
import type { Placement } from "@/features/placements/types";

export type LogEntryStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "locked";
export type ReviewAction = "approve" | "reject" | "request_changes";

export interface LogEntry {
  id: string;
  student_id: string;
  placement_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  activities: string;
  skills: string | null;
  tools: string | null;
  challenges: string | null;
  remarks: string | null;
  supporting_evidence_url: string | null;
  status: LogEntryStatus;
  record_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface ActorSummary {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface Approval {
  id: string;
  log_entry_id: string;
  supervisor_id: string;
  action: ReviewAction;
  comments: string | null;
  created_at: string;
  /** Only joined by GET /api/logs/{id}. */
  supervisor?: ActorSummary | null;
}

export interface Signature {
  id: string;
  log_entry_id: string;
  user_id: string;
  signature_type: "passkey" | "digital_pin" | "crypto_ecdsa";
  signature_reference: string;
  passkey_credential_id: string | null;
  content_hash: string;
  created_at: string;
  /** Only joined by GET /api/logs/{id}. */
  user?: ActorSummary | null;
}

/** Shape returned by GET /api/logs. */
export interface LogEntryListItem extends LogEntry {
  student: { id: string; full_name: string; email: string } | null;
  approvals: Approval[];
  signatures: Signature[];
}

/** Shape returned by GET /api/logs/{id}. */
export interface LogEntryDetail extends LogEntryListItem {
  placement: Placement | null;
}

export interface LogEntryFilters {
  placement_id?: string;
  status?: LogEntryStatus;
  week_number?: number;
}

export interface CreateLogEntryPayload {
  placement_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  activities: string;
  skills?: string | null;
  tools?: string | null;
  challenges?: string | null;
  remarks?: string | null;
  supporting_evidence_url?: string | null;
}

export type UpdateLogEntryPayload = Partial<
  Pick<LogEntry, "activities" | "skills" | "tools" | "challenges" | "remarks" | "supporting_evidence_url">
>;

export interface ReviewLogEntryPayload {
  action: ReviewAction;
  comments?: string;
}

export interface SignLogEntryPayload {
  signature_reference: string;
  signature_type: "passkey";
  passkey_credential_id: string;
}
