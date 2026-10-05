import { Archive, Lock } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { LOG_STATUS_LABELS } from "@/features/logbook/lib/status";
import type { LogEntryStatus } from "@/features/logbook/types";
import { PLACEMENT_STATUS_LABELS, SCAF_STATUS_LABELS } from "@/features/placements/lib/status";
import type { PlacementStatus, ScafStatus } from "@/features/placements/types";
import { LOGBOOK_STAGE_LABELS, type LogbookStage } from "@/features/placements/lib/lifecycle";
import { SCAF_SUBMISSION_LABELS } from "@/features/scaf/lib/status";
import type { ScafSubmissionStatus } from "@/features/scaf/types";

type Variant = NonNullable<BadgeProps["variant"]>;

const LOG_VARIANTS: Record<LogEntryStatus, Variant> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  approved: "success",
  rejected: "destructive",
  locked: "success",
};

export function LogStatusBadge({ status, className }: { status: LogEntryStatus; className?: string }) {
  return (
    <Badge variant={LOG_VARIANTS[status]} className={className}>
      {status === "locked" && <Lock className="size-3" aria-hidden />}
      {LOG_STATUS_LABELS[status]}
    </Badge>
  );
}

const SCAF_VARIANTS: Record<ScafStatus, Variant> = {
  pending: "neutral",
  printed: "warning",
  submitted_to_itf: "info",
  verified: "success",
};

export function ScafStatusBadge({ status }: { status: ScafStatus }) {
  return <Badge variant={SCAF_VARIANTS[status]}>SCAF · {SCAF_STATUS_LABELS[status]}</Badge>;
}

const PLACEMENT_VARIANTS: Record<PlacementStatus, Variant> = {
  pending: "neutral",
  active: "success",
  completed: "info",
  terminated: "destructive",
};

export function PlacementStatusBadge({ status }: { status: PlacementStatus }) {
  return <Badge variant={PLACEMENT_VARIANTS[status]}>{PLACEMENT_STATUS_LABELS[status]}</Badge>;
}

const STAGE_VARIANTS: Record<LogbookStage, Variant> = {
  in_progress: "neutral",
  itf_submitted: "info",
  itf_review: "info",
  itf_rejected: "destructive",
  itf_approved: "success",
  academic_submitted: "info",
  academic_review: "info",
  academic_completed: "success",
  department_submitted: "info",
  department_received: "success",
  archived: "success",
};

export function LogbookStageBadge({ stage }: { stage: LogbookStage }) {
  return (
    <Badge variant={STAGE_VARIANTS[stage]}>
      {stage === "archived" && <Archive className="size-3" aria-hidden />}
      {LOGBOOK_STAGE_LABELS[stage]}
    </Badge>
  );
}

const SCAF_SUBMISSION_VARIANTS: Record<ScafSubmissionStatus, Variant> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  approved: "success",
  requires_correction: "destructive",
};

export function ScafSubmissionBadge({ status }: { status: ScafSubmissionStatus }) {
  return <Badge variant={SCAF_SUBMISSION_VARIANTS[status]}>{SCAF_SUBMISSION_LABELS[status]}</Badge>;
}
