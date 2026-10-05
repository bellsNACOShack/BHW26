"use client";

import { useQuery } from "@tanstack/react-query";
import { getLogEntry } from "../api/requests";
import { logKeys } from "../keys";

export function useLogEntry(id: string | undefined) {
  return useQuery({
    queryKey: logKeys.detail(id ?? ""),
    queryFn: () => getLogEntry(id as string),
    enabled: Boolean(id),
  });
}
