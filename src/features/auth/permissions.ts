import type { UserRole } from "./types";

/**
 * Frontend mirror of the role checks enforced by the API routes.
 * The backend remains the source of truth; these only decide what UI to show.
 */
const PERMISSIONS = {
  /** POST/PUT/DELETE /api/logs, POST /api/logs/{id}/submit */
  manageOwnLogbook: ["student"],
  /** POST /api/logs/{id}/review and /sign: weekly sign-off is the industry supervisor's */
  reviewEntries: ["workplace_supervisor", "administrator"],
  /** Logbook-level passkey signatures (ITF and academic stages) also need a registered passkey */
  signWithPasskey: ["workplace_supervisor", "academic_supervisor", "itf_verifier", "administrator"],
  /** PUT /api/placements/{id}/assign */
  assignSupervisors: ["administrator", "student", "academic_supervisor"],
  /** POST /api/scaf: students fill and submit their own SCAF */
  submitScaf: ["student"],
  /** GET /api/scaf + POST /api/scaf/{id}/review: ITF officers review SCAFs routed to their office */
  reviewScaf: ["itf_verifier", "administrator"],
  /** ITF stage of the logbook lifecycle (POST /api/placements/{id}/logbook itf_*) */
  reviewLogbookItf: ["itf_verifier", "administrator"],
  /** Academic stage: review, grade and sign completed logbooks */
  assessLogbooks: ["academic_supervisor", "administrator"],
  /** Departmental records and the final ITF archive submission */
  manageDepartmentRecords: ["departmental_coordinator", "administrator"],
  /** POST /api/verifications/generate */
  generateVerification: ["student", "administrator", "academic_supervisor"],
  /** GET /api/audit-logs (scoped to the records each role can access) */
  viewAuditLogs: ["administrator", "academic_supervisor", "itf_verifier", "departmental_coordinator"],
  /** Staff who browse many placements via GET /api/placements */
  browsePlacements: ["workplace_supervisor", "academic_supervisor", "administrator", "itf_verifier", "departmental_coordinator"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  workplace_supervisor: "Workplace supervisor",
  academic_supervisor: "Academic supervisor",
  administrator: "Administrator",
  itf_verifier: "ITF officer",
  departmental_coordinator: "Departmental SIWES coordinator",
};

export function isSupervisor(role: UserRole | undefined) {
  return role === "workplace_supervisor" || role === "academic_supervisor";
}
