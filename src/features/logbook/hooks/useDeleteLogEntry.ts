"use client";

import { useMutation } from "@tanstack/react-query";
import { deleteLogEntry } from "../api/requests";
import { useInvalidateLogs } from "./useInvalidateLogs";

export function useDeleteLogEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({ mutationFn: deleteLogEntry, onSuccess: invalidate });
}
