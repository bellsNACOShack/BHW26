import { apiRequest } from "@/lib/api-client";
import type {
  AssignSupervisorsPayload,
  CreatePlacementPayload,
  LogbookActionPayload,
  Placement,
  PlacementDetail,
  PlacementFilters,
  PlacementWithPeople,
  ScafStatus,
  UpdatePlacementPayload,
} from "../types";

export async function getPlacements(filters: PlacementFilters = {}) {
  const { placements } = await apiRequest<{ placements: PlacementWithPeople[] }>("/placements", {
    query: { logbook_stage: filters.logbook_stage?.join(",") },
  });
  return placements;
}

/** Moves the logbook through its lifecycle (POST /api/placements/{id}/logbook). */
export function logbookAction(id: string, payload: LogbookActionPayload) {
  return apiRequest<{ logbook_stage: string }>(`/placements/${id}/logbook`, { method: "POST", body: payload });
}

export async function getPlacement(id: string) {
  const { placement } = await apiRequest<{ placement: PlacementDetail }>(`/placements/${id}`);
  return placement;
}

export async function createPlacement(payload: CreatePlacementPayload) {
  const { placement } = await apiRequest<{ placement: Placement }>("/placements", { method: "POST", body: payload });
  return placement;
}

export async function updatePlacement(id: string, payload: UpdatePlacementPayload) {
  const { placement } = await apiRequest<{ placement: Placement }>(`/placements/${id}`, {
    method: "PUT",
    body: payload,
  });
  return placement;
}

export async function assignSupervisors(id: string, payload: AssignSupervisorsPayload) {
  const { placement } = await apiRequest<{ placement: PlacementWithPeople }>(`/placements/${id}/assign`, {
    method: "PUT",
    body: payload,
  });
  return placement;
}

export async function updateScafStatus(id: string, scaf_status: ScafStatus) {
  const { placement } = await apiRequest<{ placement: Placement }>(`/placements/${id}/scaf`, {
    method: "PUT",
    body: { scaf_status },
  });
  return placement;
}
