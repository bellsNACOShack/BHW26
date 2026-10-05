"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { dashboardKeys } from "@/features/dashboard/keys";
import { placementKeys } from "@/features/placements/keys";
import { logKeys } from "../keys";

/** Entry changes affect entry lists/details, placement week summaries and dashboard stats. */
export function useInvalidateLogs() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: logKeys.all }),
        queryClient.invalidateQueries({ queryKey: placementKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
    [queryClient]
  );
}
