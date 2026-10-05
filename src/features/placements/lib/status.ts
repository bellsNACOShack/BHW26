import type { PlacementStatus, ScafStatus } from "../types";

export const SCAF_STATUS_LABELS: Record<ScafStatus, string> = {
  pending: "Pending",
  printed: "Printed",
  submitted_to_itf: "Submitted to ITF",
  verified: "Verified",
};

export const SCAF_STATUSES = Object.keys(SCAF_STATUS_LABELS) as ScafStatus[];

export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
  terminated: "Terminated",
};

export const PLACEMENT_STATUSES = Object.keys(PLACEMENT_STATUS_LABELS) as PlacementStatus[];
