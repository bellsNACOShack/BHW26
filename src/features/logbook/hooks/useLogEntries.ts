"use client";

import { useQuery } from "@tanstack/react-query";
import { getLogEntries } from "../api/requests";
import { logKeys } from "../keys";
import type { LogEntryFilters } from "../types";

export function useLogEntries(filters: LogEntryFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: logKeys.list(filters),
    queryFn: () => getLogEntries(filters),
    enabled: options.enabled ?? true,
  });
}
