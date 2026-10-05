"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteLogEntry } from "@/features/logbook/hooks/useDeleteLogEntry";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface DeleteDraftButtonProps {
  entryId: string;
  weekNumber: number;
  onDeleted?: () => void;
  className?: string;
}

export function DeleteDraftButton({ entryId, weekNumber, onDeleted, className }: DeleteDraftButtonProps) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteLogEntry();

  function handleDelete() {
    remove.mutate(entryId, {
      onSuccess: () => {
        setOpen(false);
        toast.success(`Week ${weekNumber} draft deleted`);
        onDeleted?.();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !remove.isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className={cn("text-destructive hover:bg-destructive-soft hover:text-destructive", className)}>
          <Trash2 /> Delete draft
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the Week {weekNumber} draft?</AlertDialogTitle>
          <AlertDialogDescription>
            The daily logs and diagram saved for this week will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
            {remove.isPending && <Loader2 className="animate-spin" />}
            Delete draft
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
