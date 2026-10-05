"use client";

import { toast } from "sonner";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { AssignSupervisorsCard } from "@/components/organisms/AssignSupervisorsCard";
import { EditPlacementDialog } from "@/components/organisms/EditPlacementDialog";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { PlacementForm } from "@/components/organisms/PlacementForm";
import { PlacementOverview } from "@/components/organisms/PlacementOverview";
import { ScafSubmissionCard } from "@/components/organisms/ScafSubmissionCard";
import { VerificationCard } from "@/components/organisms/VerificationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLogbook } from "@/features/logbook/hooks/useMyLogbook";
import { isApprovedStatus } from "@/features/logbook/lib/status";

/** The student's own placement: details, supervisors, SCAF progress and verification. */
function PlacementContent() {
  const { placement, entries, isLoading, error, refetch } = useMyLogbook();

  return (
    <>
      <PageHeader title="Placement" description="Your SIWES organization, supervisors and records" />
      {isLoading ? (
        <Skeleton className="h-80 rounded-2xl bg-card" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} className="rounded-2xl bg-card" />
      ) : !placement ? (
        <SectionCard title="Add your SIWES placement" description="Your organization and training dates.">
          <div className="max-w-lg">
            <PlacementForm onSuccess={() => toast.success("Placement created")} />
          </div>
        </SectionCard>
      ) : (
        <>
          <PlacementOverview placement={placement} actions={<EditPlacementDialog placement={placement} />} />
          <div className="grid gap-3 lg:grid-cols-2">
            <AssignSupervisorsCard placement={placement} />
            <ScafSubmissionCard placement={placement} />
          </div>
          <VerificationCard
            placementId={placement.id}
            approvedWeeks={(entries ?? []).filter((e) => isApprovedStatus(e.status)).length}
          />
        </>
      )}
    </>
  );
}

export function PlacementPage() {
  return (
    <RoleGate permission="manageOwnLogbook">
      <PlacementContent />
    </RoleGate>
  );
}
