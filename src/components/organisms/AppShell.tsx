import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/atoms/Logo";
import type { User } from "@/features/auth/types";
import { NavigationPanel } from "./NavigationPanel";

/** Authenticated layout: fixed sidebar on desktop, grey content well holding page cards. */
export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col px-4 py-6 lg:flex xl:w-64">
        <Link href="/dashboard" aria-label="Inter.log dashboard" className="mb-8 inline-flex w-fit px-2">
          <LogoMark />
        </Link>
        <NavigationPanel user={user} />
      </aside>
      <main id="main" className="min-w-0 flex-1 p-2 sm:p-3 lg:py-5 lg:pl-0 lg:pr-5">
        <div className="mx-auto min-h-[calc(100dvh-1rem)] max-w-6xl space-y-3 rounded-3xl bg-surface p-2 sm:min-h-[calc(100dvh-1.5rem)] sm:p-3 lg:min-h-[calc(100dvh-2.5rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
