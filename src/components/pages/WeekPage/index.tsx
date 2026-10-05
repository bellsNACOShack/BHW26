"use client";

import { Building2, CalendarCheck, FileQuestion } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { WeekEditor } from "@/components/organisms/WeekEditor";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLogbook } from "@/features/logbook/hooks/useMyLogbook";
import {
  getAvailableWeekNumbers,
  getCurrentWeekNumber,
  getTotalWeeks,
  getWeekRange,
  hasPlacementStarted,
} from "@/features/logbook/lib/weeks";
import { formatDate } from "@/lib/format";

interface WeekPageProps {
  /** Existing entry to edit; omit for "Add new week". */
  entryId?: string;
}

function WeekContent({ entryId }: WeekPageProps) {
  const router = useRouter();
  const { placement, entries, isLoading, error, refetch } = useMyLogbook();
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  // The suggested week is fixed once shown, so creating it does not switch the form to another week.
  const suggestedWeek = useRef<number | null>(null);
  const pageTitle = entryId ? "Edit week" : "Add new week";

  const header = (
    <PageHeader
      title={pageTitle}
      eyebrow={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/logbook">Logbook</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    />
  );

  function body() {
    if (isLoading) return <Skeleton className="h-[32rem] rounded-2xl bg-card" />;
    if (error) return <ErrorState error={error} onRetry={refetch} className="rounded-2xl bg-card" />;
    if (!placement) {
      return (
        <EmptyState
          icon={Building2}
          title="Add your SIWES placement first"
          action={
            <Button asChild>
              <Link href="/placement">Add placement</Link>
            </Button>
          }
          className="rounded-2xl bg-card"
        />
      );
    }

    const weeks = entries ?? [];

    if (entryId) {
      const entry = weeks.find((e) => e.id === entryId);
      if (!entry) {
        return (
          <EmptyState
            icon={FileQuestion}
            title="This week could not be found"
            description="It may have been deleted."
            action={
              <Button asChild variant="secondary">
                <Link href="/logbook">Back to logbook</Link>
              </Button>
            }
            className="rounded-2xl bg-card"
          />
        );
      }
      return (
        <WeekEditor
          key={entry.id}
          placement={placement}
          weekNumber={entry.week_number}
          entry={entry}
          onSubmitted={() => router.push("/logbook")}
          onDeleted={() => router.replace("/logbook")}
        />
      );
    }

    const available = getAvailableWeekNumbers(placement, weeks.map((e) => e.week_number));
    if (available.length === 0) {
      // Only started weeks can be logged, so explain when the next one opens.
      const currentWeek = getCurrentWeekNumber(placement);
      const nextWeek = hasPlacementStarted(placement) ? currentWeek + 1 : 1;
      const opensOn = nextWeek <= getTotalWeeks(placement) ? getWeekRange(placement, nextWeek).start_date : null;
      return (
        <EmptyState
          icon={CalendarCheck}
          title={opensOn ? "You're up to date" : "Every week of your placement has an entry"}
          description={opensOn ? `Week ${nextWeek} opens on ${formatDate(opensOn)}.` : undefined}
          action={
            <Button asChild variant="secondary">
              <Link href="/logbook">Back to logbook</Link>
            </Button>
          }
          className="rounded-2xl bg-card"
        />
      );
    }

    if (suggestedWeek.current === null) {
      const current = getCurrentWeekNumber(placement);
      suggestedWeek.current = available.includes(current) ? current : available[0];
    }
    const week = pickedWeek ?? suggestedWeek.current;

    return (
      <WeekEditor
        key={`new-${week}`}
        placement={placement}
        weekNumber={week}
        onCreated={(id) => router.replace(`/logbook/${id}`)}
        onSubmitted={() => router.push("/logbook")}
        headerAction={
          <Select value={String(week)} onValueChange={(value) => setPickedWeek(Number(value))}>
            <SelectTrigger className="h-10 w-32 bg-secondary" aria-label="Choose week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {available.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Week {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    );
  }

  return (
    <>
      {header}
      {body()}
    </>
  );
}

export function WeekPage(props: WeekPageProps) {
  return (
    <RoleGate permission="manageOwnLogbook">
      <WeekContent {...props} />
    </RoleGate>
  );
}
