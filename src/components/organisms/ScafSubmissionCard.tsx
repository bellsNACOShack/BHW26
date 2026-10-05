"use client";

import { FileText, Loader2, MessageSquareWarning, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ScafSubmissionBadge } from "@/components/atoms/StatusBadge";
import { DetailList } from "@/components/molecules/DetailList";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { PlacementWithPeople } from "@/features/placements/types";
import { useMyScaf, useSaveScaf } from "@/features/scaf/hooks";
import { SCAF_FIELDS, emptyScafDetails, getScafErrors, type ScafDetails, type ScafFieldKey } from "@/features/scaf/lib/fields";
import { isScafEditable } from "@/features/scaf/lib/status";
import type { ScafSubmission } from "@/features/scaf/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUS_HINTS: Record<string, string> = {
  none: "Fill in your SCAF and submit it digitally to your ITF office.",
  draft: "Your SCAF is saved as a draft. Submit it when it's complete.",
  submitted: "Sent to your ITF office. You'll be notified when it has been reviewed.",
  under_review: "An ITF officer is reviewing your SCAF.",
  approved: "ITF has approved your SCAF.",
  requires_correction: "ITF asked for corrections. Update the form and resubmit it.",
};

/** Student's digital SCAF (Student Commencement Attestation Form), submitted to the routed ITF office. */
export function ScafSubmissionCard({ placement }: { placement: PlacementWithPeople }) {
  const { data: scaf, isLoading } = useMyScaf();
  const [open, setOpen] = useState(false);
  const editable = isScafEditable(scaf?.status);

  return (
    <SectionCard
      title="SCAF form"
      description="Student Commencement Attestation Form"
      badge={scaf ? <ScafSubmissionBadge status={scaf.status} /> : undefined}
      actions={
        !isLoading && (
          <Button size="sm" variant={editable ? "default" : "secondary"} onClick={() => setOpen(true)}>
            <FileText /> {!scaf ? "Fill SCAF form" : scaf.status === "requires_correction" ? "Correct & resubmit" : editable ? "Continue" : "View"}
          </Button>
        )
      }
    >
      {isLoading ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{STATUS_HINTS[scaf?.status ?? "none"]}</p>
          {scaf?.status === "requires_correction" && scaf.review_comments && <CorrectionNote scaf={scaf} />}
          <DetailList
            items={[
              { label: "ITF office", value: placement.itf_office?.name ?? <span className="text-muted-foreground">Add your organization&apos;s state</span> },
              { label: "Submitted", value: scaf?.submitted_at ? formatDateTime(scaf.submitted_at) : "—" },
            ]}
          />
        </div>
      )}
      {open && <ScafFormDialog placement={placement} scaf={scaf ?? null} onClose={() => setOpen(false)} />}
    </SectionCard>
  );
}

function CorrectionNote({ scaf }: { scaf: ScafSubmission }) {
  return (
    <div className="flex gap-3 rounded-xl bg-destructive-soft px-4 py-3 text-sm">
      <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div>
        <p className="font-medium text-destructive">
          {scaf.reviewer?.full_name ?? "ITF officer"}
          {scaf.reviewed_at ? ` · ${formatDate(scaf.reviewed_at)}` : ""}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">{scaf.review_comments}</p>
      </div>
    </div>
  );
}

function ScafFormDialog({
  placement,
  scaf,
  onClose,
}: {
  placement: PlacementWithPeople;
  scaf: ScafSubmission | null;
  onClose: () => void;
}) {
  const { data: user } = useCurrentUser();
  const save = useSaveScaf();
  const editable = isScafEditable(scaf?.status);
  const [details, setDetails] = useState<ScafDetails>(() => ({
    ...emptyScafDetails(),
    // Prefill what the platform already knows.
    commencement_date: placement.start_date,
    phone_number: user?.phone_number ?? "",
    supervisor_name: placement.workplace_supervisor?.full_name ?? "",
    supervisor_phone: placement.workplace_supervisor?.phone_number ?? "",
    ...(scaf?.details ?? {}),
  }));
  const [errors, setErrors] = useState<Partial<Record<ScafFieldKey, string>>>({});
  const profile = user?.student_profile;

  function handleSave(submit: boolean) {
    if (submit) {
      const found = getScafErrors(details);
      setErrors(found);
      if (Object.keys(found).length) {
        toast.error("Complete the highlighted fields before submitting.");
        return;
      }
    }
    save.mutate(
      { placement_id: placement.id, details, submit },
      {
        onSuccess: () => {
          toast.success(submit ? "SCAF submitted to your ITF office" : "SCAF draft saved");
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !save.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">SCAF form</DialogTitle>
          <DialogDescription className="text-xs">
            Submitted digitally to {placement.itf_office?.name ?? "your ITF office"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl bg-surface p-4">
            <p className="mb-3 text-xs text-muted-foreground">From your profile and placement</p>
            <DetailList
              items={[
                { label: "Student", value: user?.full_name ?? "—" },
                { label: "Matric number", value: profile?.matric_number ?? "—" },
                { label: "Institution", value: profile?.institution ?? "—" },
                { label: "Course", value: profile ? `${profile.department} · ${profile.program} · ${profile.level ?? ""}` : "—" },
                { label: "Organization", value: placement.organization_name },
                { label: "Organization address", value: placement.organization_address },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SCAF_FIELDS.map((field) => {
              const id = `scaf-${field.key}`;
              const error = errors[field.key];
              const common = {
                id,
                value: details[field.key],
                disabled: !editable,
                placeholder: "placeholder" in field ? field.placeholder : undefined,
                "aria-invalid": Boolean(error),
                "aria-describedby": error ? `${id}-error` : undefined,
              };
              const onChange = (value: string) => setDetails((prev) => ({ ...prev, [field.key]: value }));
              return (
                <div key={field.key} className={field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                  <Label htmlFor={id}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea {...common} className="min-h-[4.5rem]" onChange={(e) => onChange(e.target.value)} />
                  ) : (
                    <Input {...common} type={field.type} onChange={(e) => onChange(e.target.value)} />
                  )}
                  {error && (
                    <p id={`${id}-error`} className="text-xs text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editable ? (
            <>
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={save.isPending}>
                {save.isPending && save.variables?.submit === false && <Loader2 className="animate-spin" />}
                Save draft
              </Button>
              <Button onClick={() => handleSave(true)} disabled={save.isPending || !placement.itf_office}>
                {save.isPending && save.variables?.submit ? <Loader2 className="animate-spin" /> : <Send />}
                Submit to ITF
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
