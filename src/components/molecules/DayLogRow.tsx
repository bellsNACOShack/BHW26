"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DayLogRowProps {
  /** Label shown in the chip, e.g. "Monday". */
  day: string;
  /** Secondary chip text, e.g. the day's date. */
  sublabel?: string;
  value: string;
  /** When omitted the row is read-only. */
  onChange?: (value: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
  placeholder?: string;
  emptyLabel?: string;
}

/** Collapsible row holding one day's log (Figma "Daily Logs" rows). */
export function DayLogRow({
  day,
  sublabel,
  value,
  onChange,
  disabled,
  defaultOpen = false,
  placeholder,
  emptyLabel = "No entry yet",
}: DayLogRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const textareaId = useId();
  const editable = Boolean(onChange) && !disabled;
  const hasValue = value.trim().length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl bg-surface p-1.5">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        <span className="w-[5.5rem] shrink-0 rounded-lg bg-card px-2.5 py-2 text-xs text-foreground sm:w-24 sm:text-[0.8125rem]">
          {day}
          {sublabel && <span className="block text-[0.6875rem] text-muted-foreground">{sublabel}</span>}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs sm:text-[0.8125rem]",
            hasValue ? "text-foreground/80" : "text-muted-foreground/70"
          )}
        >
          {hasValue ? value : emptyLabel}
        </span>
        <ChevronDown
          className={cn("mr-2 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="pt-1.5">
          {editable ? (
            <>
              <label htmlFor={textareaId} className="sr-only">
                {day} log
              </label>
              <Textarea
                id={textareaId}
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                placeholder={placeholder ?? `What did you work on on ${day}?`}
                className="min-h-[7rem] border-transparent"
              />
            </>
          ) : (
            <p className="whitespace-pre-wrap rounded-xl bg-card px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-foreground/85">
              {hasValue ? value : emptyLabel}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
