"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogbookStageBadge } from "@/components/atoms/StatusBadge";
import { UserAvatar } from "@/components/atoms/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlacementWithPeople } from "@/features/placements/types";
import { formatDate } from "@/lib/format";

function GradeBadge({ placement }: { placement: PlacementWithPeople }) {
  if (!placement.assessment) return null;
  return <Badge variant="success">Grade {placement.assessment.grade}</Badge>;
}

/** Logbooks waiting on (or handled by) a reviewer: a table on wide screens, tappable cards on phones. */
export function LogbookQueueTable({ placements }: { placements: PlacementWithPeople[] }) {
  const router = useRouter();
  const href = (p: PlacementWithPeople) => `/logbooks/${p.id}`;

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {placements.map((placement) => {
          const profile = placement.student?.student_profile;
          return (
            <li key={placement.id}>
              <Link
                href={href(placement)}
                className="flex items-center gap-3 rounded-xl bg-surface p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <UserAvatar name={placement.student?.full_name ?? "?"} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{placement.student?.full_name ?? "Unknown student"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[profile?.matric_number, profile?.department, placement.organization_name].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <LogbookStageBadge stage={placement.logbook_stage} />
                    <GradeBadge placement={placement} />
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <Table>
          <TableHeader className="bg-surface">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.map((placement) => {
              const profile = placement.student?.student_profile;
              return (
                <TableRow key={placement.id} className="cursor-pointer" onClick={() => router.push(href(placement))}>
                  <TableCell>
                    <Link
                      href={href(placement)}
                      className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserAvatar name={placement.student?.full_name ?? "?"} />
                      <span>
                        <span className="block">{placement.student?.full_name ?? "Unknown student"}</span>
                        <span className="block text-xs text-muted-foreground">{profile?.matric_number ?? placement.student?.email}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[14rem] text-xs">
                    <span className="block truncate">{profile?.institution ?? "—"}</span>
                    <span className="block truncate text-muted-foreground">{profile?.department}</span>
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate text-xs">{placement.organization_name}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(placement.logbook_stage_updated_at ?? placement.updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <LogbookStageBadge stage={placement.logbook_stage} />
                      <GradeBadge placement={placement} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
