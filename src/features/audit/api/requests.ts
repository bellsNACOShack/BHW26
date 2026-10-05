import { apiRequest } from "@/lib/api-client";
import type { AuditLog, AuditLogFilters } from "../types";

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const { audit_logs } = await apiRequest<{ audit_logs: AuditLog[] }>("/audit-logs", { query: { ...filters } });
  return audit_logs;
}
