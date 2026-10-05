"use client";

import { NotebookText } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { LogbookStageBadge } from "@/components/atoms/StatusBadge";
import { DetailList } from "@/components/molecules/DetailList";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { AcademicLogbookActions, DepartmentLogbookActions, ItfLogbookActions } from "@/components/organisms/LogbookActionCards";
import {
  LogbookAssessmentCard,
  LogbookHistoryCard,
  LogbookSignaturesCard,
} from "@/components/organisms/LogbookRecordCards";
import { LogbookTracker } from "@/components/organisms/LogbookTracker";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { WeekAccordionItem } from "@/components/organisms/WeekAccordionItem";
import { Accordion } from "@/components/ui/accordion";
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
import type { UserRole } from "@/features/auth/types";
import { useLogEntries } from "@/features/logbook/hooks/useLogEntries";
import { getTotalWeeks } from "@/features/logbook/lib/weeks";
import { useLogbookAction } from "@/features/placements/hooks/useLogbookAction";
import { usePlacement } from "@/features/placements/hooks/usePlacement";
import type { LogbookAction, LogbookStage } from "@/features/placements/lib/lifecycle";
import type { PlacementDetail } from "@/features/placements/types";
import { formatDateRange, pluralize } from "@/lib/format";

const BACK_LINKS: Partial<Record<UserRole, { href: string; label: string }>> = {
  itf_verifier: { href: "/itf/logbooks", label: "Logbook requests" },
  academic_supervisor: { href: "/assessments", label: "Assessments" },
  departmental_coordinator: { href: "/department", label: "Department logbooks" },
};

/** Opening a logbook at these stages records that the reviewer has received it. */
const OPEN_ACTIONS: Partial<Record<UserRole, { stage: LogbookStage; action: LogbookAction }>> = {
  itf_verifier: { stage: "itf_submitted", action: "itf_open" },
  academic_supervisor: { stage: "academic_submitted", action: "academic_open" },
  departmental_coordinator: { stage: "department_submitted", action: "department_receive" },
};

function useRecordOpened(placement: PlacementDetail | undefined, role: UserRole | undefined) {
  const open = useLogbookAction(placement?.id ?? "");
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (!placement || !role) return;
    const rule = OPEN_ACTIONS[role];
    if (!rule || placement.logbook_stage !== rule.stage || sent.current === placement.id) return;
    sent.current = placement.id;
    open.mutate({ action: rule.action });
  }, [placement, role, open]);
}

function StudentSummaryCard({ placement }: { placement: PlacementDetail }) {
  const profile = placement.student?.student_profile;
  return (
    <SectionCard
      title={placement.student?.full_name ?? "Student"}
      description={placement.student?.email}
      badge={<LogbookStageBadge stage={placement.logbook_stage} />}
    >
      <DetailList
        items={[
          { label: "Matric number", value: profile?.matric_number ?? "—" },
          { label: "Institution", value: profile?.institution ?? "—" },
          { label: "Department", value: profile ? `${profile.department} · ${profile.program}` : "—" },
          { label: "SIWES organization", value: placement.organization_name },
          { label: "Organization address", value: placement.organization_address },
          { label: "ITF office", value: placement.itf_office?.name ?? "Not routed" },
          {
            label: "Duration",
            value: `${formatDateRange(placement.start_date, placement.end_date)} · ${getTotalWeeks(placement)} weeks`,
          },
          { label: "Industry supervisor", value: placement.workplace_supervisor?.full_name ?? "Not assigned" },
          { label: "Academic supervisor", value: placement.academic_supervisor?.full_name ?? "Not assigned" },
        ]}
      />
    </SectionCard>
  );
}

function LogbookWeeks({ placementId }: { placementId: string }) {
  const { data: entries, isLoading, error, refetch } = useLogEntries({ placement_id: placementId });
  return (
    <SectionCard
      title="Logbook"
      description={entries ? `${pluralize(entries.length, "week")} · activities, supervisor comments and signatures` : undefined}
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !entries?.length ? (
        <EmptyState icon={NotebookText} title="No weeks logged yet" className="py-8" />
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {entries.map((entry) => (
            <WeekAccordionItem key={entry.id} entry={entry} />
          ))}
        </Accordion>
      )}
    </SectionCard>
  );
}

function LogbookReviewContent({ placementId }: { placementId: string }) {
  const { data: user } = useCurrentUser();
  const { data: placement, isLoading, error, refetch } = usePlacement(placementId);
  useRecordOpened(placement, user?.role);
  const back = (user && BACK_LINKS[user.role]) ?? { href: "/placements", label: "Placements" };

  const header = (
    <PageHeader
      title={placement ? `${placement.student?.full_name ?? "Student"} · Logbook` : "Logbook"}
      description={placement?.organization_name}
      eyebrow={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={back.href}>{back.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{placement?.student?.full_name ?? "Logbook"}</BreadcrumbPage>
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
  if (error || !placement) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} className="rounded-2xl bg-card" />
      </>
    );
  }

  const role = user?.role;
  return (
    <>
      {header}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-5 lg:order-last">
          {(role === "itf_verifier" || role === "administrator") && <ItfLogbookActions placement={placement} />}
          {(role === "academic_supervisor" || role === "administrator") && <AcademicLogbookActions placement={placement} />}
          {(role === "departmental_coordinator" || role === "administrator") && <DepartmentLogbookActions placement={placement} />}
          <SectionCard title="Verification progress" divided={false}>
            <LogbookTracker placement={placement} />
          </SectionCard>
          <LogbookSignaturesCard placement={placement} />
          <LogbookAssessmentCard placement={placement} />
        </aside>
        <div className="min-w-0 space-y-3">
          <StudentSummaryCard placement={placement} />
          <LogbookWeeks placementId={placement.id} />
          <LogbookHistoryCard placement={placement} />
        </div>
      </div>
    </>
  );
}

export function LogbookReviewPage({ placementId }: { placementId: string }) {
  return (
    <RoleGate permission="browsePlacements">
      <LogbookReviewContent placementId={placementId} />
    </RoleGate>
  );
}
