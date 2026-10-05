import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { NotificationBell } from "./NotificationBell";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small trail rendered above the title (e.g. breadcrumbs). */
  eyebrow?: ReactNode;
}

/** Top white card of every app page; hosts the mobile menu trigger below `lg`. */
export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="rounded-2xl bg-card px-4 py-5 sm:px-5 sm:py-7">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="mb-1">{eyebrow}</div>}
          <h1 className="text-2xl tracking-tight text-foreground sm:text-[1.875rem] sm:leading-tight">{title}</h1>
          {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>}
        <NotificationBell />
        <MobileNav className="lg:hidden" />
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2 sm:hidden">{actions}</div>}
    </header>
  );
}
