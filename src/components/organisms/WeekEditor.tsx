"use client";

import { Loader2, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LogStatusBadge } from "@/components/atoms/StatusBadge";
import { DayLogRow } from "@/components/molecules/DayLogRow";
import { DiagramPicker } from "@/components/molecules/DiagramPicker";
import { DiagramThumbnail } from "@/components/molecules/DiagramThumbnail";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreateLogEntry } from "@/features/logbook/hooks/useCreateLogEntry";
import { useSubmitLogEntry } from "@/features/logbook/hooks/useSubmitLogEntry";
import { useUpdateLogEntry } from "@/features/logbook/hooks/useUpdateLogEntry";
import { parseDailyLogs, serializeDailyLogs, type DailyLogs } from "@/features/logbook/lib/daily-logs";
import { isDisplayableImage } from "@/features/logbook/lib/diagram";
import { LOG_STATUS_LABELS, isEditableStatus } from "@/features/logbook/lib/status";
import { getSubmitOpensOn, getWeekDays, getWeekRange, hasWeekStarted, todayYmd } from "@/features/logbook/lib/weeks";
import type { LogEntryListItem, UpdateLogEntryPayload } from "@/features/logbook/types";
import type { PlacementWithPeople } from "@/features/placements/types";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatDateRange, formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DeleteDraftButton } from "./DeleteDraftButton";
import { SubmitWeekDialog } from "./SubmitWeekDialog";

const SUMMARY_FIELDS = [
  { key: "skills", label: "Skills", placeholder: "Skills you learned or practised this week" },
  { key: "tools", label: "Tools", placeholder: "Tools, software or equipment you used" },
  { key: "challenges", label: "Challenges", placeholder: "Challenges you ran into and how you handled them" },
  { key: "remarks", label: "Remarks", placeholder: "Anything else your supervisor should know" },
] as const;

type SummaryKey = (typeof SUMMARY_FIELDS)[number]["key"];
type Summary = Record<SummaryKey, string>;

interface WeekEditorProps {
  placement: PlacementWithPeople;
  weekNumber: number;
  /** Existing entry for this week; omit to start a new one. Re-key the editor when it changes. */
  entry?: LogEntryListItem | null;
  /** Rendered in the card header (e.g. a week selector). */
  headerAction?: ReactNode;
  /** Called after a new entry is first saved as a draft. */
  onCreated?: (entryId: string) => void;
  onSubmitted?: () => void;
  onDeleted?: () => void;
}

function toNullable(value: string) {
  return value.trim() ? value.trim() : null;
}

export function WeekEditor({
  placement,
  weekNumber,
  entry,
  headerAction,
  onCreated,
  onSubmitted,
  onDeleted,
}: WeekEditorProps) {
  const initial = useMemo(() => {
    const parsed = parseDailyLogs(entry?.activities);
    return {
      days: parsed.days,
      notes: parsed.notes,
      summary: {
        skills: entry?.skills ?? "",
        tools: entry?.tools ?? "",
        challenges: entry?.challenges ?? "",
        remarks: entry?.remarks ?? "",
      } satisfies Summary,
      diagram: entry?.supporting_evidence_url ?? null,
    };
  }, [entry]);

  const [days, setDays] = useState<DailyLogs>(initial.days);
  const [notes, setNotes] = useState(initial.notes);
  const [summary, setSummary] = useState<Summary>(initial.summary);
  const [diagram, setDiagram] = useState<string | null>(initial.diagram);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const create = useCreateLogEntry();
  const update = useUpdateLogEntry();
  const submit = useSubmitLogEntry();

  const range = entry ? { start_date: entry.start_date, end_date: entry.end_date } : getWeekRange(placement, weekNumber);
  const today = todayYmd();
  // Future weeks are read-only; started weeks stay editable until submitted or approved.
  const weekStarted = hasWeekStarted(range, today);
  const editable = weekStarted && (!entry || isEditableStatus(entry.status));
  const weekDays = getWeekDays(range);
  // Submitting waits for the last working day so no day is submitted before it can be logged.
  const submitOpensOn = getSubmitOpensOn(range);
  const canSubmit = today >= submitOpensOn;
  const busy = create.isPending || update.isPending || submit.isPending;

  const payload: UpdateLogEntryPayload = {
    activities: serializeDailyLogs(days, notes),
    skills: toNullable(summary.skills),
    tools: toNullable(summary.tools),
    challenges: toNullable(summary.challenges),
    remarks: toNullable(summary.remarks),
    supporting_evidence_url: diagram,
  };
  const hasContent = Boolean(payload.activities);
  const isDirty =
    JSON.stringify(payload) !==
    JSON.stringify({
      activities: serializeDailyLogs(initial.days, initial.notes),
      skills: toNullable(initial.summary.skills),
      tools: toNullable(initial.summary.tools),
      challenges: toNullable(initial.summary.challenges),
      remarks: toNullable(initial.summary.remarks),
      supporting_evidence_url: initial.diagram,
    });

  const feedback =
    entry?.status === "rejected"
      ? [...entry.approvals].filter((a) => a.action !== "approve").sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      : undefined;

  /** Creates or updates the entry and returns its id. */
  async function persist() {
    if (entry) {
      if (isDirty) await update.mutateAsync({ id: entry.id, ...payload });
      return entry.id;
    }
    const created = await create.mutateAsync({
      placement_id: placement.id,
      week_number: weekNumber,
      ...range,
      ...payload,
      activities: payload.activities as string,
    });
    return created.id;
  }

  async function handleSaveDraft() {
    try {
      const id = await persist();
      toast.success(`Week ${weekNumber} draft saved`);
      if (!entry) onCreated?.(id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleSubmit() {
    try {
      const id = await persist();
      await submit.mutateAsync(id);
      setConfirmOpen(false);
      toast.success(`Week ${weekNumber} submitted for review`);
      onSubmitted?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <SectionCard
      title={`Week ${weekNumber}: Daily Logs`}
      badge={
        entry ? <LogStatusBadge status={entry.status} /> : <Badge variant="neutral">{weekStarted ? "New" : "Upcoming"}</Badge>
      }
      description={editable ? `Add your daily entries · ${formatDateRange(range.start_date, range.end_date)}` : formatDateRange(range.start_date, range.end_date)}
      actions={headerAction}
    >
      {feedback && (
        <div className="mb-4 flex gap-3 rounded-xl bg-destructive-soft px-4 py-3 text-sm">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-destructive">Your supervisor requested a revision</p>
            <p className="mt-0.5 text-foreground/80">{feedback.comments || "No comment was left. Update the entry and resubmit."}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notes && (
          <DayLogRow day="Notes" value={notes} onChange={editable ? setNotes : undefined} />
        )}
        {weekDays.map(({ day, date, optional }) => {
          // A day can only be logged once it has arrived; Saturday is optional.
          const dayOpen = date <= today;
          const emptyLabel = dayOpen
            ? optional
              ? "Optional"
              : undefined
            : `Opens ${formatDate(date)}${optional ? " · Optional" : ""}`;
          return (
            <DayLogRow
              key={day}
              day={day}
              sublabel={formatDayMonth(date)}
              value={days[day]}
              emptyLabel={emptyLabel}
              onChange={editable && dayOpen ? (value) => setDays((prev) => ({ ...prev, [day]: value })) : undefined}
            />
          );
        })}
      </div>

      <div className="mt-5 border-t pt-5">
        <SubHeading title="Week summary" />
        <div className="space-y-3">
          {SUMMARY_FIELDS.map((field) => (
            <DayLogRow
              key={field.key}
              day={field.label}
              value={summary[field.key]}
              placeholder={field.placeholder}
              emptyLabel="Not added"
              onChange={editable ? (value) => setSummary((prev) => ({ ...prev, [field.key]: value })) : undefined}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 border-t pt-5">
        <SubHeading title="Week Diagram" />
        {editable ? (
          <DiagramPicker value={diagram} onChange={setDiagram} disabled={busy} />
        ) : isDisplayableImage(diagram) ? (
          <DiagramThumbnail src={diagram} caption={`Week ${weekNumber}`} className="size-20" />
        ) : (
          <p className="text-xs text-muted-foreground">No diagram attached.</p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
        {editable ? (
          <>
            {entry?.status === "draft" && (
              <DeleteDraftButton entryId={entry.id} weekNumber={weekNumber} onDeleted={onDeleted} className="sm:mr-auto" />
            )}
            {!canSubmit && (
              <p className={cn("text-xs text-muted-foreground", entry?.status !== "draft" && "sm:mr-auto")}>
                You can submit this week from {formatDate(submitOpensOn)}, once its last working day is logged. Saturday
                is optional. Save a draft as you go.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button variant="secondary" size="lg" onClick={handleSaveDraft} disabled={busy || !hasContent || (Boolean(entry) && !isDirty)}>
                {(create.isPending || update.isPending) && !confirmOpen && <Loader2 className="animate-spin" />}
                Save draft
              </Button>
              <Button size="lg" onClick={() => setConfirmOpen(true)} disabled={busy || !hasContent || !canSubmit}>
                <span className="sm:hidden">Submit week</span>
                <span className="hidden sm:inline">Submit week for review</span>
              </Button>
            </div>
          </>
        ) : !weekStarted ? (
          <p className="text-sm text-muted-foreground sm:mr-auto">
            Week {weekNumber} starts on <span className="text-foreground">{formatDate(range.start_date)}</span>. You can
            log it once it begins.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground sm:mr-auto">
            This week is <span className="text-foreground">{LOG_STATUS_LABELS[entry!.status].toLowerCase()}</span> and can no
            longer be edited.{" "}
            <Link href="/logbook" className="text-brand underline-offset-4 hover:underline">
              View in logbook
            </Link>
          </p>
        )}
      </div>

      <SubmitWeekDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        weekNumber={weekNumber}
        supervisorName={placement.workplace_supervisor?.full_name ?? null}
        organizationName={placement.organization_name}
        pending={busy}
        onConfirm={handleSubmit}
      />
    </SectionCard>
  );
}

function SubHeading({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h3 className="text-base tracking-tight text-foreground sm:text-lg">{title}</h3>
      <Badge variant="neutral">Optional</Badge>
    </div>
  );
}
