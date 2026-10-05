"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/keys";
import { notificationKeys } from "@/features/notifications/keys";
import { placementKeys } from "@/features/placements/keys";
import { getScafSubmission, getScafSubmissions, reviewScaf, saveScaf } from "./api";
import type { ScafReviewAction, ScafSubmissionStatus } from "./types";

export const scafKeys = {
  all: ["scaf"] as const,
  list: (status?: ScafSubmissionStatus[]) => [...scafKeys.all, "list", status ?? []] as const,
  detail: (id: string) => [...scafKeys.all, "detail", id] as const,
};

export function useScafSubmissions(status?: ScafSubmissionStatus[], options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: scafKeys.list(status), queryFn: () => getScafSubmissions(status), ...options });
}

/** A student's own SCAF (students have at most one placement, so at most one SCAF). */
export function useMyScaf(options: { enabled?: boolean } = {}) {
  const query = useScafSubmissions(undefined, options);
  return { ...query, data: query.data ? (query.data[0] ?? null) : undefined };
}

export function useScafSubmission(id: string) {
  return useQuery({ queryKey: scafKeys.detail(id), queryFn: () => getScafSubmission(id) });
}

/** SCAF changes also move the placement's SCAF badge and the dashboard counters. */
function useInvalidateScaf() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: scafKeys.all }),
      queryClient.invalidateQueries({ queryKey: placementKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    ]);
}

export function useSaveScaf() {
  const invalidate = useInvalidateScaf();
  return useMutation({ mutationFn: saveScaf, onSuccess: invalidate });
}

export function useReviewScaf(id: string) {
  const invalidate = useInvalidateScaf();
  return useMutation({
    mutationFn: (payload: { action: ScafReviewAction; comments?: string }) => reviewScaf(id, payload),
    onSuccess: invalidate,
  });
}
