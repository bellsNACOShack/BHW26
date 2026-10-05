"use client";

import { PencilLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Placement } from "@/features/placements/types";
import { PlacementForm } from "./PlacementForm";

export function EditPlacementDialog({ placement }: { placement: Placement }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <PencilLine /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Edit placement</DialogTitle>
          <DialogDescription className="text-xs">Training dates are fixed once the placement is created.</DialogDescription>
        </DialogHeader>
        <PlacementForm
          placement={placement}
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            toast.success("Placement updated");
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
