import { cn } from "@/lib/utils";

/** Inter.log brand mark: a navy globe with three openings. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 text-brand", className)}>
      <circle cx="16" cy="16" r="15" fill="currentColor" />
      <circle cx="20.5" cy="10.5" r="5.5" fill="white" />
      <circle cx="9.5" cy="19" r="3" fill="white" />
      <circle cx="18" cy="23.5" r="3.5" fill="white" />
    </svg>
  );
}
