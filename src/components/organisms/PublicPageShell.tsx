import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/atoms/Logo";

/** Layout for public pages (verification) reachable without an account. */
export function PublicPageShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 pb-10 pt-8 sm:pt-12">
      <Link href="/" className="mb-6 flex items-center gap-2 text-2xl tracking-tight text-brand sm:mb-8 sm:text-[2rem]">
        <LogoMark className="size-7 sm:size-8" />
        Inter.log
      </Link>
      <div className="w-full max-w-2xl rounded-3xl bg-surface/70 p-2 sm:p-3">
        <section className="rounded-2xl bg-card px-4 py-6 sm:px-8 sm:py-8">
          <h1 className="text-xl tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
