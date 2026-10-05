"use client";

import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ScafSubmissionBadge } from "@/components/atoms/StatusBadge";
import { UserAvatar } from "@/components/atoms/UserAvatar";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScafSubmissions } from "@/features/scaf/hooks";
import type { ScafSubmission, ScafSubmissionStatus } from "@/features/scaf/types";
import { formatDate } from "@/lib/format";

const TABS: { key: string; label: string; status: ScafSubmissionStatus[]; empty: string }[] = [
  { key: "pending", label: "To review", status: ["submitted", "under_review"], empty: "No SCAF submissions are waiting for review" },
  { key: "approved", label: "Approved", status: ["approved"], empty: "No SCAF forms approved yet" },
  { key: "correction", label: "Requires correction", status: ["requires_correction"], empty: "No SCAF forms are awaiting correction" },
];

export function ScafQueueList({ submissions, limit }: { submissions: ScafSubmission[]; limit?: number }) {
  return (
    <ul className="space-y-2">
      {submissions.slice(0, limit).map((scaf) => {
        const profile = scaf.student?.student_profile;
        return (
          <li key={scaf.id}>
            <Link
              href={`/itf/scaf/${scaf.id}`}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <UserAvatar name={scaf.student?.full_name ?? "?"} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm text-foreground">{scaf.student?.full_name ?? "Student"}</p>
                  <ScafSubmissionBadge status={scaf.status} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[profile?.matric_number, profile?.institution, scaf.placement?.organization_name].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">Submitted {formatDate(scaf.submitted_at)}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ScafQueueContent() {
  const [tabKey, setTabKey] = useState(TABS[0].key);
  const tab = TABS.find((t) => t.key === tabKey)!;
  const { data, isLoading, error, refetch } = useScafSubmissions(tab.status);

  return (
    <>
      <PageHeader title="SCAF submissions" description="Student Commencement Attestation Forms routed to your ITF office" />
      <SectionCard>
        <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
          <Tabs value={tab.key} onValueChange={setTabKey}>
            <TabsList className="h-10 rounded-xl bg-surface p-1">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="rounded-lg px-3 text-xs sm:text-sm">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState icon={Inbox} title={tab.empty} className="py-10" />
        ) : (
          <ScafQueueList submissions={data} />
        )}
      </SectionCard>
    </>
  );
}

export function ScafQueuePage() {
  return (
    <RoleGate permission="reviewScaf">
      <ScafQueueContent />
    </RoleGate>
  );
}
