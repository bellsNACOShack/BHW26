"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED_DIAGRAM_TYPES, prepareDiagram } from "@/features/logbook/lib/diagram";
import { cn } from "@/lib/utils";
import { DiagramThumbnail } from "./DiagramThumbnail";

interface DiagramPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
}

/** "Attach diagram or sketch" control. Converts the chosen image into a storable data URL. */
export function DiagramPicker({ value, onChange, disabled, className }: DiagramPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      onChange(await prepareDiagram(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "This image could not be attached.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap">
        {value && (
          <DiagramThumbnail src={value} onRemove={disabled ? undefined : () => onChange(null)} className="size-16" />
        )}
        <button
          type="button"
          disabled={disabled || processing}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!disabled) void handleFile(event.dataTransfer.files[0]);
          }}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl border bg-surface p-1.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
            {processing ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-foreground">
              {value ? "Replace diagram or sketch" : "Attach diagram or sketch"}
            </span>
            <span className="block text-xs text-muted-foreground">PNG, JPG, WEBP, SVG · up to 10 MB</span>
          </span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_DIAGRAM_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
