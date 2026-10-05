import type { ItfOffice, UserRole } from "@/features/auth/types";
import type { StudentSummary, UserSummary } from "@/features/placements/types";
import type { ScafDetails } from "./lib/fields";

export type ScafSubmissionStatus = "draft" | "submitted" | "under_review" | "approved" | "requires_correction";

/** Shape returned by GET /api/scaf and /api/scaf/{id}. */
export interface ScafSubmission {
  id: string;
  placement_id: string;
  student_id: string;
  itf_office_id: string | null;
  details: ScafDetails;
  status: ScafSubmissionStatus;
  review_comments: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  student: StudentSummary | null;
  reviewer: { id: string; full_name: string; role: UserRole } | null;
  itf_office: ItfOffice | null;
  placement: {
    id: string;
    organization_name: string;
    organization_address: string;
    organization_state: string | null;
    start_date: string;
    end_date: string;
    workplace_supervisor: UserSummary | null;
  } | null;
}

export type ScafReviewAction = "open" | "approve" | "request_correction";
