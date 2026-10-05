"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateScafStatus } from "@/features/placements/hooks/useUpdateScafStatus";
import { SCAF_STATUSES, SCAF_STATUS_LABELS } from "@/features/placements/lib/status";
import type { Placement, ScafStatus } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const STEP_HINTS: Record<ScafStatus, string> = {
  pending: "Download the SCAF form from your ITCU portal.",
  printed: "Form printed and filled.",
  submitted_to_itf: "Submitted at your nearest ITF office.",
  verified: "ITF has verified your SCAF.",
};

/** Tracks the physical SCAF form through ITF (PUT /api/placements/{id}/scaf). */
export function ScafStatusCard({ placement, editable }: { placement: Placement; editable: boolean }) {
  const update = useUpdateScafStatus(placement.id);
  const currentIndex = SCAF_STATUSES.indexOf(placement.scaf_status);

  function handleChange(status: string) {
    update.mutate(status as ScafStatus, {
      onSuccess: () => toast.success(`SCAF status set to ${SCAF_STATUS_LABELS[status as ScafStatus]}`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <SectionCard
      title="SCAF form"
      description="Student Commencement Attestation Form"
      actions={
        editable ? (
          <Select value={placement.scaf_status} onValueChange={handleChange} disabled={update.isPending}>
            <SelectTrigger className="h-9 w-44" aria-label="SCAF status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCAF_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {SCAF_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : undefined
      }
    >
      <ol className="space-y-3">
        {SCAF_STATUSES.map((status, index) => {
          const done = index <= currentIndex;
          return (
            <li key={status} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-success text-white" : "border bg-secondary"
                )}
              >
                {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
              </span>
              <div>
                <p className={cn("text-sm", done ? "text-foreground" : "text-muted-foreground")}>{SCAF_STATUS_LABELS[status]}</p>
                <p className="text-xs text-muted-foreground">{STEP_HINTS[status]}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
