"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { can, type Permission } from "@/features/auth/permissions";
import { PageHeader } from "./PageHeader";

/** Renders children only for roles holding `permission`; mirrors the API's own checks. */
export function RoleGate({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { data: user } = useCurrentUser();
  if (can(user?.role, permission)) return <>{children}</>;

  return (
    <>
      <PageHeader title="Not available" />
      <div className="rounded-2xl bg-card">
        <EmptyState
          icon={ShieldAlert}
          title="Your role doesn't have access to this page"
          action={
            <Button asChild size="sm">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    </>
  );
}
