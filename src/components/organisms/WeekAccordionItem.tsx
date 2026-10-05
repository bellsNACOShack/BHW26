"use client";

import { ChevronDown, PencilLine } from "lucide-react";
import Link from "next/link";
import { LogStatusBadge } from "@/components/atoms/StatusBadge";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { isEditableStatus } from "@/features/logbook/lib/status";
import type { LogEntryListItem } from "@/features/logbook/types";
import { formatDate } from "@/lib/format";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { EntryDetails } from "./EntryDetails";

/** The most meaningful date for an entry's current state, e.g. "Signed 13 May 2024". */
function describeLatestEvent(entry: LogEntryListItem) {
  const latest = <T extends { created_at: string }>(items: T[]) =>
    [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  switch (entry.status) {
    case "locked":
      return `Signed ${formatDate(latest(entry.signatures)?.created_at ?? entry.updated_at)}`;
    case "approved":
      return `Approved ${formatDate(latest(entry.approvals)?.created_at ?? entry.updated_at)}`;
    case "rejected":
      return `Returned ${formatDate(latest(entry.approvals)?.created_at ?? entry.updated_at)}`;
    case "submitted":
    case "under_review":
      return `Submitted ${formatDate(entry.updated_at)}`;
    default:
      return `Created ${formatDate(entry.created_at)}`;
  }
}

interface WeekAccordionItemProps {
  entry: LogEntryListItem;
  /** Link to edit the week when it is still editable (student view). */
  editHref?: string;
}

export function WeekAccordionItem({ entry, editHref }: WeekAccordionItemProps) {
  return (
    <AccordionItem value={entry.id} className="rounded-2xl border-0 bg-surface data-[state=open]:p-1.5 sm:data-[state=open]:p-2">
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger className="group flex flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
          <span className="rounded-lg bg-card px-3 py-2 text-[0.8125rem] text-foreground transition-colors group-data-[state=open]:bg-foreground/80 group-data-[state=open]:text-background">
            Week {entry.week_number}
          </span>
          <span className="text-xs text-muted-foreground">{describeLatestEvent(entry)}</span>
          {/* Own line on phones (as in the mobile design), inline from sm up. */}
          <span className="order-last basis-full sm:order-none sm:basis-auto">
            <LogStatusBadge status={entry.status} />
          </span>
          <ChevronDown
            className="ml-auto mr-2 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionContent className="pb-0 pt-2">
        <div className="space-y-3 border-t pt-3">
          {editHref && isEditableStatus(entry.status) && (
            <div className="flex justify-end">
              <Button asChild variant="secondary" size="sm">
                <Link href={editHref}>
                  <PencilLine /> {entry.status === "rejected" ? "Revise & resubmit" : "Continue editing"}
                </Link>
              </Button>
            </div>
          )}
          <EntryDetails entryId={entry.id} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
