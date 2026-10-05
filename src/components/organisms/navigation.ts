import {
  BookOpenCheck,
  ClipboardCheck,
  Building2,
  FileCheck2,
  GraduationCap,
  Library,
  Home,
  NotebookText,
  ScrollText,
  Shapes,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, isSupervisor } from "@/features/auth/permissions";
import type { UserRole } from "@/features/auth/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navigation is derived from the same permission map that gates the pages. */
export function getNavItems(role: UserRole): NavItem[] {
  const items: NavItem[] = [{ href: "/dashboard", label: "Dashboard", icon: Home }];

  if (can(role, "manageOwnLogbook")) {
    items.push(
      { href: "/logbook", label: "Logbook", icon: NotebookText },
      { href: "/diagrams", label: "Diagrams", icon: Shapes },
      { href: "/placement", label: "Placement", icon: Building2 }
    );
  }
  if (can(role, "reviewEntries")) {
    items.push({ href: "/reviews", label: "Reviews", icon: ClipboardCheck });
  }
  if (role === "itf_verifier") {
    items.push(
      { href: "/itf/scaf", label: "SCAF submissions", icon: FileCheck2 },
      { href: "/itf/logbooks", label: "Logbook requests", icon: BookOpenCheck }
    );
  }
  if (role === "academic_supervisor") {
    items.push({ href: "/assessments", label: "Assessments", icon: GraduationCap });
  }
  if (role === "departmental_coordinator") {
    items.push({ href: "/department", label: "Department logbooks", icon: Library });
  }
  if (can(role, "browsePlacements")) {
    const studentsLabel = isSupervisor(role) || role === "itf_verifier" || role === "departmental_coordinator";
    items.push({ href: "/placements", label: studentsLabel ? "Students" : "Placements", icon: Users });
  }
  if (can(role, "viewAuditLogs")) {
    items.push({ href: "/audit-logs", label: "Audit logs", icon: ScrollText });
  }
  if (role === "administrator" || role === "itf_verifier") {
    items.push({ href: "/verify", label: "Verify a record", icon: ShieldCheck });
  }
  return items;
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
