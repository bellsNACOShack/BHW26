import { Fingerprint, GraduationCap } from "lucide-react";
import { DetailList } from "@/components/molecules/DetailList";
import { SectionCard } from "@/components/molecules/SectionCard";
import { ROLE_LABELS } from "@/features/auth/permissions";
import type { TimelineEvent } from "@/features/logbook/lib/timeline";
import { GRADE_BANDS, LOGBOOK_EVENT_LABELS } from "@/features/placements/lib/lifecycle";
import type { LogbookEvent, PlacementDetail } from "@/features/placements/types";
import { formatDateTime, pluralize } from "@/lib/format";
import { AuditTrail } from "./AuditTrail";

const HIGHLIGHTED = new Set<LogbookEvent["action"]>(["itf_approved", "academic_signed", "archived"]);

function describe(event: LogbookEvent) {
  const parts = [LOGBOOK_EVENT_LABELS[event.action]];
  if (event.action === "submitted_to_itf" && event.metadata.resubmission) parts[0] = "Resubmitted corrected logbook to ITF";
  if (event.metadata.grade) parts.push(`Grade ${event.metadata.grade} (${event.metadata.score})`);
  if (event.metadata.reopened_weeks?.length) parts.push(`Reopened week ${event.metadata.reopened_weeks.join(", ")}`);
  if (event.comments) parts.push(`“${event.comments}”`);
  return parts.join(" · ");
}

export function logbookEventsToTimeline(events: LogbookEvent[]): TimelineEvent[] {
  return events.map((event) => ({
    id: event.id,
    at: event.created_at,
    actor: event.actor?.full_name ?? "Unknown",
    actorRole: event.actor ? ROLE_LABELS[event.actor.role] : undefined,
    description: describe(event),
    highlight: HIGHLIGHTED.has(event.action),
  }));
}

/** Chain-of-custody history of the logbook after the weekly sign-offs. */
export function LogbookHistoryCard({ placement }: { placement: PlacementDetail }) {
  return (
    <SectionCard title="Verification history" description="Every stage the logbook has passed through">
      <AuditTrail events={logbookEventsToTimeline(placement.logbook_events ?? [])} />
    </SectionCard>
  );
}

const SIGNATURE_STAGE_LABELS = { industry: "Industry supervisor", itf: "ITF officer", academic: "Academic supervisor" } as const;

/** Weekly industry signatures plus the logbook-level ITF and academic passkey signatures. */
export function LogbookSignaturesCard({ placement }: { placement: PlacementDetail }) {
  const weeklySigned = placement.log_entries.filter((e) => e.status === "locked").length;
  const signatures = [...(placement.signatures ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <SectionCard title="Signatures" description="Passkey signatures sealing this logbook">
      <ul className="space-y-2">
        <li className="flex items-start gap-3 rounded-xl bg-surface px-3.5 py-3">
          <Fingerprint className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <div className="min-w-0 text-sm">
            <p>Industry supervisor</p>
            <p className="text-xs text-muted-foreground">
              {pluralize(weeklySigned, "week")} signed
              {placement.workplace_supervisor ? ` by ${placement.workplace_supervisor.full_name}` : ""}
            </p>
          </div>
        </li>
        {signatures.map((signature) => (
          <li key={signature.id} className="flex items-start gap-3 rounded-xl bg-surface px-3.5 py-3">
            <Fingerprint className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <div className="min-w-0 text-sm">
              <p>
                {SIGNATURE_STAGE_LABELS[signature.stage]}
                <span className="text-muted-foreground"> · {signature.user?.full_name ?? "Unknown"}</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(signature.created_at)}</p>
              <p className="mt-1 truncate font-mono text-[0.6875rem] text-muted-foreground" title={signature.content_hash}>
                SHA-256 {signature.content_hash}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export const GRADE_SCALE_LABEL = GRADE_BANDS.map((band, i) =>
  i === 0 ? `${band.grade} ${band.min}+` : `${band.grade} ${band.min}–${GRADE_BANDS[i - 1].min - 1}`
).join(" · ");

/** The academic supervisor's grade (read-only view). */
export function LogbookAssessmentCard({ placement }: { placement: PlacementDetail }) {
  const assessment = placement.assessment;
  return (
    <SectionCard title="Academic grade" description={GRADE_SCALE_LABEL} divided={false}>
      {assessment ? (
        <div className="flex items-start gap-4">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-2xl text-success">
            {assessment.grade}
          </span>
          <DetailList
            className="flex-1 sm:grid-cols-1"
            items={[
              { label: "Score", value: `${assessment.score} / 100` },
              ...(assessment.remarks ? [{ label: "Remarks", value: <span className="whitespace-pre-wrap">{assessment.remarks}</span> }] : []),
              { label: "Graded", value: `${placement.academic_supervisor?.full_name ?? "Academic supervisor"} · ${formatDateTime(assessment.updated_at)}` },
            ]}
          />
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="size-4" aria-hidden /> Not graded yet.
        </p>
      )}
    </SectionCard>
  );
}
