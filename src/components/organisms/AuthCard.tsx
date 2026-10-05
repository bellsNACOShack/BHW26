import type { ReactNode } from "react";
import { LogoMark } from "@/components/atoms/Logo";

interface AuthCardProps {
  /** Brand heading above the card, e.g. "Welcome to Inter.log". */
  heading: string;
  title: string;
  description?: ReactNode;
  /** Rendered above the title (e.g. a stepper). */
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered auth layout from the Figma sign-in / sign-up screens. */
export function AuthCard({ heading, title, description, aside, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 pb-10 pt-8 sm:pt-12">
      <p className="mb-6 flex items-center gap-2 text-2xl tracking-tight text-brand sm:mb-8 sm:text-[2rem]">
        <LogoMark className="size-7 sm:size-8" />
        {heading}
      </p>
      <div className="w-full max-w-xl rounded-3xl bg-surface/70 px-5 py-7 sm:px-10 sm:py-9">
        <div className="mx-auto w-full max-w-sm">
          {aside && <div className="mb-6">{aside}</div>}
          <div className="mb-6 text-center">
            <h1 className="text-lg tracking-tight text-foreground sm:text-xl">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
          {footer && <div className="mt-3 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
