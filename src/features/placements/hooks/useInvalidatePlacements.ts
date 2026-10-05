"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { dashboardKeys } from "@/features/dashboard/keys";
import { placementKeys } from "../keys";

/** Placement changes affect placement lists/details and dashboard stats. */
export function useInvalidatePlacements() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: placementKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
    [queryClient]
  );
}
