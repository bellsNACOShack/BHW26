import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  blue: "bg-sky-100 text-sky-700",
  green: "bg-success-soft text-success",
  violet: "bg-info-soft text-info",
  amber: "bg-warning-soft text-amber-600",
  neutral: "bg-secondary text-muted-foreground",
} as const;

export type IconTone = keyof typeof TONES;

interface IconTileProps {
  icon: LucideIcon;
  tone?: IconTone;
  className?: string;
}

/** Small tinted circle holding an icon (Figma stat-card corner icons). */
export function IconTile({ icon: Icon, tone = "neutral", className }: IconTileProps) {
  return (
    <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full", TONES[tone], className)}>
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
