"use client";

import { ArrowUpRight, Building2, CalendarDays, Clock3, ListChecks, Shapes } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { LogStatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { StatCard } from "@/components/molecules/StatCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { WeekEditor } from "@/components/organisms/WeekEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/features/auth/types";
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats";
import { useMyLogbook } from "@/features/logbook/hooks/useMyLogbook";
import { isDisplayableImage } from "@/features/logbook/lib/diagram";
import { LOG_STATUS_LABELS, isApprovedStatus } from "@/features/logbook/lib/status";
import {
  getCurrentWeekNumber,
  getTotalWeeks,
  getWeekRange,
  hasPlacementEnded,
  hasPlacementStarted,
  hasWeekStarted,
} from "@/features/logbook/lib/weeks";
import type { LogEntryListItem } from "@/features/logbook/types";
import { firstName, pluralize } from "@/lib/format";

/**
 * Week to open by default: one needing revision, else the latest draft, else this
 * calendar week, else the earliest past week without an entry. Never a future week.
 */
function pickDefaultWeek(entries: LogEntryListItem[], currentWeek: number) {
  const rejected = entries.find((e) => e.status === "rejected");
  if (rejected) return rejected.week_number;
  const drafts = entries.filter((e) => e.status === "draft");
  if (drafts.length) return drafts[drafts.length - 1].week_number;
  if (!entries.some((e) => e.week_number === currentWeek)) return currentWeek;
  const used = new Set(entries.map((e) => e.week_number));
  for (let week = 1; week < currentWeek; week++) if (!used.has(week)) return week;
  return currentWeek;
}

function LinkChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      {children} <ArrowUpRight className="size-3" aria-hidden />
    </Link>
  );
}

export function StudentDashboard({ user }: { user: User }) {
  const { placement, entries, isLoading, error, refetch } = useMyLogbook();
  const stats = useDashboardStats();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  // The suggested week is fixed once shown so saving or submitting never switches weeks underneath the user.
  const suggestedWeek = useRef<number | null>(null);
  // Bumped after a draft is deleted so the editor starts empty again.
  const [editorVersion, setEditorVersion] = useState(0);

  const header = (
    <PageHeader
      title={`Welcome back, ${firstName(user.full_name)}.`}
      description={
        placement ? (
          <>
            SIWES Placement: <span className="text-foreground">{placement.organization_name}.</span>
          </>
        ) : (
          user.student_profile?.institution
        )
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[7.5rem] rounded-2xl bg-card" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl bg-card" />
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <div className="rounded-2xl bg-card">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      </>
    );
  }

  if (!placement) {
    return (
      <>
        {header}
        <div className="rounded-2xl bg-card">
          <EmptyState
            icon={Building2}
            title="Set up your SIWES placement"
            description="Add your organization and training dates to start logging your weekly activities."
            action={
              <Button asChild>
                <Link href="/placement">Add placement</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const weekEntries = entries ?? [];
  const totalWeeks = getTotalWeeks(placement);
  const currentWeek = getCurrentWeekNumber(placement);
  const started = hasPlacementStarted(placement);
  const ended = hasPlacementEnded(placement);
  const approvedWeeks = weekEntries.filter((e) => isApprovedStatus(e.status)).length;
  const progress = Math.round((approvedWeeks / totalWeeks) * 100);
  const currentEntry = weekEntries.find((e) => e.week_number === currentWeek);
  const diagramCount = weekEntries.filter((e) => isDisplayableImage(e.supporting_evidence_url)).length;
  const studentStats = stats.data?.role === "student" ? stats.data.stats : null;

  suggestedWeek.current ??= pickDefaultWeek(weekEntries, currentWeek);
  const week = selectedWeek ?? suggestedWeek.current;
  const entry = weekEntries.find((e) => e.week_number === week) ?? null;

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <StatCard
          label="SIWES Progress"
          icon={CalendarDays}
          tone="blue"
          value={ended ? `Ended · ${totalWeeks} weeks` : started ? `Week ${currentWeek} of ${totalWeeks}` : `${totalWeeks} weeks`}
          footer={
            <div className="space-y-1.5">
              <Progress value={progress} className="h-1.5 bg-secondary [&>div]:bg-success" aria-label="Approved weeks" />
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          }
        />
        <StatCard
          label="Current Week"
          icon={ListChecks}
          tone="green"
          value={ended ? "Ended" : started ? `Week ${currentWeek}` : "Not started"}
          footer={currentEntry ? <LogStatusBadge status={currentEntry.status} /> : <Badge variant="neutral">No entry yet</Badge>}
        />
        <StatCard
          label="Diagram Uploads"
          icon={Shapes}
          tone="violet"
          value={pluralize(diagramCount, "Diagram")}
          footer={<LinkChip href="/diagrams">Add diagram</LinkChip>}
        />
        <StatCard
          label="Awaiting Review"
          icon={Clock3}
          tone="amber"
          loading={stats.isLoading}
          value={studentStats ? pluralize(studentStats.pending_reviews, "Week") : "—"}
          footer={<LinkChip href="/logbook">View logbook</LinkChip>}
        />
      </div>

      <WeekEditor
        // Keyed by week (not entry id) so saving a new week does not remount the editor mid-submit.
        key={`week-${week}-${editorVersion}`}
        placement={placement}
        weekNumber={week}
        entry={entry}
        onDeleted={() => setEditorVersion((v) => v + 1)}
        headerAction={
          <Select value={String(week)} onValueChange={(value) => setSelectedWeek(Number(value))}>
            <SelectTrigger className="h-10 w-[8.5rem] bg-secondary" aria-label="Choose week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((n) => {
                const weekEntry = weekEntries.find((e) => e.week_number === n);
                // Weeks that haven't begun can't be opened; the current week is always available.
                const upcoming = n !== week && !hasWeekStarted(getWeekRange(placement, n));
                return (
                  <SelectItem key={n} value={String(n)} disabled={upcoming}>
                    Week {n}
                    {weekEntry ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">· {LOG_STATUS_LABELS[weekEntry.status]}</span>
                    ) : upcoming ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">· Upcoming</span>
                    ) : null}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        }
      />
    </>
  );
}
