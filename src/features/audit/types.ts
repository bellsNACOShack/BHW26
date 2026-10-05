import type { UserRole } from "@/features/auth/types";

export type AuditResourceType = "users" | "placements" | "log_entries" | "passkey_credentials" | "verifications";

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user: { id: string; full_name: string; email: string; role: UserRole } | null;
}

export interface AuditLogFilters {
  resource_type?: AuditResourceType;
  resource_id?: string;
  limit?: number;
}
