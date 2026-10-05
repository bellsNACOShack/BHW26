"use client";

import { useMutation } from "@tanstack/react-query";
import { createPlacement } from "../api/requests";
import { useInvalidatePlacements } from "./useInvalidatePlacements";

export function useCreatePlacement() {
  const invalidate = useInvalidatePlacements();
  return useMutation({ mutationFn: createPlacement, onSuccess: invalidate });
}
