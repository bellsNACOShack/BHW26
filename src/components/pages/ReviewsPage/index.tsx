"use client";

import { useState } from "react";
import { SectionCard } from "@/components/molecules/SectionCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { ReviewQueueList } from "@/components/organisms/ReviewQueueList";
import { RoleGate } from "@/components/organisms/RoleGate";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReviewableEntries } from "@/features/logbook/hooks/useReviewableEntries";
import type { LogEntryStatus } from "@/features/logbook/types";

const TABS: { status: LogEntryStatus; label: string; empty: string }[] = [
  { status: "submitted", label: "To review", empty: "Nothing is waiting for your review" },
  { status: "approved", label: "Awaiting signature", empty: "No approved weeks are waiting to be signed" },
  { status: "rejected", label: "Returned", empty: "No weeks are waiting on student revisions" },
  { status: "locked", label: "Signed", empty: "No weeks have been signed yet" },
];

function ReviewsContent() {
  const [status, setStatus] = useState<LogEntryStatus>("submitted");
  const queue = useReviewableEntries(status);
  const tab = TABS.find((t) => t.status === status)!;

  return (
    <>
      <PageHeader title="Reviews" description="Review, approve and sign your students' weekly logs" />
      <SectionCard>
        <Tabs value={status} onValueChange={(value) => setStatus(value as LogEntryStatus)} className="mb-4">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="h-10 rounded-xl bg-surface p-1">
              {TABS.map((t) => (
                <TabsTrigger key={t.status} value={t.status} className="rounded-lg px-3 text-xs sm:text-sm">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <ReviewQueueList
          entries={queue.data}
          isLoading={queue.isLoading}
          error={queue.error}
          onRetry={queue.refetch}
          emptyTitle={tab.empty}
        />
      </SectionCard>
    </>
  );
}

export function ReviewsPage() {
  return (
    <RoleGate permission="reviewEntries">
      <ReviewsContent />
    </RoleGate>
  );
}
