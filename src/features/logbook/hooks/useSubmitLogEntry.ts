"use client";

import { useMutation } from "@tanstack/react-query";
import { submitLogEntry } from "../api/requests";
import { useInvalidateLogs } from "./useInvalidateLogs";

export function useSubmitLogEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({ mutationFn: submitLogEntry, onSuccess: invalidate });
}
