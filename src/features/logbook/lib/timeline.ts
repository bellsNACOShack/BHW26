import type { AuditLog } from "@/features/audit/types";
import { getAuditActionLabel } from "@/features/audit/lib/labels";
import { ROLE_LABELS } from "@/features/auth/permissions";
import type { LogEntryDetail, ReviewAction } from "../types";

export interface TimelineEvent {
  id: string;
  at: string;
  actor: string;
  actorRole?: string;
  description: string;
  /** Final, integrity-relevant events (signing) are highlighted. */
  highlight?: boolean;
}

const REVIEW_LABELS: Record<ReviewAction, string> = {
  approve: "Approved entry",
  reject: "Returned entry for revision",
  request_changes: "Requested changes",
};

/**
 * Timeline reconstructed from the entry itself (creation, reviews, signatures).
 * Used for students, who cannot read /api/audit-logs.
 */
export function buildEntryTimeline(entry: LogEntryDetail): TimelineEvent[] {
  const studentName = entry.student?.full_name ?? "Student";
  const events: TimelineEvent[] = [
    { id: `${entry.id}-created`, at: entry.created_at, actor: studentName, actorRole: "Student", description: "Created entry" },
  ];

  // Submitting is the last write a submitted entry receives, so updated_at marks it.
  if ((entry.status === "submitted" || entry.status === "under_review") && entry.approvals.length === 0) {
    events.push({
      id: `${entry.id}-submitted`,
      at: entry.updated_at,
      actor: studentName,
      actorRole: "Student",
      description: "Submitted for review",
    });
  }

  for (const approval of entry.approvals) {
    events.push({
      id: approval.id,
      at: approval.created_at,
      actor: approval.supervisor?.full_name ?? "Supervisor",
      actorRole: approval.supervisor ? ROLE_LABELS[approval.supervisor.role] : undefined,
      description: approval.comments ? `${REVIEW_LABELS[approval.action]} with a comment` : REVIEW_LABELS[approval.action],
    });
  }

  for (const signature of entry.signatures) {
    events.push({
      id: signature.id,
      at: signature.created_at,
      actor: signature.user?.full_name ?? "Supervisor",
      actorRole: signature.user ? ROLE_LABELS[signature.user.role] : undefined,
      description: "Signed and locked record",
      highlight: true,
    });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

/** Timeline from the tamper-evident audit log (staff with audit access). */
export function auditLogsToTimeline(logs: AuditLog[]): TimelineEvent[] {
  return logs
    .map((log) => ({
      id: log.id,
      at: log.created_at,
      actor: log.user?.full_name ?? "System",
      actorRole: log.user ? ROLE_LABELS[log.user.role] : undefined,
      description: getAuditActionLabel(log.action),
      highlight: log.action === "LOG_ENTRY_SIGNED_AND_LOCKED",
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}
