"use client";

import { Building2, ImagePlus, Shapes } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { LogStatusBadge } from "@/components/atoms/StatusBadge";
import { DiagramThumbnail } from "@/components/molecules/DiagramThumbnail";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { AddDiagramDialog } from "@/components/organisms/AddDiagramDialog";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLogbook } from "@/features/logbook/hooks/useMyLogbook";
import { useUpdateLogEntry } from "@/features/logbook/hooks/useUpdateLogEntry";
import { isDisplayableImage } from "@/features/logbook/lib/diagram";
import { isEditableStatus } from "@/features/logbook/lib/status";
import { getErrorMessage } from "@/lib/api-client";
import { pluralize } from "@/lib/format";

function DiagramsContent() {
  const { placement, entries, isLoading, error, refetch } = useMyLogbook();
  const update = useUpdateLogEntry();
  const [dialog, setDialog] = useState<{ open: boolean; entryId?: string }>({ open: false });

  const weeks = entries ?? [];
  const withDiagram = weeks.filter((e) => isDisplayableImage(e.supporting_evidence_url));
  const editableWeeks = weeks.filter((e) => isEditableStatus(e.status));
  // Show weeks that have a diagram, plus editable weeks that can still take one.
  const visibleWeeks = weeks.filter((e) => isDisplayableImage(e.supporting_evidence_url) || isEditableStatus(e.status));

  function removeDiagram(entryId: string, weekNumber: number) {
    update.mutate(
      { id: entryId, supporting_evidence_url: null },
      {
        onSuccess: () => toast.success(`Diagram removed from Week ${weekNumber}`),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  const openDialog = (entryId?: string) => setDialog({ open: true, entryId });

  return (
    <>
      <PageHeader
        title="Diagrams"
        description={
          <>
            <span className="text-foreground">{withDiagram.length}</span> {withDiagram.length === 1 ? "diagram" : "diagrams"} across{" "}
            <span className="text-foreground">{withDiagram.length}</span> {withDiagram.length === 1 ? "week" : "weeks"}
          </>
        }
        actions={placement ? <Button onClick={() => openDialog()}>Add diagram</Button> : undefined}
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl bg-card" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} className="rounded-2xl bg-card" />
      ) : !placement ? (
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
      ) : visibleWeeks.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="No diagrams yet"
          action={<Button onClick={() => openDialog()}>Add diagram</Button>}
          description="Add a diagram and link it to a week, or attach one while writing a weekly log."
          className="rounded-2xl bg-card"
        />
      ) : (
        visibleWeeks.map((entry) => {
          const hasDiagram = isDisplayableImage(entry.supporting_evidence_url);
          const editable = isEditableStatus(entry.status);
          return (
            <section key={entry.id} className="rounded-2xl bg-card p-4 sm:p-5">
              <header className="mb-3 flex items-center gap-2">
                <div>
                  <h2 className="text-lg tracking-tight">Week {entry.week_number}</h2>
                  <p className="text-xs text-muted-foreground">{pluralize(hasDiagram ? 1 : 0, "diagram")}</p>
                </div>
                <LogStatusBadge status={entry.status} className="self-start" />
              </header>
              <div className="flex flex-wrap gap-3 rounded-xl bg-surface p-3">
                {hasDiagram && (
                  <DiagramThumbnail
                    src={entry.supporting_evidence_url!}
                    caption={`Week ${entry.week_number}`}
                    onRemove={editable && !update.isPending ? () => removeDiagram(entry.id, entry.week_number) : undefined}
                    className="size-28 sm:size-32"
                  />
                )}
                {editable && (
                  <button
                    type="button"
                    onClick={() => openDialog(entry.id)}
                    className="flex size-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-card text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:size-32 sm:text-sm"
                  >
                    <ImagePlus className="size-5" aria-hidden />
                    {hasDiagram ? "Replace diagram" : "Add diagram"}
                  </button>
                )}
              </div>
            </section>
          );
        })
      )}

      {dialog.open && (
        <AddDiagramDialog
          open
          onOpenChange={(open) => setDialog({ open })}
          weeks={editableWeeks}
          defaultEntryId={dialog.entryId}
        />
      )}
    </>
  );
}

export function DiagramsPage() {
  return (
    <RoleGate permission="manageOwnLogbook">
      <DiagramsContent />
    </RoleGate>
  );
}
