import type { AuditLogFilters } from "./types";

export const auditKeys = {
  all: ["audit-logs"] as const,
  list: (filters: AuditLogFilters) => [...auditKeys.all, filters] as const,
};
