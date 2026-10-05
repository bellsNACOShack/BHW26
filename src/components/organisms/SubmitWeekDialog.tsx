"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { LogbookIllustration } from "@/components/atoms/LogbookIllustration";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface SubmitWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekNumber: number;
  supervisorName: string | null;
  organizationName: string;
  pending: boolean;
  onConfirm: () => void;
}

export function SubmitWeekDialog({
  open,
  onOpenChange,
  weekNumber,
  supervisorName,
  organizationName,
  pending,
  onConfirm,
}: SubmitWeekDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] gap-5 px-5 py-8 sm:max-w-xl sm:px-12">
        <AlertDialogHeader className="items-center space-y-1 text-center sm:text-center">
          <LogbookIllustration className="mb-2 h-24 sm:h-32" />
          <AlertDialogTitle className="text-xl font-medium tracking-tight sm:text-[1.75rem] sm:leading-tight">
            Submit Week {weekNumber} Logbook Entry?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-[0.9375rem]">
            {supervisorName
              ? `Once submitted, this week's entry will be sent to ${supervisorName} at ${organizationName} for official review and biometric sign-off.`
              : `No workplace supervisor is assigned to your placement yet. The entry will wait in "Submitted" until a supervisor is assigned and reviews it.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-left text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          You will not be able to edit these daily logs while they are under review unless your supervisor requests a
          revision.
        </p>
        <AlertDialogFooter className="grid grid-cols-1 gap-3 space-x-0 sm:grid-cols-2 sm:space-x-0">
          <Button variant="secondary" size="lg" className="w-full" onClick={() => onOpenChange(false)} disabled={pending}>
            Keep editing
          </Button>
          <Button size="lg" className="w-full" onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Confirm &amp; submit logbook
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
