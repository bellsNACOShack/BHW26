"use client";

import { useMutation } from "@tanstack/react-query";
import { updatePlacement } from "../api/requests";
import type { UpdatePlacementPayload } from "../types";
import { useInvalidatePlacements } from "./useInvalidatePlacements";

export function useUpdatePlacement(id: string) {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (payload: UpdatePlacementPayload) => updatePlacement(id, payload),
    onSuccess: invalidate,
  });
}
