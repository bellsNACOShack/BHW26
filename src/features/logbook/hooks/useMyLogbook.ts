"use client";

import { useMyPlacement } from "@/features/placements/hooks/usePlacements";
import { useLogEntries } from "./useLogEntries";

/** The signed-in student's placement together with its weekly entries. */
export function useMyLogbook() {
  const placementQuery = useMyPlacement();
  const placement = placementQuery.data;
  const entriesQuery = useLogEntries({ placement_id: placement?.id }, { enabled: Boolean(placement) });

  return {
    placement,
    entries: entriesQuery.data,
    /** True until we know whether a placement exists and, if so, its entries are loaded. */
    isLoading: placementQuery.isLoading || (Boolean(placement) && entriesQuery.isLoading),
    error: placementQuery.error ?? entriesQuery.error,
    refetch: () => {
      void placementQuery.refetch();
      if (placement) void entriesQuery.refetch();
    },
  };
}
