"use client";

import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { LogStatusBadge } from "@/components/atoms/StatusBadge";
import { UserAvatar } from "@/components/atoms/UserAvatar";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewableEntry } from "@/features/logbook/hooks/useReviewableEntries";
import { formatDate, formatDateRange } from "@/lib/format";

interface ReviewQueueListProps {
  entries: ReviewableEntry[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  /** Cap the number of rows (dashboard preview). */
  limit?: number;
}

export function ReviewQueueList({
  entries,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  limit,
}: ReviewQueueListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!entries?.length) return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} className="py-8" />;

  return (
    <ul className="space-y-2">
      {entries.slice(0, limit).map((entry) => {
        const studentName = entry.student?.full_name ?? entry.placement.student?.full_name ?? "Student";
        return (
          <li key={entry.id}>
            <Link
              href={`/reviews/${entry.id}`}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <UserAvatar name={studentName} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm text-foreground">{studentName}</p>
                  <LogStatusBadge status={entry.status} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Week {entry.week_number} · {formatDateRange(entry.start_date, entry.end_date)} ·{" "}
                  {entry.placement.organization_name}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">Updated {formatDate(entry.updated_at)}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
