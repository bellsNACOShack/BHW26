import { cn } from "@/lib/utils";

/** Decorative closed logbook used on confirmation dialogs. */
export function LogbookIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" aria-hidden="true" className={cn("h-28 w-auto", className)}>
      <defs>
        <linearGradient id="logbook-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#33466f" />
          <stop offset="1" stopColor="#1b2a4a" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="128" rx="46" ry="6" fill="#0f172a" opacity="0.08" />
      <g transform="rotate(14 80 70)">
        <rect x="46" y="14" width="72" height="104" rx="8" fill="#d9dde6" />
        <rect x="42" y="10" width="72" height="104" rx="8" fill="url(#logbook-cover)" />
        <rect x="42" y="10" width="10" height="104" rx="4" fill="#15213b" opacity="0.6" />
        <rect x="62" y="30" width="38" height="3" rx="1.5" fill="#8fa2c7" opacity="0.7" />
        <rect x="62" y="38" width="28" height="3" rx="1.5" fill="#8fa2c7" opacity="0.5" />
        <rect x="62" y="84" width="34" height="3" rx="1.5" fill="#8fa2c7" opacity="0.5" />
        <path d="M86 96l5 5 10-11" fill="none" stroke="#8fa2c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
