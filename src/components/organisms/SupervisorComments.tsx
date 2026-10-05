import { ROLE_LABELS } from "@/features/auth/permissions";
import type { Approval } from "@/features/logbook/types";
import { formatDateTime } from "@/lib/format";

export function SupervisorComments({ approvals }: { approvals: Approval[] }) {
  const comments = approvals
    .filter((approval) => approval.comments?.trim())
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (comments.length === 0) return <p className="text-xs text-muted-foreground">No comments yet.</p>;

  return (
    <ul className="space-y-2">
      {comments.map((approval) => (
        <li key={approval.id} className="rounded-xl bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="text-brand">{approval.supervisor?.full_name ?? "Supervisor"}</span>
            {approval.supervisor && (
              <span className="text-muted-foreground"> · {ROLE_LABELS[approval.supervisor.role]}</span>
            )}
            <span className="ml-2 text-[0.6875rem] text-muted-foreground">{formatDateTime(approval.created_at)}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{approval.comments}</p>
        </li>
      ))}
    </ul>
  );
}
