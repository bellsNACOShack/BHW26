"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DiagramThumbnailProps {
  src: string;
  /** Overlay caption, e.g. "Week 2". */
  caption?: string;
  onRemove?: () => void;
  className?: string;
}

/** Image thumbnail that opens a full-size preview; optional remove control. */
export function DiagramThumbnail({ src, caption, onRemove, className }: DiagramThumbnailProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-secondary", className)}>
      <Dialog>
        <DialogTrigger
          className="block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={caption ? `Open ${caption} diagram` : "Open diagram"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data URLs aren't supported by next/image */}
          <img src={src} alt="" className="size-full object-cover" />
          {caption && (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[0.625rem] text-white backdrop-blur-sm">
              {caption}
            </span>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-3xl p-3 sm:p-4">
          <DialogTitle className="sr-only">{caption ?? "Diagram"}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption ? `${caption} diagram` : "Week diagram"} className="max-h-[80dvh] w-full rounded-xl object-contain" />
        </DialogContent>
      </Dialog>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove diagram"
          className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-white text-foreground shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
