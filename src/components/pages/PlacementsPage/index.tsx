"use client";

import { Search, SearchX, Users } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { PlacementsTable } from "@/components/organisms/PlacementsTable";
import { RoleGate } from "@/components/organisms/RoleGate";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { isSupervisor } from "@/features/auth/permissions";
import { usePlacements } from "@/features/placements/hooks/usePlacements";
import { PLACEMENT_STATUSES, PLACEMENT_STATUS_LABELS } from "@/features/placements/lib/status";
import type { PlacementStatus } from "@/features/placements/types";
import { pluralize } from "@/lib/format";

function PlacementsContent() {
  const { data: user } = useCurrentUser();
  const { data: placements, isLoading, error, refetch } = usePlacements();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PlacementStatus | "all">("all");
  const deferredQuery = useDeferredValue(query);
  const supervisor = isSupervisor(user?.role);
  // Scoped views list "students": assigned ones, those at the ITF office, or in the department.
  const scopedLabel =
    user?.role === "itf_verifier"
      ? "Students routed to your ITF office"
      : user?.role === "departmental_coordinator"
        ? "Students in your department"
        : supervisor
          ? "Students assigned to you"
          : null;

  // The API returns the full (role-scoped) list without search params, so filtering happens here.
  const filtered = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return (placements ?? []).filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!term) return true;
      return [p.student?.full_name, p.student?.email, p.organization_name].some((v) => v?.toLowerCase().includes(term));
    });
  }, [placements, deferredQuery, status]);

  return (
    <>
      <PageHeader
        title={scopedLabel ? "Students" : "Placements"}
        description={scopedLabel ?? "SIWES placements across the institution"}
      />
      <SectionCard
        title={scopedLabel ? "Students" : "All placements"}
        description={placements ? pluralize(placements.length, scopedLabel ? "student" : "placement") : undefined}
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student, email or organization"
              className="pl-10"
              aria-label="Search placements"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as PlacementStatus | "all")}>
            <SelectTrigger className="sm:w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PLACEMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PLACEMENT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !placements?.length ? (
          <EmptyState
            icon={Users}
            title={supervisor ? "No students assigned yet" : "No placements yet"}
            description={
              supervisor
                ? "Share your supervisor ID from the dashboard so students can add you to their placement."
                : "Placements appear here once students register them."
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No placements match your filters" />
        ) : (
          <PlacementsTable placements={filtered} />
        )}
      </SectionCard>
    </>
  );
}

export function PlacementsPage() {
  return (
    <RoleGate permission="browsePlacements">
      <PlacementsContent />
    </RoleGate>
  );
}
