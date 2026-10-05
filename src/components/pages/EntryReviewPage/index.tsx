"use client";

import Link from "next/link";
import { DetailList } from "@/components/molecules/DetailList";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { EntryDetails, EntryDetailsSkeleton } from "@/components/organisms/EntryDetails";
import { PageHeader } from "@/components/organisms/PageHeader";
import { ReviewActionsCard } from "@/components/organisms/ReviewActionsCard";
import { RoleGate } from "@/components/organisms/RoleGate";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { can } from "@/features/auth/permissions";
import { useLogEntry } from "@/features/logbook/hooks/useLogEntry";
import type { LogEntryDetail } from "@/features/logbook/types";
import type { User } from "@/features/auth/types";
import { formatDateRange } from "@/lib/format";

/** Mirrors the API rule: the placement's industry (workplace) supervisor, or administrators. */
function canActOnEntry(user: User | undefined, entry: LogEntryDetail) {
  if (!user || !can(user.role, "reviewEntries")) return false;
  if (user.role === "administrator") return true;
  return entry.placement?.workplace_supervisor_id === user.id;
}

function EntryReviewContent({ entryId }: { entryId: string }) {
  const { data: user } = useCurrentUser();
  const { data: entry, isLoading, error, refetch } = useLogEntry(entryId);
  const backHref = can(user?.role, "reviewEntries") ? "/reviews" : "/placements";

  const header = (
    <PageHeader
      title={entry ? `${entry.student?.full_name ?? "Student"} · Week ${entry.week_number}` : "Weekly entry"}
      description={entry ? formatDateRange(entry.start_date, entry.end_date) : undefined}
      eyebrow={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={backHref}>{backHref === "/reviews" ? "Reviews" : "Placements"}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {entry?.placement && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/placements/${entry.placement_id}`}>{entry.student?.full_name ?? "Placement"}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Week {entry?.week_number ?? ""}</BreadcrumbPage>
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
        <div className="rounded-2xl bg-card p-4">
          <EntryDetailsSkeleton />
        </div>
      </>
    );
  }
  if (error || !entry) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} className="rounded-2xl bg-card" />
      </>
    );
  }

  const actionable = canActOnEntry(user, entry);

  return (
    <>
      {header}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-5 lg:order-last">
          {actionable && <ReviewActionsCard entry={entry} />}
          <SectionCard title="Placement" divided={false}>
            <DetailList
              className="sm:grid-cols-1"
              items={[
                { label: "Organization", value: entry.placement?.organization_name ?? "—" },
                { label: "Student email", value: entry.student?.email ?? "—" },
              ]}
            />
          </SectionCard>
        </aside>
        <div className="min-w-0 rounded-2xl bg-surface">
          <EntryDetails entryId={entry.id} />
        </div>
      </div>
    </>
  );
}

export function EntryReviewPage({ entryId }: { entryId: string }) {
  return (
    <RoleGate permission="browsePlacements">
      <EntryReviewContent entryId={entryId} />
    </RoleGate>
  );
}
