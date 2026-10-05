import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { PlacementStatusBadge, ScafStatusBadge } from "@/components/atoms/StatusBadge";
import { DetailList } from "@/components/molecules/DetailList";
import { SectionCard } from "@/components/molecules/SectionCard";
import { getTotalWeeks } from "@/features/logbook/lib/weeks";
import type { PlacementWithPeople } from "@/features/placements/types";
import { formatDateRange } from "@/lib/format";

interface PlacementOverviewProps {
  placement: PlacementWithPeople;
  actions?: ReactNode;
  /** Show the student row (staff views). */
  showStudent?: boolean;
}

export function PlacementOverview({ placement, actions, showStudent }: PlacementOverviewProps) {
  return (
    <SectionCard
      title={placement.organization_name}
      description="SIWES placement"
      badge={
        <>
          <PlacementStatusBadge status={placement.status} />
          <ScafStatusBadge status={placement.scaf_status} />
        </>
      }
      actions={actions}
    >
      <DetailList
        items={[
          ...(showStudent
            ? [{ label: "Student", value: placement.student ? `${placement.student.full_name} · ${placement.student.email}` : "—" }]
            : []),
          { label: "Address", value: placement.organization_address },
          {
            label: "ITF office",
            value: placement.itf_office ? (
              `${placement.itf_office.name}, ${placement.itf_office.city}`
            ) : (
              <span className="text-muted-foreground">Add the organization&apos;s state to route it</span>
            ),
          },
          {
            label: "Duration",
            value: `${formatDateRange(placement.start_date, placement.end_date)} · ${getTotalWeeks(placement)} weeks`,
          },
          {
            label: "Acceptance letter",
            value: placement.acceptance_letter_url ? (
              <a
                href={placement.acceptance_letter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                View letter <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : (
              <span className="text-muted-foreground">Not provided</span>
            ),
          },
          {
            label: "Workplace supervisor",
            value: placement.workplace_supervisor?.full_name ?? <span className="text-muted-foreground">Not assigned</span>,
          },
          {
            label: "Academic supervisor",
            value: placement.academic_supervisor?.full_name ?? <span className="text-muted-foreground">Not assigned</span>,
          },
        ]}
      />
    </SectionCard>
  );
}
