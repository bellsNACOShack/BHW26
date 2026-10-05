"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlacement } from "../api/requests";
import { placementKeys } from "../keys";

export function usePlacement(id: string | undefined) {
  return useQuery({
    queryKey: placementKeys.detail(id ?? ""),
    queryFn: () => getPlacement(id as string),
    enabled: Boolean(id),
  });
}
