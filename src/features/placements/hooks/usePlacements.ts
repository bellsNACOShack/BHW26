"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlacements } from "../api/requests";
import { placementKeys } from "../keys";
import type { PlacementFilters } from "../types";

/** Placements visible to the current user (the API scopes the list by role), optionally by logbook stage. */
export function usePlacements(filters: PlacementFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: placementKeys.list(filters), queryFn: () => getPlacements(filters), ...options });
}

/**
 * A student's current placement. Students have at most one in practice;
 * the API returns newest first, so the first entry is the active one.
 */
export function useMyPlacement() {
  const query = usePlacements();
  return { ...query, data: query.data ? (query.data[0] ?? null) : undefined };
}
