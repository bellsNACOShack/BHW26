"use client";

import { useQuery } from "@tanstack/react-query";
import type { ItfOffice } from "@/features/auth/types";
import { apiRequest } from "@/lib/api-client";

/** ITF area offices (public; used at sign-up and to preview a placement's routing). */
export function useItfOffices() {
  return useQuery({
    queryKey: ["itf-offices"],
    queryFn: async () => (await apiRequest<{ offices: ItfOffice[] }>("/itf-offices", { anonymous: true })).offices,
    staleTime: Infinity,
  });
}
