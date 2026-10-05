import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { DetailList } from "@/components/molecules/DetailList";
import { SCAF_STATUS_LABELS } from "@/features/placements/lib/status";
import type { ScafStatus } from "@/features/placements/types";
import type { VerificationResult } from "@/features/verifications/types";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VerificationResultCard({ result }: { result: VerificationResult }) {
  const { verification: record } = result;
  const valid = result.verified && result.integrity_intact;
  const scaf = record.scaf_status as ScafStatus | null;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl px-4 py-4",
          valid ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive"
        )}
        role="status"
      >
        {valid ? <ShieldCheck className="mt-0.5 size-6 shrink-0" /> : <ShieldAlert className="mt-0.5 size-6 shrink-0" />}
        <div>
          <p className="text-base font-medium">{valid ? "Valid SIWES record" : "This record cannot be trusted"}</p>
          <p className="mt-0.5 text-sm text-foreground/75">
            {!result.verified
              ? `This verification has been marked "${record.status}".`
              : result.integrity_intact
                ? "The signed logbook entries match the record issued with this code."
                : "Signed entries have changed since this code was issued, so the integrity check failed."}
          </p>
        </div>
      </div>

      <DetailList
        className="rounded-2xl bg-surface p-4"
        items={[
          { label: "Student", value: record.student_name ?? "—" },
          { label: "Organization", value: record.organization_name ?? "—" },
          { label: "Address", value: record.organization_address ?? "—" },
          {
            label: "SIWES duration",
            value: `${formatDate(record.siwes_duration.start_date)} – ${formatDate(record.siwes_duration.end_date)}`,
          },
          { label: "Approved weeks", value: pluralize(record.total_weeks_approved, "week") },
          { label: "SCAF status", value: scaf && scaf in SCAF_STATUS_LABELS ? SCAF_STATUS_LABELS[scaf] : "—" },
          { label: "Workplace supervisor", value: record.workplace_supervisor },
          { label: "Academic supervisor", value: record.academic_supervisor },
          { label: "Code", value: <span className="font-mono">{record.verification_code}</span> },
          { label: "Issued", value: formatDateTime(record.issued_at) },
        ]}
      />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BadgeCheck className="mt-px size-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          Record hash <code className="break-all text-foreground/70">{record.record_hash}</code>
        </span>
      </p>
    </div>
  );
}
