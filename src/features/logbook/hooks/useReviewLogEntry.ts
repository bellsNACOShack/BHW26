"use client";

import { useMutation } from "@tanstack/react-query";
import { reviewLogEntry } from "../api/requests";
import type { ReviewLogEntryPayload } from "../types";
import { useInvalidateLogs } from "./useInvalidateLogs";

export function useReviewLogEntry(id: string) {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: (payload: ReviewLogEntryPayload) => reviewLogEntry(id, payload),
    onSuccess: invalidate,
  });
}
