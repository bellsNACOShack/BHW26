"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DiagramPicker } from "@/components/molecules/DiagramPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateLogEntry } from "@/features/logbook/hooks/useUpdateLogEntry";
import { LOG_STATUS_LABELS } from "@/features/logbook/lib/status";
import type { LogEntryListItem } from "@/features/logbook/types";
import { getErrorMessage } from "@/lib/api-client";

interface AddDiagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Weeks that can still be edited (draft or returned). */
  weeks: LogEntryListItem[];
  defaultEntryId?: string;
}

export function AddDiagramDialog({ open, onOpenChange, weeks, defaultEntryId }: AddDiagramDialogProps) {
  const [entryId, setEntryId] = useState(defaultEntryId ?? weeks[0]?.id ?? "");
  const [diagram, setDiagram] = useState<string | null>(null);
  const update = useUpdateLogEntry();
  const selected = weeks.find((w) => w.id === entryId);

  function close() {
    onOpenChange(false);
    setDiagram(null);
    update.reset();
  }

  function handleSave() {
    if (!selected || !diagram) return;
    update.mutate(
      { id: selected.id, supporting_evidence_url: diagram },
      {
        onSuccess: () => {
          toast.success(`Diagram added to Week ${selected.week_number}`);
          close();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : !update.isPending && close())}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Add diagram</DialogTitle>
          <DialogDescription className="text-xs">Each week holds one diagram; a new one replaces the existing diagram.</DialogDescription>
        </DialogHeader>

        {weeks.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
            Diagrams can only be added to draft or returned weeks.{" "}
            <Link href="/logbook/new" className="text-brand hover:underline" onClick={close}>
              Start a new week
            </Link>{" "}
            first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="diagram-week">Link to week</Label>
              <Select value={entryId} onValueChange={setEntryId}>
                <SelectTrigger id="diagram-week">
                  <SelectValue placeholder="Choose a week" />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((week) => (
                    <SelectItem key={week.id} value={week.id}>
                      Week {week.week_number} · {LOG_STATUS_LABELS[week.status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Diagram</p>
              <DiagramPicker value={diagram} onChange={setDiagram} disabled={update.isPending} />
            </div>
          </div>
        )}

        <DialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
          <Button variant="secondary" onClick={close} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selected || !diagram || update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            Save diagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
