export interface Verification {
  id: string;
  verification_code: string;
  placement_id: string;
  student_id: string;
  record_hash: string;
  total_weeks_approved: number;
  qr_code_data: string;
  status: "verified" | "revoked" | "pending";
  issued_at: string;
}

export interface GenerateVerificationResponse {
  verification: Verification;
  verification_url: string;
}

/** Public record returned by GET /api/verifications/{code}. */
export interface VerificationResult {
  verified: boolean;
  integrity_intact: boolean;
  verification: {
    verification_code: string;
    status: Verification["status"];
    issued_at: string;
    student_name: string | null;
    organization_name: string | null;
    organization_address: string | null;
    siwes_duration: { start_date: string | null; end_date: string | null };
    total_weeks_approved: number;
    scaf_status: string | null;
    workplace_supervisor: string;
    academic_supervisor: string;
    record_hash: string;
  };
}
