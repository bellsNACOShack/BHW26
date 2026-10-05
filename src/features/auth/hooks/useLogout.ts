"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearAuthToken } from "../session";

/** The API is stateless (JWT), so signing out only discards the token and cache. */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(() => {
    clearAuthToken();
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);
}
