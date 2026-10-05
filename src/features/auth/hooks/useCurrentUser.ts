"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../api/requests";
import { authKeys } from "../keys";
import { useAuthToken } from "./useAuthToken";

export function useCurrentUser() {
  const token = useAuthToken();
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getCurrentUser,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });
}
