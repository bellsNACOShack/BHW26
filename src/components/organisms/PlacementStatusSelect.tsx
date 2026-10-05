"use client";

import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdatePlacement } from "@/features/placements/hooks/useUpdatePlacement";
import { PLACEMENT_STATUSES, PLACEMENT_STATUS_LABELS } from "@/features/placements/lib/status";
import type { Placement, PlacementStatus } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";

/** Administrators mark placements active, completed or terminated. */
export function PlacementStatusSelect({ placement }: { placement: Placement }) {
  const update = useUpdatePlacement(placement.id);

  function handleChange(value: string) {
    const status = value as PlacementStatus;
    update.mutate(
      { status },
      {
        onSuccess: () => toast.success(`Placement marked ${PLACEMENT_STATUS_LABELS[status].toLowerCase()}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  return (
    <Select value={placement.status} onValueChange={handleChange} disabled={update.isPending}>
      <SelectTrigger className="h-9 w-40" aria-label="Placement status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PLACEMENT_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {PLACEMENT_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
