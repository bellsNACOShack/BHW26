"use client";

import { Inbox, Search, SearchX } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { LogbookQueueTable } from "@/components/organisms/LogbookQueueTable";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Permission } from "@/features/auth/permissions";
import { usePlacements } from "@/features/placements/hooks/usePlacements";
import type { LogbookStage } from "@/features/placements/lib/lifecycle";
import type { PlacementWithPeople } from "@/features/placements/types";
import { pluralize } from "@/lib/format";

export interface QueueTab {
  key: string;
  label: string;
  /** Omit to list every logbook in scope. */
  stages?: LogbookStage[];
  empty: string;
}

interface LogbookQueuePageProps {
  title: string;
  description: string;
  permission: Permission;
  tabs: QueueTab[];
}

function matches(placement: PlacementWithPeople, term: string) {
  const profile = placement.student?.student_profile;
  return [
    placement.student?.full_name,
    placement.student?.email,
    profile?.matric_number,
    profile?.institution,
    profile?.department,
    placement.organization_name,
  ].some((value) => value?.toLowerCase().includes(term));
}

function QueueContent({ title, description, tabs }: Omit<LogbookQueuePageProps, "permission">) {
  const [tabKey, setTabKey] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === tabKey) ?? tabs[0];
  const { data, isLoading, error, refetch } = usePlacements({ logbook_stage: tab.stages });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // The API scopes the list by role (ITF office, assigned students, department); search runs here.
  const filtered = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return (data ?? []).filter((p) => !term || matches(p, term));
  }, [data, deferredQuery]);

  return (
    <>
      <PageHeader title={title} description={description} />
      <SectionCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <Tabs value={tab.key} onValueChange={setTabKey}>
              <TabsList className="h-10 rounded-xl bg-surface p-1">
                {tabs.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="rounded-lg px-3 text-xs sm:text-sm">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, matric, department…"
              className="pl-10"
              aria-label="Search students"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState icon={Inbox} title={tab.empty} className="py-10" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No students match your search" className="py-10" />
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">{pluralize(filtered.length, "logbook")}</p>
            <LogbookQueueTable placements={filtered} />
          </>
        )}
      </SectionCard>
    </>
  );
}

/** Role queue of logbooks (ITF requests, academic assessments, departmental records). */
export function LogbookQueuePage({ permission, ...props }: LogbookQueuePageProps) {
  return (
    <RoleGate permission={permission}>
      <QueueContent {...props} />
    </RoleGate>
  );
}
