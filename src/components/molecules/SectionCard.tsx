import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Rendered beside the title (e.g. a status badge). */
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Draw the hairline between header and content (Figma default). */
  divided?: boolean;
}

/** White content card used inside the grey page well. */
export function SectionCard({
  title,
  description,
  badge,
  actions,
  children,
  className,
  contentClassName,
  divided = true,
}: SectionCardProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={cn("rounded-2xl bg-card p-4 sm:p-5", className)}>
      {hasHeader && (
        <header
          className={cn("flex flex-wrap items-start justify-between gap-3", divided ? "mb-4 border-b pb-4" : "mb-3")}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {title && <h2 className="text-lg tracking-tight text-foreground sm:text-xl">{title}</h2>}
              {badge}
            </div>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
