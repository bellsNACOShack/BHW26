"use client";

import { BookOpenCheck, ChevronRight, NotebookText } from "lucide-react";
import Link from "next/link";
import { LogStatusBadge, LogbookStageBadge, ScafSubmissionBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { AssignSupervisorsCard } from "@/components/organisms/AssignSupervisorsCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { PlacementOverview } from "@/components/organisms/PlacementOverview";
import { PlacementStatusSelect } from "@/components/organisms/PlacementStatusSelect";
import { RoleGate } from "@/components/organisms/RoleGate";
import { ScafStatusCard } from "@/components/organisms/ScafStatusCard";
import { VerificationCard } from "@/components/organisms/VerificationCard";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { can, isSupervisor } from "@/features/auth/permissions";
import { isApprovedStatus } from "@/features/logbook/lib/status";
import { usePlacement } from "@/features/placements/hooks/usePlacement";
import type { PlacementDetail } from "@/features/placements/types";
import type { ScafSubmissionStatus } from "@/features/scaf/types";
import { formatDate, formatDateRange, pluralize } from "@/lib/format";

/** Read-only SCAF status for staff; ITF officers open the review from here. */
function ScafSummaryCard({ placement, canReview }: { placement: PlacementDetail; canReview: boolean }) {
  const scaf = placement.scaf_submission;
  return (
    <SectionCard
      title="SCAF form"
      description={placement.itf_office ? `Routed to ${placement.itf_office.name}` : "Not routed to an ITF office yet"}
      badge={scaf ? <ScafSubmissionBadge status={scaf.status as ScafSubmissionStatus} /> : undefined}
      actions={
        canReview && scaf && scaf.status !== "draft" ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/itf/scaf/${scaf.id}`}>Open SCAF</Link>
          </Button>
        ) : undefined
      }
    >
      <p className="text-sm text-muted-foreground">
        {!scaf || scaf.status === "draft"
          ? "The student hasn't submitted their SCAF yet."
          : scaf.reviewed_at
            ? `Reviewed ${formatDate(scaf.reviewed_at)}.`
            : `Submitted ${formatDate(scaf.submitted_at)}.`}
      </p>
    </SectionCard>
  );
}

function PlacementDetailContent({ placementId }: { placementId: string }) {
  const { data: user } = useCurrentUser();
  const { data: placement, isLoading, error, refetch } = usePlacement(placementId);
  const listLabel = isSupervisor(user?.role) ? "Students" : "Placements";
  const role = user?.role;

  const header = (
    <PageHeader
      title={placement?.student?.full_name ?? "Placement"}
      description={placement?.organization_name}
      eyebrow={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/placements">{listLabel}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{placement?.student?.full_name ?? "Details"}</BreadcrumbPage>
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
        <Skeleton className="h-72 rounded-2xl bg-card" />
      </>
    );
  }
  if (error || !placement) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} className="rounded-2xl bg-card" />
      </>
    );
  }

  const weeks = [...placement.log_entries].sort((a, b) => a.week_number - b.week_number);
  const approvedWeeks = weeks.filter((w) => isApprovedStatus(w.status)).length;

  return (
    <>
      {header}
      <PlacementOverview
        placement={placement}
        showStudent
        actions={
          <>
            <LogbookStageBadge stage={placement.logbook_stage} />
            <Button asChild size="sm">
              <Link href={`/logbooks/${placement.id}`}>
                <BookOpenCheck /> Open logbook
              </Link>
            </Button>
            {role === "administrator" && <PlacementStatusSelect placement={placement} />}
          </>
        }
      />

      <SectionCard title="Logbook weeks" description={`${pluralize(weeks.length, "week")} logged · ${approvedWeeks} approved`}>
        {weeks.length === 0 ? (
          <EmptyState icon={NotebookText} title="No weeks logged yet" className="py-8" />
        ) : (
          <ul className="space-y-2">
            {weeks.map((week) => (
              <li key={week.id}>
                <Link
                  href={`/reviews/${week.id}`}
                  className="flex items-center gap-3 rounded-xl bg-surface p-2 pr-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="rounded-lg bg-card px-3 py-2 text-[0.8125rem]">Week {week.week_number}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{formatDateRange(week.start_date, week.end_date)}</span>
                  <LogStatusBadge status={week.status} />
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-3 lg:grid-cols-2">
        {can(role, "assignSupervisors") && <AssignSupervisorsCard placement={placement} />}
        {role === "administrator" ? (
          <ScafStatusCard placement={placement} editable />
        ) : (
          <ScafSummaryCard placement={placement} canReview={role === "itf_verifier"} />
        )}
      </div>

      {can(role, "generateVerification") && <VerificationCard placementId={placement.id} approvedWeeks={approvedWeeks} />}
    </>
  );
}

export function PlacementDetailPage({ placementId }: { placementId: string }) {
  return (
    <RoleGate permission="browsePlacements">
      <PlacementDetailContent placementId={placementId} />
    </RoleGate>
  );
}
