"use client";

import { AlertTriangle, Loader2, MessageSquareWarning, Send } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LogbookStageBadge } from "@/components/atoms/StatusBadge";
import { SectionCard } from "@/components/molecules/SectionCard";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTotalWeeks } from "@/features/logbook/lib/weeks";
import { useLogbookAction } from "@/features/placements/hooks/useLogbookAction";
import { usePlacement } from "@/features/placements/hooks/usePlacement";
import type { LogbookAction } from "@/features/placements/lib/lifecycle";
import type { PlacementDetail } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { LogbookTracker } from "./LogbookTracker";

interface NextStep {
  action?: LogbookAction;
  label?: string;
  disabled?: boolean;
  hint: ReactNode;
  confirm?: { title: string; description: string; confirmLabel: string; final?: boolean };
  success?: string;
}

function getNextStep(placement: PlacementDetail): NextStep {
  const totalWeeks = getTotalWeeks(placement);
  const signed = placement.log_entries.filter((e) => e.status === "locked").length;
  const allSigned = signed >= totalWeeks;
  const office = placement.itf_office?.name ?? "your ITF office";

  switch (placement.logbook_stage) {
    case "in_progress":
    case "itf_rejected": {
      const resubmit = placement.logbook_stage === "itf_rejected";
      return {
        action: "submit_itf",
        label: resubmit ? "Resubmit to ITF" : "Submit logbook for ITF review",
        disabled: !allSigned || !placement.itf_office,
        hint: !placement.itf_office ? (
          <>
            Add your organization&apos;s state on the{" "}
            <Link href="/placement" className="text-brand hover:underline">
              Placement page
            </Link>{" "}
            so your logbook can be routed to an ITF office.
          </>
        ) : allSigned ? (
          `Every week is signed by your industry supervisor. Send the logbook to ${office} for review and signing.`
        ) : (
          `${signed} of ${totalWeeks} weeks signed. You can submit once your industry supervisor has signed every week.`
        ),
        confirm: {
          title: resubmit ? "Resubmit your corrected logbook?" : "Submit your logbook to ITF?",
          description: `Your logbook will be sent to ${office} for review and signing. Signed weeks can't be edited.`,
          confirmLabel: resubmit ? "Resubmit to ITF" : "Submit to ITF",
        },
        success: resubmit ? "Logbook resubmitted to ITF" : "Logbook submitted to ITF",
      };
    }
    case "itf_submitted":
    case "itf_review":
      return { hint: `${office} is reviewing your logbook. You'll be notified of their decision.` };
    case "itf_approved":
      return {
        action: "submit_academic",
        label: "Submit for academic review",
        disabled: !placement.academic_supervisor,
        hint: placement.academic_supervisor ? (
          `ITF has approved your logbook. Send it to ${placement.academic_supervisor.full_name} to be signed and graded.`
        ) : (
          <>
            Assign your academic supervisor on the{" "}
            <Link href="/placement" className="text-brand hover:underline">
              Placement page
            </Link>{" "}
            to continue.
          </>
        ),
        confirm: {
          title: "Submit for academic review?",
          description: `${placement.academic_supervisor?.full_name ?? "Your academic supervisor"} will review, sign and grade your logbook.`,
          confirmLabel: "Submit for review",
        },
        success: "Logbook sent to your academic supervisor",
      };
    case "academic_submitted":
    case "academic_review":
      return {
        hint: placement.assessment
          ? `Graded ${placement.assessment.grade}. Waiting for ${placement.academic_supervisor?.full_name ?? "your academic supervisor"} to sign.`
          : `${placement.academic_supervisor?.full_name ?? "Your academic supervisor"} is reviewing your logbook.`,
      };
    case "academic_completed":
      return {
        action: "submit_department",
        label: "Submit final logbook to department",
        hint: "Your logbook is verified, signed and graded. Submit it to your department to complete your SIWES record.",
        confirm: {
          title: "Submit your final logbook to the department?",
          description:
            "This is your permanent, final submission. Your department will hold this logbook for assessment and defense, and you won't be able to change any part of it afterwards.",
          confirmLabel: "Submit permanently",
          final: true,
        },
        success: "Final logbook submitted to your department",
      };
    case "department_submitted":
      return { hint: "Submitted to your department. Waiting for the SIWES coordinator to receive it." };
    case "department_received":
      return { hint: "Your department has received your logbook for assessment. It will be archived with ITF afterwards." };
    case "archived":
      return { hint: "Your logbook has been archived with ITF. Your SIWES record is complete." };
  }
}

/** The student's view of the logbook lifecycle with the one next action available to them. */
export function LogbookSubmissionCard({ placementId }: { placementId: string }) {
  const { data: placement, isLoading } = usePlacement(placementId);
  const action = useLogbookAction(placementId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !placement) {
    return (
      <SectionCard title="Logbook verification">
        <Skeleton className="h-40 rounded-xl" />
      </SectionCard>
    );
  }

  const step = getNextStep(placement);
  const rejection =
    placement.logbook_stage === "itf_rejected"
      ? [...placement.logbook_events].reverse().find((e) => e.action === "itf_rejected")
      : undefined;

  function handleConfirm() {
    if (!step.action) return;
    action.mutate(
      { action: step.action, ...(step.action === "submit_department" ? { confirm: true } : {}) },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.success(step.success ?? "Logbook updated");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  return (
    <SectionCard
      title="Logbook verification"
      description="Industry supervisor → ITF → academic supervisor → department → ITF archive"
      badge={<LogbookStageBadge stage={placement.logbook_stage} />}
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <LogbookTracker placement={placement} />
        <div className="space-y-3">
          {rejection && (
            <div className="flex gap-3 rounded-xl bg-destructive-soft px-4 py-3 text-sm">
              <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <div>
                <p className="font-medium text-destructive">
                  ITF returned your logbook · {rejection.actor?.full_name ?? "ITF officer"}, {formatDate(rejection.created_at)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">{rejection.comments}</p>
                {rejection.metadata.reopened_weeks?.length ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    Reopened for correction: week {rejection.metadata.reopened_weeks.join(", ")}. Revise them below, then your
                    industry supervisor approves and signs them again.
                  </p>
                ) : null}
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{step.hint}</p>
          {step.action && (
            <Button onClick={() => setConfirmOpen(true)} disabled={step.disabled || action.isPending}>
              <Send /> {step.label}
            </Button>
          )}
        </div>
      </div>

      {step.confirm && (
        <AlertDialog open={confirmOpen} onOpenChange={(next) => !action.isPending && setConfirmOpen(next)}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{step.confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{step.confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            {step.confirm.final && (
              <p className="flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-left text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                This action can&apos;t be undone.
              </p>
            )}
            <AlertDialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={action.isPending}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={action.isPending}>
                {action.isPending && <Loader2 className="animate-spin" />}
                {step.confirm.confirmLabel}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SectionCard>
  );
}
