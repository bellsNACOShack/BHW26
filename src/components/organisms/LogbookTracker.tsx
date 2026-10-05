import { Check, X } from "lucide-react";
import { getTotalWeeks } from "@/features/logbook/lib/weeks";
import { hasReachedStage, type LogbookEventAction } from "@/features/placements/lib/lifecycle";
import type { LogbookEvent, PlacementDetail } from "@/features/placements/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "rejected" | "todo";

interface Step {
  label: string;
  state: StepState;
  detail: string;
}

function latest(events: LogbookEvent[], action: LogbookEventAction) {
  return [...events].reverse().find((e) => e.action === action);
}

function by(event: LogbookEvent | undefined) {
  return event ? `${event.actor?.full_name ?? "Unknown"} · ${formatDate(event.created_at)}` : "";
}

/** The logbook's chain of custody: Industry → ITF → Academic → Department → ITF archive. */
export function getLogbookSteps(placement: PlacementDetail): Step[] {
  const stage = placement.logbook_stage;
  const events = placement.logbook_events ?? [];
  const totalWeeks = getTotalWeeks(placement);
  const signedWeeks = placement.log_entries.filter((e) => e.status === "locked").length;
  const industryDone = signedWeeks >= totalWeeks || stage !== "in_progress";

  const itfDone = hasReachedStage(stage, "itf_approved");
  const academicDone = hasReachedStage(stage, "academic_completed");
  const departmentDone = hasReachedStage(stage, "department_received");
  const archived = stage === "archived";
  const grade = placement.assessment;

  return [
    {
      label: "Industry supervisor",
      state: industryDone ? "done" : "active",
      detail: industryDone
        ? `All ${totalWeeks} weeks signed`
        : `${signedWeeks} of ${totalWeeks} weeks signed by ${placement.workplace_supervisor?.full_name ?? "your industry supervisor"}`,
    },
    {
      label: "ITF officer",
      state: itfDone ? "done" : stage === "itf_rejected" ? "rejected" : industryDone && stage !== "in_progress" ? "active" : "todo",
      detail: itfDone
        ? `Approved & signed · ${by(latest(events, "itf_approved"))}`
        : stage === "itf_rejected"
          ? `Returned for correction · ${by(latest(events, "itf_rejected"))}`
          : stage === "itf_review"
            ? `Under review at ${placement.itf_office?.name ?? "the ITF office"}`
            : stage === "itf_submitted"
              ? `Submitted to ${placement.itf_office?.name ?? "the ITF office"}`
              : placement.itf_office
                ? `Reviewed by ${placement.itf_office.name}`
                : "Add your organization's state to route it to an ITF office",
    },
    {
      label: "Academic supervisor",
      state: academicDone ? "done" : hasReachedStage(stage, "academic_submitted") ? "active" : "todo",
      detail: academicDone
        ? `Signed & graded${grade ? ` · Grade ${grade.grade} (${grade.score})` : ""} · ${by(latest(events, "academic_signed"))}`
        : hasReachedStage(stage, "academic_submitted")
          ? grade
            ? `Graded ${grade.grade}, awaiting signature`
            : `With ${placement.academic_supervisor?.full_name ?? "your academic supervisor"} for review`
          : `Signs and grades the logbook${placement.academic_supervisor ? ` · ${placement.academic_supervisor.full_name}` : ""}`,
    },
    {
      label: "Department",
      state: departmentDone ? "done" : stage === "department_submitted" ? "active" : "todo",
      detail: departmentDone
        ? `Received for departmental records · ${by(latest(events, "department_received"))}`
        : stage === "department_submitted"
          ? `Submitted ${formatDate(latest(events, "submitted_to_department")?.created_at ?? null)}, awaiting the coordinator`
          : "Keeps the record for assessment and defense",
    },
    {
      label: "ITF archive",
      state: archived ? "done" : "todo",
      detail: archived ? `Archived · ${by(latest(events, "archived"))}` : "Final submission for permanent storage",
    },
  ];
}

export function LogbookTracker({ placement, className }: { placement: PlacementDetail; className?: string }) {
  const steps = getLogbookSteps(placement);
  return (
    <ol className={cn("space-y-3", className)} aria-label="Logbook verification progress">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-3" aria-current={step.state === "active" ? "step" : undefined}>
          <span
            className={cn(
              "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
              step.state === "done" && "bg-success text-white",
              step.state === "rejected" && "bg-destructive text-white",
              step.state === "active" && "border-2 border-info bg-info-soft",
              step.state === "todo" && "border bg-secondary"
            )}
          >
            {step.state === "done" && <Check className="size-3" strokeWidth={3} aria-hidden />}
            {step.state === "rejected" && <X className="size-3" strokeWidth={3} aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm", step.state === "todo" ? "text-muted-foreground" : "text-foreground")}>
              {step.label}
              <span className="sr-only">
                {" "}
                ({{ done: "complete", active: "in progress", rejected: "returned", todo: "not started" }[step.state]})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
