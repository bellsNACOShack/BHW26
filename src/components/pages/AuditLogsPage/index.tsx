"use client";

import { Loader2, ScrollText } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { PageHeader } from "@/components/organisms/PageHeader";
import { RoleGate } from "@/components/organisms/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs } from "@/features/audit/hooks/useAuditLogs";
import { RESOURCE_TYPE_LABELS, getAuditActionLabel } from "@/features/audit/lib/labels";
import type { AuditLog, AuditResourceType } from "@/features/audit/types";
import { ROLE_LABELS } from "@/features/auth/permissions";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 50;

function Actor({ log }: { log: AuditLog }) {
  return (
    <span>
      <span className="block text-foreground">{log.user?.full_name ?? "System"}</span>
      {log.user && <span className="block text-xs text-muted-foreground">{ROLE_LABELS[log.user.role]}</span>}
    </span>
  );
}

function Resource({ log }: { log: AuditLog }) {
  return (
    <span>
      <span className="block">{RESOURCE_TYPE_LABELS[log.resource_type] ?? log.resource_type}</span>
      <code className="block max-w-[12rem] truncate text-[0.6875rem] text-muted-foreground" title={log.resource_id}>
        {log.resource_id}
      </code>
    </span>
  );
}

function AuditLogsContent() {
  const [resourceType, setResourceType] = useState<AuditResourceType | "all">("all");
  const [resourceId, setResourceId] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredId = useDeferredValue(resourceId.trim());

  const { data: logs, isLoading, isFetching, error, refetch } = useAuditLogs({
    resource_type: resourceType === "all" ? undefined : resourceType,
    resource_id: deferredId || undefined,
    limit,
  });
  // The API supports a row limit but no offset, so "show more" raises the limit.
  const hasMore = (logs?.length ?? 0) >= limit;

  return (
    <>
      <PageHeader title="Audit logs" description="Tamper-evident record of every important action" />
      <SectionCard>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Select
            value={resourceType}
            onValueChange={(value) => {
              setResourceType(value as AuditResourceType | "all");
              setLimit(PAGE_SIZE);
            }}
          >
            <SelectTrigger className="sm:w-48" aria-label="Filter by resource">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={resourceId}
            onChange={(e) => {
              setResourceId(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Filter by exact resource ID"
            spellCheck={false}
            aria-label="Resource ID"
            className="font-mono text-xs md:text-xs"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !logs?.length ? (
          <EmptyState icon={ScrollText} title="No audit records match these filters" />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {logs.map((log) => (
                <li key={log.id} className="space-y-1.5 rounded-xl bg-surface p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{getAuditActionLabel(log.action)}</p>
                    <time dateTime={log.created_at} className="shrink-0 text-[0.6875rem] text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </time>
                  </div>
                  <Actor log={log} />
                  <Resource log={log} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <Table>
                <TableHeader className="bg-surface">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                      <TableCell>{getAuditActionLabel(log.action)}</TableCell>
                      <TableCell>
                        <Actor log={log} />
                      </TableCell>
                      <TableCell>
                        <Resource log={log} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ip_address ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)} disabled={isFetching}>
                  {isFetching && <Loader2 className="animate-spin" />}
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </>
  );
}

export function AuditLogsPage() {
  return (
    <RoleGate permission="viewAuditLogs">
      <AuditLogsContent />
    </RoleGate>
  );
}
