"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api/requests";
import { dashboardKeys } from "../keys";

export function useDashboardStats() {
  return useQuery({ queryKey: dashboardKeys.stats(), queryFn: getDashboardStats });
}
