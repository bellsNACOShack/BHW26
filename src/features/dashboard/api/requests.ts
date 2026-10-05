import { apiRequest } from "@/lib/api-client";
import type { DashboardStatsResponse } from "../types";

export function getDashboardStats() {
  return apiRequest<DashboardStatsResponse>("/dashboard/stats");
}
