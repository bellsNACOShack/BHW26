"use client";

import { useMutation } from "@tanstack/react-query";
import { createLogEntry } from "../api/requests";
import { useInvalidateLogs } from "./useInvalidateLogs";

export function useCreateLogEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({ mutationFn: createLogEntry, onSuccess: invalidate });
}
