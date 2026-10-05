"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/keys";
import { generateVerification } from "../api/requests";

export function useGenerateVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateVerification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}
