import type { Placement } from "@/features/placements/types";

export interface StudentStats {
  placement: Pick<Placement, "id" | "status" | "scaf_status" | "organization_name" | "start_date" | "end_date"> | null;
  total_weeks_logged: number;
  approved_weeks: number;
  pending_reviews: number;
  drafts: number;
  rejected_weeks: number;
}

export interface SupervisorStats {
  assigned_students: number;
  pending_reviews: number;
  total_approved_entries: number;
}

export interface InstitutionStats {
  total_students: number;
  total_placements: number;
  active_placements: number;
  total_verifications: number;
}

export interface AcademicStats {
  assigned_students: number;
  pending_assessments: number;
  completed_assessments: number;
}

export interface ItfStats {
  office_students: number;
  pending_scaf: number;
  pending_logbooks: number;
  approved_logbooks: number;
  rejected_logbooks: number;
}

export interface DepartmentStats {
  department_students: number;
  awaiting_receipt: number;
  received_logbooks: number;
  archived_logbooks: number;
}

/** GET /api/dashboard/stats returns a different `stats` shape per role. */
export type DashboardStatsResponse =
  | { role: "student"; stats: StudentStats }
  | { role: "workplace_supervisor"; stats: SupervisorStats }
  | { role: "academic_supervisor"; stats: AcademicStats }
  | { role: "itf_verifier"; stats: ItfStats }
  | { role: "departmental_coordinator"; stats: DepartmentStats }
  | { role: "administrator"; stats: InstitutionStats };
