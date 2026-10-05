import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center justify-center gap-2 text-xs sm:text-sm" aria-label="Sign-up progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={step}>
            {index > 0 && <li aria-hidden className="h-px w-6 bg-muted-foreground/50 sm:w-10" />}
            <li
              className={cn("flex items-center gap-1.5", active ? "text-foreground" : "text-muted-foreground")}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "inline-flex size-3.5 items-center justify-center rounded-full sm:size-4",
                  done ? "bg-success text-white" : active ? "bg-foreground/80" : "bg-muted-foreground/40"
                )}
              >
                {done && <Check className="size-2.5" strokeWidth={3} aria-hidden />}
              </span>
              {step}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
