"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlacementStatusBadge, ScafStatusBadge } from "@/components/atoms/StatusBadge";
import { UserAvatar } from "@/components/atoms/UserAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlacementWithPeople } from "@/features/placements/types";
import { formatDateRange } from "@/lib/format";

function supervisorsLabel(placement: PlacementWithPeople) {
  const names = [placement.workplace_supervisor?.full_name, placement.academic_supervisor?.full_name].filter(Boolean);
  return names.length ? names.join(", ") : "Unassigned";
}

/** Placements as a table on wide screens and as tappable cards on phones. */
export function PlacementsTable({ placements }: { placements: PlacementWithPeople[] }) {
  const router = useRouter();

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {placements.map((placement) => (
          <li key={placement.id}>
            <Link
              href={`/placements/${placement.id}`}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <UserAvatar name={placement.student?.full_name ?? "?"} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{placement.student?.full_name ?? "Unknown student"}</p>
                <p className="truncate text-xs text-muted-foreground">{placement.organization_name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <PlacementStatusBadge status={placement.status} />
                  <ScafStatusBadge status={placement.scaf_status} />
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <Table>
          <TableHeader className="bg-surface">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Supervisors</TableHead>
              <TableHead className="w-8">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.map((placement) => (
              <TableRow
                key={placement.id}
                className="cursor-pointer"
                onClick={() => router.push(`/placements/${placement.id}`)}
              >
                <TableCell>
                  <Link href={`/placements/${placement.id}`} className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:underline" onClick={(e) => e.stopPropagation()}>
                    <UserAvatar name={placement.student?.full_name ?? "?"} />
                    <span>
                      <span className="block">{placement.student?.full_name ?? "Unknown student"}</span>
                      <span className="block text-xs text-muted-foreground">{placement.student?.email}</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="max-w-[14rem] truncate">{placement.organization_name}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateRange(placement.start_date, placement.end_date)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <PlacementStatusBadge status={placement.status} />
                    <ScafStatusBadge status={placement.scaf_status} />
                  </div>
                </TableCell>
                <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">{supervisorsLabel(placement)}</TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
