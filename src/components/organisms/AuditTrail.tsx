import type { TimelineEvent } from "@/features/logbook/lib/timeline";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AuditTrail({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-xs text-muted-foreground">No activity recorded yet.</p>;

  return (
    <ol className="relative space-y-5">
      <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
      {events.map((event) => (
        <li key={event.id} className="relative flex gap-3">
          <span
            aria-hidden
            className={cn(
              "relative mt-1 size-[11px] shrink-0 rounded-full ring-4 ring-card",
              event.highlight ? "bg-success" : "bg-muted-foreground/45"
            )}
          />
          <div className="min-w-0 text-[0.8125rem] leading-snug">
            <time dateTime={event.at} className="block text-[0.6875rem] text-muted-foreground">
              {formatDateTime(event.at)}
            </time>
            <p className="text-foreground">
              {event.actor}
              {event.actorRole && <span className="text-muted-foreground"> · {event.actorRole}</span>}
            </p>
            <p className="text-foreground/75">{event.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
