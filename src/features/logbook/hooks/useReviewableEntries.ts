"use client";

import { useMemo } from "react";
import { usePlacements } from "@/features/placements/hooks/usePlacements";
import type { PlacementWithPeople } from "@/features/placements/types";
import type { LogEntryListItem, LogEntryStatus } from "../types";
import { useLogEntries } from "./useLogEntries";

export interface ReviewableEntry extends LogEntryListItem {
  placement: PlacementWithPeople;
}

/**
 * Entries from the placements visible to the current staff user.
 *
 * GET /api/placements is scoped by role (supervisors only see their assigned
 * students) but GET /api/logs is not, so entries are matched to the scoped
 * placements here to keep each supervisor's queue to their own students.
 */
export function useReviewableEntries(status?: LogEntryStatus, options: { enabled?: boolean } = {}) {
  const placements = usePlacements();
  const entries = useLogEntries({ status }, options);

  const data = useMemo(() => {
    if (!placements.data || !entries.data) return undefined;
    const byId = new Map(placements.data.map((p) => [p.id, p]));
    return entries.data
      .filter((entry) => byId.has(entry.placement_id))
      .map((entry) => ({ ...entry, placement: byId.get(entry.placement_id)! }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [placements.data, entries.data]);

  return {
    data,
    isLoading: placements.isLoading || entries.isLoading,
    error: placements.error ?? entries.error,
    refetch: () => {
      void placements.refetch();
      void entries.refetch();
    },
  };
}
