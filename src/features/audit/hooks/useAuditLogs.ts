"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api/requests";
import { auditKeys } from "../keys";
import type { AuditLogFilters } from "../types";

export function useAuditLogs(filters: AuditLogFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => getAuditLogs(filters),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}
