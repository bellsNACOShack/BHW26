"use client";

import { useMutation } from "@tanstack/react-query";
import { updateLogEntry } from "../api/requests";
import type { UpdateLogEntryPayload } from "../types";
import { useInvalidateLogs } from "./useInvalidateLogs";

export function useUpdateLogEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateLogEntryPayload & { id: string }) => updateLogEntry(id, payload),
    onSuccess: invalidate,
  });
}
