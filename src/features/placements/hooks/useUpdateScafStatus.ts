"use client";

import { useMutation } from "@tanstack/react-query";
import { updateScafStatus } from "../api/requests";
import type { ScafStatus } from "../types";
import { useInvalidatePlacements } from "./useInvalidatePlacements";

export function useUpdateScafStatus(id: string) {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (status: ScafStatus) => updateScafStatus(id, status),
    onSuccess: invalidate,
  });
}
