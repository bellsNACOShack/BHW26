"use client";

import { Check, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ScafSubmissionBadge } from "@/components/atoms/StatusBadge";
import { DetailList } from "@/components/molecules/DetailList";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { stateLabel } from "@/features/placements/lib/states";
import { useReviewScaf, useScafSubmission } from "@/features/scaf/hooks";
import { SCAF_FIELDS } from "@/features/scaf/lib/fields";
import type { ScafSubmission } from "@/features/scaf/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatDateRange, formatDateTime } from "@/lib/format";

function ScafActionsCard({ scaf }: { scaf: ScafSubmission }) {
  const review = useReviewScaf(scaf.id);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reviewable = scaf.status === "submitted" || scaf.status === "under_review";

  function handle(action: "approve" | "request_correction") {
    if (action === "request_correction" && !comments.trim()) {
      setError("Explain what the student needs to correct.");
      return;
    }
    setError(null);
    review.mutate(
      { action, comments: comments.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(action === "approve" ? "SCAF approved" : "SCAF returned for correction");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  return (
    <SectionCard title="Review" badge={<ScafSubmissionBadge status={scaf.status} />}>
      {reviewable ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Confirm the student&apos;s details and placement, then approve or request a correction.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)} disabled={review.isPending}>
              <Undo2 /> Correction
            </Button>
            <Button onClick={() => handle("approve")} disabled={review.isPending}>
              {review.isPending && review.variables?.action === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
              Approve
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            {scaf.status === "approved"
              ? "Approved."
              : scaf.status === "requires_correction"
                ? "Returned to the student for correction. It comes back here once resubmitted."
                : "Not submitted yet."}
          </p>
          {scaf.reviewed_at && (
            <p className="text-xs">
              {scaf.reviewer?.full_name ?? "ITF officer"} · {formatDateTime(scaf.reviewed_at)}
            </p>
          )}
          {scaf.review_comments && <p className="whitespace-pre-wrap rounded-xl bg-surface px-3.5 py-2.5 text-foreground/80">{scaf.review_comments}</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => !review.isPending && setOpen(next)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Request a correction</DialogTitle>
            <DialogDescription className="text-xs">The student sees your comment and resubmits the SCAF.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="scaf-correction">What needs to be corrected</Label>
            <Textarea
              id="scaf-correction"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[7rem]"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "scaf-correction-error" : undefined}
            />
            {error && (
              <p id="scaf-correction-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={review.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handle("request_correction")} disabled={review.isPending}>
              {review.isPending && <Loader2 className="animate-spin" />}
              Send for correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function ScafReviewContent({ scafId }: { scafId: string }) {
  const { data: scaf, isLoading, error, refetch } = useScafSubmission(scafId);
  const open = useReviewScaf(scafId);
  const opened = useRef(false);

  // The first view of a new submission marks it as under review.
  useEffect(() => {
    if (scaf?.status === "submitted" && !opened.current) {
      opened.current = true;
      open.mutate({ action: "open" });
    }
  }, [scaf?.status, open]);

  const header = (
    <PageHeader
      title={scaf ? `${scaf.student?.full_name ?? "Student"} · SCAF` : "SCAF submission"}
      description={scaf?.placement?.organization_name}
      eyebrow={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/itf/scaf">SCAF submissions</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{scaf?.student?.full_name ?? "Submission"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <Skeleton className="h-96 rounded-2xl bg-card" />
      </>
    );
  }
  if (error || !scaf) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} className="rounded-2xl bg-card" />
      </>
    );
  }

  const profile = scaf.student?.student_profile;
  const placement = scaf.placement;

  return (
    <>
      {header}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-5 lg:order-last">
          <ScafActionsCard scaf={scaf} />
          <SectionCard title="ITF office" divided={false}>
            <DetailList
              className="sm:grid-cols-1"
              items={[
                { label: "Assigned office", value: scaf.itf_office ? `${scaf.itf_office.name}, ${scaf.itf_office.city}` : "—" },
                { label: "Submitted", value: formatDateTime(scaf.submitted_at) },
              ]}
            />
          </SectionCard>
        </aside>
        <div className="min-w-0 space-y-3">
          <SectionCard title="Student">
            <DetailList
              items={[
                { label: "Name", value: scaf.student?.full_name ?? "—" },
                { label: "Email", value: scaf.student?.email ?? "—" },
                { label: "Matric number", value: profile?.matric_number ?? "—" },
                { label: "Institution", value: profile?.institution ?? "—" },
                { label: "Department", value: profile?.department ?? "—" },
                { label: "Program · Level", value: profile ? `${profile.program} · ${profile.level ?? "—"}` : "—" },
              ]}
            />
          </SectionCard>
          <SectionCard title="SIWES organization">
            <DetailList
              items={[
                { label: "Organization", value: placement?.organization_name ?? "—" },
                { label: "Address", value: placement?.organization_address ?? "—" },
                { label: "State", value: placement?.organization_state ? stateLabel(placement.organization_state) : "—" },
                { label: "Training period", value: placement ? formatDateRange(placement.start_date, placement.end_date) : "—" },
              ]}
            />
          </SectionCard>
          <SectionCard title="SCAF details">
            <DetailList
              items={SCAF_FIELDS.map((field) => {
                const value = scaf.details?.[field.key];
                return {
                  label: field.label.replace(" (optional)", ""),
                  value: value ? (field.type === "date" ? formatDate(value) : <span className="whitespace-pre-wrap">{value}</span>) : "—",
                };
              })}
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export function ScafReviewPage({ scafId }: { scafId: string }) {
  return (
    <RoleGate permission="reviewScaf">
      <ScafReviewContent scafId={scafId} />
    </RoleGate>
  );
}
