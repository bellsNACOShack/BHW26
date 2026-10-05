import type { ItfOffice, StudentProfile, UserRole } from "@/features/auth/types";
import type { LogEntryStatus } from "@/features/logbook/types";
import type { LetterGrade, LogbookAction, LogbookEventAction, LogbookStage } from "./lib/lifecycle";

export type PlacementStatus = "pending" | "active" | "completed" | "terminated";
export type ScafStatus = "pending" | "printed" | "submitted_to_itf" | "verified";

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
}

export interface Placement {
  id: string;
  student_id: string;
  organization_name: string;
  organization_address: string;
  start_date: string;
  end_date: string;
  workplace_supervisor_id: string | null;
  academic_supervisor_id: string | null;
  acceptance_letter_url: string | null;
  scaf_status: ScafStatus;
  status: PlacementStatus;
  /** State of the organization; routes the placement to that state's ITF office. */
  organization_state: string | null;
  itf_office_id: string | null;
  logbook_stage: LogbookStage;
  logbook_stage_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentSummary extends UserSummary {
  student_profile: Pick<StudentProfile, "matric_number" | "institution" | "department" | "program" | "level"> | null;
}

export interface LogbookAssessment {
  id: string;
  score: number;
  grade: LetterGrade;
  remarks: string | null;
  supervisor_id: string;
  created_at: string;
  updated_at: string;
}

/** Shape returned by GET /api/placements (people, ITF office and grade joined). */
export interface PlacementWithPeople extends Placement {
  student: StudentSummary | null;
  workplace_supervisor: UserSummary | null;
  academic_supervisor: UserSummary | null;
  itf_office: ItfOffice | null;
  assessment: LogbookAssessment | null;
}

interface ActorSummary {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface LogbookEvent {
  id: string;
  action: LogbookEventAction;
  comments: string | null;
  metadata: { reopened_weeks?: number[]; resubmission?: boolean; score?: number; grade?: LetterGrade; content_hash?: string };
  created_at: string;
  actor: ActorSummary | null;
}

/** Logbook-level signatures (ITF officer and academic supervisor). */
export interface LogbookSignature {
  id: string;
  stage: "industry" | "itf" | "academic";
  signature_type: string;
  content_hash: string;
  created_at: string;
  user: ActorSummary | null;
}

export interface PlacementLogSummary {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  status: LogEntryStatus;
  record_hash: string | null;
}

/** Shape returned by GET /api/placements/{id}. */
export interface PlacementDetail extends PlacementWithPeople {
  log_entries: PlacementLogSummary[];
  logbook_events: LogbookEvent[];
  signatures: LogbookSignature[];
  scaf_submission: { id: string; status: string; submitted_at: string | null; reviewed_at: string | null } | null;
}

export interface PlacementFilters {
  logbook_stage?: LogbookStage[];
}

export interface LogbookActionPayload {
  action: LogbookAction;
  comments?: string;
  reopen_weeks?: number[];
  score?: number;
  remarks?: string;
  confirm?: boolean;
  signature_reference?: string;
  passkey_credential_id?: string;
}

export interface CreatePlacementPayload {
  organization_name: string;
  organization_address: string;
  organization_state: string;
  start_date: string;
  end_date: string;
  acceptance_letter_url?: string;
}

export interface UpdatePlacementPayload {
  organization_name?: string;
  organization_address?: string;
  organization_state?: string;
  acceptance_letter_url?: string | null;
  status?: PlacementStatus;
}

export interface AssignSupervisorsPayload {
  workplace_supervisor_id?: string | null;
  academic_supervisor_id?: string | null;
}
