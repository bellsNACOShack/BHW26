"use client";

import { Check, Fingerprint, Loader2, Lock, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { LogStatusBadge } from "@/components/atoms/StatusBadge";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReviewLogEntry } from "@/features/logbook/hooks/useReviewLogEntry";
import { useSignLogEntry } from "@/features/logbook/hooks/useSignLogEntry";
import { isAwaitingReview } from "@/features/logbook/lib/status";
import type { LogEntryDetail, ReviewAction } from "@/features/logbook/types";
import { describePasskeyError } from "@/features/passkeys/lib/webauthn";
import { getErrorMessage } from "@/lib/api-client";

/** Approve / return a submitted week, then sign it with a passkey to lock it. */
export function ReviewActionsCard({ entry }: { entry: LogEntryDetail }) {
  const [comments, setComments] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const review = useReviewLogEntry(entry.id);
  const sign = useSignLogEntry(entry.id);

  function handleReview(action: ReviewAction) {
    if (action === "reject" && !comments.trim()) {
      setCommentError("Tell the student what to change before returning the week.");
      return;
    }
    setCommentError(null);
    review.mutate(
      { action, comments: comments.trim() || undefined },
      {
        onSuccess: () => {
          setComments("");
          toast.success(action === "approve" ? `Week ${entry.week_number} approved` : `Week ${entry.week_number} returned to the student`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  function handleSign() {
    sign.mutate(undefined, {
      onSuccess: () => toast.success(`Week ${entry.week_number} signed and locked`),
      onError: (error) => toast.error(describePasskeyError(error) ?? getErrorMessage(error)),
    });
  }

  return (
    <SectionCard title="Review" badge={<LogStatusBadge status={entry.status} />}>
      {isAwaitingReview(entry.status) ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">Comment for the student</Label>
            <Textarea
              id="review-comment"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Feedback on this week's work (required when returning)"
              aria-invalid={Boolean(commentError)}
              aria-describedby={commentError ? "review-comment-error" : undefined}
            />
            {commentError && (
              <p id="review-comment-error" className="text-xs text-destructive">
                {commentError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => handleReview("reject")} disabled={review.isPending}>
              {review.isPending && review.variables?.action === "reject" ? <Loader2 className="animate-spin" /> : <Undo2 />}
              Return
            </Button>
            <Button onClick={() => handleReview("approve")} disabled={review.isPending}>
              {review.isPending && review.variables?.action === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
              Approve
            </Button>
          </div>
        </div>
      ) : entry.status === "approved" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign this week with your passkey to apply your digital signature. The record is then locked with a SHA-256 integrity hash
            and can no longer change.
          </p>
          <Button className="w-full" onClick={handleSign} disabled={sign.isPending}>
            {sign.isPending ? <Loader2 className="animate-spin" /> : <Fingerprint />}
            Sign &amp; lock with passkey
          </Button>
          <p className="text-xs text-muted-foreground">
            No passkey on this device?{" "}
            <Link href="/dashboard" className="text-brand hover:underline">
              Register one from your dashboard
            </Link>
            .
          </p>
        </div>
      ) : entry.status === "locked" ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          This week has been signed and permanently locked.
        </p>
      ) : entry.status === "rejected" ? (
        <p className="text-sm text-muted-foreground">Returned to the student for revision. It will come back here once resubmitted.</p>
      ) : (
        <p className="text-sm text-muted-foreground">The student hasn&apos;t submitted this week yet.</p>
      )}
    </SectionCard>
  );
}
