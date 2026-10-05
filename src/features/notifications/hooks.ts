"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationsRead } from "./api";
import { notificationKeys } from "./keys";

/** Polls the user's notifications so new requests and decisions show up without a reload. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: getNotifications,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
