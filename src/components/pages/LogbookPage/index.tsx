"use client";

import { Building2, NotebookText } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { LogbookSubmissionCard } from "@/components/organisms/LogbookSubmissionCard";
import { RoleGate } from "@/components/organisms/RoleGate";
import { WeekAccordionItem } from "@/components/organisms/WeekAccordionItem";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLogbook } from "@/features/logbook/hooks/useMyLogbook";
import { getAvailableWeekNumbers } from "@/features/logbook/lib/weeks";
import { pluralize } from "@/lib/format";

function LogbookContent() {
  const { placement, entries, isLoading, error, refetch } = useMyLogbook();
  const weeks = entries ?? [];
  const canAddWeek = placement ? getAvailableWeekNumbers(placement, weeks.map((e) => e.week_number)).length > 0 : false;

  return (
    <>
      <PageHeader title="Logbook" description="Weekly log entries" />
      {placement && <LogbookSubmissionCard placementId={placement.id} />}
      <SectionCard
        title="Logged weeks"
        description={isLoading ? "Loading…" : pluralize(weeks.length, "week") + " logged"}
        actions={
          placement && canAddWeek ? (
            <Button asChild>
              <Link href="/logbook/new">Add new week</Link>
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !placement ? (
          <EmptyState
            icon={Building2}
            title="Add your SIWES placement first"
            description="Your logbook weeks are based on your placement's start and end dates."
            action={
              <Button asChild>
                <Link href="/placement">Add placement</Link>
              </Button>
            }
          />
        ) : weeks.length === 0 ? (
          <EmptyState
            icon={NotebookText}
            title="No weeks logged yet"
            description="Record what you worked on each day, then submit the week for your supervisor's review."
            action={
              <Button asChild>
                <Link href="/logbook/new">Log your first week</Link>
              </Button>
            }
          />
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {weeks.map((entry) => (
              <WeekAccordionItem key={entry.id} entry={entry} editHref={`/logbook/${entry.id}`} />
            ))}
          </Accordion>
        )}
      </SectionCard>
    </>
  );
}

export function LogbookPage() {
  return (
    <RoleGate permission="manageOwnLogbook">
      <LogbookContent />
    </RoleGate>
  );
}
