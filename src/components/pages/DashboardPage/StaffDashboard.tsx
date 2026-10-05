"use client";

import {
  Archive,
  BookOpenCheck,
  Building2,
  CheckCheck,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Inbox,
  ShieldCheck,
  Undo2,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyField } from "@/components/molecules/CopyField";
import { DetailList } from "@/components/molecules/DetailList";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { StatCard } from "@/components/molecules/StatCard";
import { LogbookQueueTable } from "@/components/organisms/LogbookQueueTable";
import { PageHeader } from "@/components/organisms/PageHeader";
import { PasskeySetupCard } from "@/components/organisms/PasskeySetupCard";
import { ReviewQueueList } from "@/components/organisms/ReviewQueueList";
import { VerifyCodeForm } from "@/components/organisms/VerifyCodeForm";
import { ScafQueueList } from "@/components/pages/ScafQueuePage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS, can } from "@/features/auth/permissions";
import type { User } from "@/features/auth/types";
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats";
import type { DashboardStatsResponse } from "@/features/dashboard/types";
import { useReviewableEntries } from "@/features/logbook/hooks/useReviewableEntries";
import { usePlacements } from "@/features/placements/hooks/usePlacements";
import { ACADEMIC_PENDING_STAGES, ITF_PENDING_STAGES, type LogbookStage } from "@/features/placements/lib/lifecycle";
import { useScafSubmissions } from "@/features/scaf/hooks";
import { firstName } from "@/lib/format";

type StatsFor<R extends DashboardStatsResponse["role"]> = Extract<DashboardStatsResponse, { role: R }>["stats"];

function useRoleStats<R extends DashboardStatsResponse["role"]>(role: R) {
  const stats = useDashboardStats();
  const data = stats.data?.role === role ? (stats.data.stats as StatsFor<R>) : null;
  return { ...stats, data };
}

function StatGrid({ children, columns = "lg:grid-cols-3" }: { children: ReactNode; columns?: string }) {
  return <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${columns}`}>{children}</div>;
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

/** Up to five logbooks at the given stages, as on the role's queue page. */
function LogbookPreview({ stages, empty, description }: { stages: LogbookStage[]; empty: string; description?: string }) {
  const { data, isLoading, error, refetch } = usePlacements({ logbook_stage: stages });
  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data?.length) return <EmptyState icon={Inbox} title={empty} description={description} className="py-8" />;
  return <LogbookQueueTable placements={data.slice(0, 5)} />;
}

function SupervisorIdCard({ user }: { user: User }) {
  return (
    <SectionCard title="Your supervisor ID" description="Students add you to their placement with this ID." divided={false}>
      <CopyField label="Supervisor ID" value={user.id} />
    </SectionCard>
  );
}

/* Industry (workplace) supervisor: weekly reviews, unchanged. */
function WorkplaceDashboard({ user }: { user: User }) {
  const stats = useRoleStats("workplace_supervisor");
  const queue = useReviewableEntries("submitted");
  return (
    <>
      {stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} className="rounded-2xl bg-card" />
      ) : (
        <StatGrid>
          <StatCard label="Assigned students" icon={Users} tone="blue" loading={stats.isLoading} value={stats.data?.assigned_students ?? "—"} />
          <StatCard label="Pending reviews" icon={ClipboardCheck} tone="amber" loading={stats.isLoading} value={stats.data?.pending_reviews ?? "—"} />
          <StatCard label="Approved entries" icon={CheckCheck} tone="green" loading={stats.isLoading} value={stats.data?.total_approved_entries ?? "—"} />
        </StatGrid>
      )}
      <SectionCard
        title="Awaiting your review"
        description="Weeks students have submitted for sign-off"
        actions={<ViewAll href="/reviews" label="All reviews" />}
      >
        <ReviewQueueList
          entries={queue.data}
          isLoading={queue.isLoading}
          error={queue.error}
          onRetry={queue.refetch}
          limit={5}
          emptyTitle="You're all caught up"
          emptyDescription="New submissions from your students will appear here."
        />
      </SectionCard>
      <div className="grid gap-3 lg:grid-cols-2">
        <SupervisorIdCard user={user} />
        <PasskeySetupCard />
      </div>
    </>
  );
}

/* Academic SIWES supervisor: completed logbooks to review, sign and grade. */
function AcademicDashboard({ user }: { user: User }) {
  const stats = useRoleStats("academic_supervisor");
  return (
    <>
      {stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} className="rounded-2xl bg-card" />
      ) : (
        <StatGrid>
          <StatCard label="Students under supervision" icon={Users} tone="blue" loading={stats.isLoading} value={stats.data?.assigned_students ?? "—"} />
          <StatCard label="Pending reviews" icon={ClipboardCheck} tone="amber" loading={stats.isLoading} value={stats.data?.pending_assessments ?? "—"} />
          <StatCard label="Signed & graded" icon={GraduationCap} tone="green" loading={stats.isLoading} value={stats.data?.completed_assessments ?? "—"} />
        </StatGrid>
      )}
      <SectionCard
        title="Awaiting your review"
        description="ITF-approved logbooks to sign and grade"
        actions={<ViewAll href="/assessments" label="All assessments" />}
      >
        <LogbookPreview
          stages={ACADEMIC_PENDING_STAGES}
          empty="No logbooks are waiting for you"
          description="Students submit their logbook to you after ITF has approved it."
        />
      </SectionCard>
      <div className="grid gap-3 lg:grid-cols-2">
        <SupervisorIdCard user={user} />
        <PasskeySetupCard />
      </div>
    </>
  );
}

/* ITF officer: SCAFs and logbooks routed to their office. */
function ItfDashboard({ user }: { user: User }) {
  const stats = useRoleStats("itf_verifier");
  const scaf = useScafSubmissions(["submitted", "under_review"]);
  return (
    <>
      {!user.itf_office && (
        <SectionCard title="No ITF office linked" divided={false}>
          <p className="text-sm text-muted-foreground">
            Your account isn&apos;t linked to an ITF office yet, so no students are routed to you.
          </p>
        </SectionCard>
      )}
      {stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} className="rounded-2xl bg-card" />
      ) : (
        <StatGrid columns="lg:grid-cols-5">
          <StatCard label="Pending SCAF" icon={FileCheck2} tone="amber" loading={stats.isLoading} value={stats.data?.pending_scaf ?? "—"} />
          <StatCard label="Logbook requests" icon={BookOpenCheck} tone="blue" loading={stats.isLoading} value={stats.data?.pending_logbooks ?? "—"} />
          <StatCard label="Approved logbooks" icon={CheckCheck} tone="green" loading={stats.isLoading} value={stats.data?.approved_logbooks ?? "—"} />
          <StatCard label="Rejected logbooks" icon={Undo2} tone="neutral" loading={stats.isLoading} value={stats.data?.rejected_logbooks ?? "—"} />
          <StatCard label="Students at office" icon={Users} tone="violet" loading={stats.isLoading} value={stats.data?.office_students ?? "—"} />
        </StatGrid>
      )}
      <SectionCard
        title="Logbook requests"
        description="Logbooks waiting for ITF review and signing"
        actions={<ViewAll href="/itf/logbooks" label="All requests" />}
      >
        <LogbookPreview stages={ITF_PENDING_STAGES} empty="No logbooks are waiting for review" />
      </SectionCard>
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard
          title="SCAF submissions"
          description="New commencement forms to review"
          actions={<ViewAll href="/itf/scaf" label="All SCAF" />}
        >
          {scaf.isLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : scaf.error ? (
            <ErrorState error={scaf.error} onRetry={() => void scaf.refetch()} />
          ) : !scaf.data?.length ? (
            <EmptyState icon={Inbox} title="No SCAF forms to review" className="py-8" />
          ) : (
            <ScafQueueList submissions={scaf.data} limit={5} />
          )}
        </SectionCard>
        <div className="space-y-3">
          {user.itf_office && (
            <SectionCard title="Your ITF office" divided={false}>
              <DetailList
                items={[
                  { label: "Office", value: user.itf_office.name },
                  { label: "Location", value: `${user.itf_office.city}, ${user.itf_office.state}` },
                ]}
              />
            </SectionCard>
          )}
          <PasskeySetupCard />
        </div>
      </div>
      <SectionCard title="Verify a SIWES record" description="Enter the code printed on a student's verification record.">
        <VerifyCodeForm />
      </SectionCard>
    </>
  );
}

/* Departmental SIWES coordinator: completed logbooks for departmental records. */
function DepartmentDashboard({ user }: { user: User }) {
  const stats = useRoleStats("departmental_coordinator");
  return (
    <>
      {stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} className="rounded-2xl bg-card" />
      ) : (
        <StatGrid columns="lg:grid-cols-4">
          <StatCard label="Students in department" icon={Users} tone="blue" loading={stats.isLoading} value={stats.data?.department_students ?? "—"} />
          <StatCard label="Newly submitted" icon={Inbox} tone="amber" loading={stats.isLoading} value={stats.data?.awaiting_receipt ?? "—"} />
          <StatCard label="In departmental records" icon={BookOpenCheck} tone="green" loading={stats.isLoading} value={stats.data?.received_logbooks ?? "—"} />
          <StatCard label="Archived with ITF" icon={Archive} tone="violet" loading={stats.isLoading} value={stats.data?.archived_logbooks ?? "—"} />
        </StatGrid>
      )}
      <SectionCard
        title="Completed logbooks"
        description="Signed and graded logbooks submitted by your students"
        actions={<ViewAll href="/department" label="All logbooks" />}
      >
        <LogbookPreview
          stages={["department_submitted", "department_received"]}
          empty="No completed logbooks yet"
          description="Students submit their logbook here after ITF approval and academic signing and grading."
        />
      </SectionCard>
      <SectionCard title="Your department" divided={false}>
        <DetailList
          items={[
            { label: "Institution", value: user.institution ?? "—" },
            { label: "Department", value: user.department ?? "—" },
          ]}
        />
      </SectionCard>
    </>
  );
}

/* Administrators: institution-wide totals. */
function AdminDashboard() {
  const stats = useRoleStats("administrator");
  return (
    <>
      {stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} className="rounded-2xl bg-card" />
      ) : (
        <StatGrid columns="xl:grid-cols-4">
          <StatCard label="Students" icon={GraduationCap} tone="blue" loading={stats.isLoading} value={stats.data?.total_students ?? "—"} />
          <StatCard label="Placements" icon={Building2} tone="violet" loading={stats.isLoading} value={stats.data?.total_placements ?? "—"} />
          <StatCard label="Active placements" icon={Users} tone="green" loading={stats.isLoading} value={stats.data?.active_placements ?? "—"} />
          <StatCard label="Verifications issued" icon={ShieldCheck} tone="amber" loading={stats.isLoading} value={stats.data?.total_verifications ?? "—"} />
        </StatGrid>
      )}
      {can("administrator", "signWithPasskey") && <PasskeySetupCard />}
    </>
  );
}

export function StaffDashboard({ user }: { user: User }) {
  return (
    <>
      <PageHeader title={`Welcome back, ${firstName(user.full_name)}.`} description={ROLE_LABELS[user.role]} />
      {user.role === "workplace_supervisor" && <WorkplaceDashboard user={user} />}
      {user.role === "academic_supervisor" && <AcademicDashboard user={user} />}
      {user.role === "itf_verifier" && <ItfDashboard user={user} />}
      {user.role === "departmental_coordinator" && <DepartmentDashboard user={user} />}
      {user.role === "administrator" && <AdminDashboard />}
    </>
  );
}
