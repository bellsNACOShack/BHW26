"use client";

import { ShieldCheck } from "lucide-react";
import { DayLogRow } from "@/components/molecules/DayLogRow";
import { DetailList } from "@/components/molecules/DetailList";
import { DiagramThumbnail } from "@/components/molecules/DiagramThumbnail";
import { ErrorState } from "@/components/molecules/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs } from "@/features/audit/hooks/useAuditLogs";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { can } from "@/features/auth/permissions";
import { useLogEntry } from "@/features/logbook/hooks/useLogEntry";
import { parseDailyLogs } from "@/features/logbook/lib/daily-logs";
import { getWeekDays } from "@/features/logbook/lib/weeks";
import { formatDayMonth } from "@/lib/format";
import { isDisplayableImage } from "@/features/logbook/lib/diagram";
import { auditLogsToTimeline, buildEntryTimeline } from "@/features/logbook/lib/timeline";
import type { LogEntryDetail } from "@/features/logbook/types";
import { AuditTrail } from "./AuditTrail";
import { SupervisorComments } from "./SupervisorComments";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-4">
      <h3 className="mb-3 text-base tracking-tight text-foreground sm:text-lg">{title}</h3>
      {children}
    </section>
  );
}

export function EntryDetailsSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-xl" />
      ))}
    </div>
  );
}

/** Read-only view of a weekly entry with its diagram, audit trail and supervisor feedback. */
export function EntryDetails({ entryId }: { entryId: string }) {
  const { data: entry, isLoading, error, refetch } = useLogEntry(entryId);

  if (isLoading) return <EntryDetailsSkeleton />;
  if (error || !entry) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return <EntryDetailsContent entry={entry} />;
}

function EntryDetailsContent({ entry }: { entry: LogEntryDetail }) {
  const { data: user } = useCurrentUser();
  const canReadAudit = can(user?.role, "viewAuditLogs");
  const audit = useAuditLogs({ resource_type: "log_entries", resource_id: entry.id, limit: 100 }, { enabled: canReadAudit });
  const { days, notes } = parseDailyLogs(entry.activities);
  const summary = [
    { label: "Skills learned", value: entry.skills },
    { label: "Tools used", value: entry.tools },
    { label: "Challenges", value: entry.challenges },
    { label: "Remarks", value: entry.remarks },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value?.trim()));

  const timeline = canReadAudit && audit.data ? auditLogsToTimeline(audit.data) : buildEntryTimeline(entry);

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-xl bg-card p-2.5">
        {notes && <DayLogRow day="Notes" value={notes} />}
        {getWeekDays(entry).map(({ day, date, optional }) => (
          <DayLogRow
            key={day}
            day={day}
            sublabel={formatDayMonth(date)}
            value={days[day]}
            emptyLabel={optional ? "Not logged (optional)" : undefined}
          />
        ))}
      </div>

      {summary.length > 0 && (
        <Panel title="Week summary">
          <DetailList items={summary.map((item) => ({ label: item.label, value: <span className="whitespace-pre-wrap">{item.value}</span> }))} />
        </Panel>
      )}

      <Panel title="Week Diagram">
        {isDisplayableImage(entry.supporting_evidence_url) ? (
          <DiagramThumbnail src={entry.supporting_evidence_url} caption={`Week ${entry.week_number}`} className="h-20 w-24" />
        ) : (
          <p className="text-xs text-muted-foreground">No diagram attached.</p>
        )}
      </Panel>

      <Panel title="Audit trail">
        {canReadAudit && audit.isLoading ? <Skeleton className="h-24 rounded-xl" /> : <AuditTrail events={timeline} />}
      </Panel>

      <Panel title="Supervisor comment">
        <SupervisorComments approvals={entry.approvals} />
      </Panel>

      {entry.record_hash && (
        <p className="flex items-start gap-2 rounded-xl bg-success-soft px-4 py-3 text-xs text-success">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Locked with SHA-256 integrity hash <code className="break-all text-foreground/70">{entry.record_hash}</code>
          </span>
        </p>
      )}
    </div>
  );
}
