"use client";

import { Archive, Fingerprint, Loader2, Lock, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describePasskeyError } from "@/features/passkeys/lib/webauthn";
import { useLogbookAction } from "@/features/placements/hooks/useLogbookAction";
import {
  ACADEMIC_PENDING_STAGES,
  ITF_PENDING_STAGES,
  gradeForScore,
  hasReachedStage,
} from "@/features/placements/lib/lifecycle";
import type { LogbookActionPayload, PlacementDetail } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";
import { GRADE_SCALE_LABEL } from "./LogbookRecordCards";

function PasskeyHint() {
  return (
    <p className="text-xs text-muted-foreground">
      No passkey on this device?{" "}
      <Link href="/dashboard" className="text-brand hover:underline">
        Register one from your dashboard
      </Link>
      .
    </p>
  );
}

function useRunAction(placementId: string) {
  const mutation = useLogbookAction(placementId);
  function run(payload: LogbookActionPayload, success: string, onSuccess?: () => void) {
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(success);
        onSuccess?.();
      },
      onError: (error) => toast.error(describePasskeyError(error) ?? getErrorMessage(error)),
    });
  }
  return { ...mutation, run };
}

/* ------------------------------------------------------------------ ITF ---- */

/** ITF officer: approve & sign the logbook, or return it with a mandatory reason. */
export function ItfLogbookActions({ placement }: { placement: PlacementDetail }) {
  const action = useRunAction(placement.id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const pending = ITF_PENDING_STAGES.includes(placement.logbook_stage);

  return (
    <SectionCard title="ITF review" badge={<LogbookStageBadge stage={placement.logbook_stage} />}>
      {pending ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Check every week and the industry supervisor&apos;s sign-off, then approve with your ITF passkey signature or return
            the logbook for correction.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(true)} disabled={action.isPending}>
              <Undo2 /> Reject
            </Button>
            <Button
              onClick={() => action.run({ action: "itf_approve" }, "Logbook approved and signed for ITF")}
              disabled={action.isPending}
            >
              {action.isPending && action.variables?.action === "itf_approve" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
              Approve &amp; sign
            </Button>
          </div>
          <PasskeyHint />
          <RejectLogbookDialog
            placement={placement}
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            pending={action.isPending}
            onConfirm={(comments, reopen_weeks) =>
              action.run({ action: "itf_reject", comments, reopen_weeks }, "Logbook returned to the student", () => setRejectOpen(false))
            }
          />
        </div>
      ) : placement.logbook_stage === "itf_rejected" ? (
        <p className="text-sm text-muted-foreground">Returned to the student. It comes back here once they resubmit.</p>
      ) : hasReachedStage(placement.logbook_stage, "itf_approved") ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          ITF approval is complete and signed.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">The student hasn&apos;t submitted this logbook to ITF yet.</p>
      )}
    </SectionCard>
  );
}

interface RejectLogbookDialogProps {
  placement: PlacementDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: (comments: string, reopenWeeks: number[]) => void;
}

/** Rejection always needs a reason; signed weeks can optionally be reopened for correction. */
function RejectLogbookDialog({ placement, open, onOpenChange, pending, onConfirm }: RejectLogbookDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<number[]>([]);
  const signedWeeks = placement.log_entries
    .filter((e) => e.status === "locked")
    .map((e) => e.week_number)
    .sort((a, b) => a - b);

  function handleSubmit() {
    if (!reason.trim()) {
      setError("Enter the reason for rejecting this logbook.");
      return;
    }
    setError(null);
    onConfirm(reason.trim(), weeks);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Reject logbook</DialogTitle>
          <DialogDescription className="text-xs">
            The student sees your reason, corrects the logbook and resubmits it for ITF review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="itf-reject-reason">Reason for rejection</Label>
            <Textarea
              id="itf-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What needs to be corrected before ITF can approve this logbook?"
              className="min-h-[7rem]"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "itf-reject-error" : undefined}
            />
            {error && (
              <p id="itf-reject-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          {signedWeeks.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm">Reopen weeks for correction (optional)</legend>
              <p className="text-xs text-muted-foreground">
                Reopened weeks go back to the student and must be approved and signed again by the industry supervisor.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {signedWeeks.map((week) => {
                  const id = `reopen-week-${week}`;
                  return (
                    <label key={week} htmlFor={id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                      <Checkbox
                        id={id}
                        checked={weeks.includes(week)}
                        onCheckedChange={(checked) =>
                          setWeeks((prev) => (checked ? [...prev, week] : prev.filter((w) => w !== week)))
                        }
                      />
                      Week {week}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Reject logbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- Academic ---- */

/** Academic supervisor: grade (editable until signed), then sign to complete the academic stage. */
export function AcademicLogbookActions({ placement }: { placement: PlacementDetail }) {
  const action = useRunAction(placement.id);
  const assessment = placement.assessment;
  const [score, setScore] = useState(assessment ? String(assessment.score) : "");
  const [remarks, setRemarks] = useState(assessment?.remarks ?? "");
  const [error, setError] = useState<string | null>(null);
  const pending = ACADEMIC_PENDING_STAGES.includes(placement.logbook_stage);

  const numeric = score.trim() === "" ? NaN : Number(score);
  const validScore = Number.isFinite(numeric) && numeric >= 0 && numeric <= 100;
  const dirty = !assessment || Number(assessment.score) !== numeric || (assessment.remarks ?? "") !== remarks.trim();

  function handleGrade() {
    if (!validScore) {
      setError("Enter a score between 0 and 100.");
      return;
    }
    setError(null);
    action.run({ action: "academic_grade", score: numeric, remarks: remarks.trim() || undefined }, "Grade saved");
  }

  if (!pending) {
    return (
      <SectionCard title="Academic review" badge={<LogbookStageBadge stage={placement.logbook_stage} />}>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          {hasReachedStage(placement.logbook_stage, "academic_completed") ? (
            <>
              <Lock className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              Signed and graded. The academic stage is complete.
            </>
          ) : (
            "The student will submit this logbook to you after ITF approval."
          )}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Academic review" badge={<LogbookStageBadge stage={placement.logbook_stage} />}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="academic-score">Score (out of 100)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="academic-score"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-28"
              aria-invalid={Boolean(error)}
              aria-describedby="academic-score-help"
            />
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {validScore ? `Grade ${gradeForScore(numeric)}` : "—"}
            </span>
          </div>
          <p id="academic-score-help" className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {error ?? GRADE_SCALE_LABEL}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="academic-remarks">Remarks (optional)</Label>
          <Textarea
            id="academic-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Comments on the student's SIWES performance"
          />
        </div>
        <Button variant="secondary" className="w-full" onClick={handleGrade} disabled={action.isPending || !dirty}>
          {action.isPending && action.variables?.action === "academic_grade" && <Loader2 className="animate-spin" />}
          {assessment ? "Update grade" : "Save grade"}
        </Button>
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {assessment
              ? "Signing locks the grade and completes the academic stage."
              : "Save a grade before signing the logbook."}
          </p>
          <Button
            className="w-full"
            onClick={() => action.run({ action: "academic_sign" }, "Logbook signed and assessment completed")}
            disabled={action.isPending || !assessment || dirty}
          >
            {action.isPending && action.variables?.action === "academic_sign" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
            Sign logbook with passkey
          </Button>
          <PasskeyHint />
        </div>
      </div>
    </SectionCard>
  );
}

/* ----------------------------------------------------------- Department ---- */

/** Departmental coordinator: keeps the received record and makes the final ITF archive submission. */
export function DepartmentLogbookActions({ placement }: { placement: PlacementDetail }) {
  const action = useRunAction(placement.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const stage = placement.logbook_stage;

  return (
    <SectionCard title="Departmental record" badge={<LogbookStageBadge stage={stage} />}>
      {stage === "department_received" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This logbook is part of your department&apos;s records for assessment and defense. Once the departmental assessment is
            done, submit it to the ITF archive.
          </p>
          <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={action.isPending}>
            <Archive /> Submit to ITF archive
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={(next) => !action.isPending && setConfirmOpen(next)}>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Submit to the ITF archive?</AlertDialogTitle>
                <AlertDialogDescription>
                  This is the final stage of the logbook. It is archived permanently with ITF and the placement is marked
                  completed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={action.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => action.run({ action: "archive" }, "Logbook submitted to the ITF archive", () => setConfirmOpen(false))}
                  disabled={action.isPending}
                >
                  {action.isPending && <Loader2 className="animate-spin" />}
                  Submit to archive
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : stage === "archived" ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Archived with ITF. This record is complete.
        </p>
      ) : stage === "department_submitted" ? (
        <p className="text-sm text-muted-foreground">Recording receipt…</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          The student submits the logbook here once it has been signed by ITF and signed and graded by their academic supervisor.
        </p>
      )}
    </SectionCard>
  );
}
