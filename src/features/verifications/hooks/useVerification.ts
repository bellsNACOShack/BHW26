"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { getVerification } from "../api/requests";
import { verificationKeys } from "../keys";

export function useVerification(code: string) {
  return useQuery({
    queryKey: verificationKeys.detail(code),
    queryFn: () => getVerification(code),
    enabled: Boolean(code),
    // An unknown code is a definitive answer, not a transient failure.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}
