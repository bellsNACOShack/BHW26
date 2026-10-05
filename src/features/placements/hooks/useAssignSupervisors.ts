"use client";

import { useMutation } from "@tanstack/react-query";
import { assignSupervisors } from "../api/requests";
import type { AssignSupervisorsPayload } from "../types";
import { useInvalidatePlacements } from "./useInvalidatePlacements";

export function useAssignSupervisors(id: string) {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (payload: AssignSupervisorsPayload) => assignSupervisors(id, payload),
    onSuccess: invalidate,
  });
}
