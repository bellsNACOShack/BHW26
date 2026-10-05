import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IconTile, type IconTone } from "@/components/atoms/IconTile";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: IconTone;
  /** Progress bar, badge or link rendered under the value. */
  footer?: ReactNode;
  loading?: boolean;
}

export function StatCard({ label, value, icon, tone, footer, loading }: StatCardProps) {
  return (
    <div className="flex min-h-[7.5rem] flex-col rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <IconTile icon={icon} tone={tone} />
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ) : (
        <>
          <p className="mt-2 text-xl tracking-tight text-foreground">{value}</p>
          {footer && <div className="mt-auto pt-2">{footer}</div>}
        </>
      )}
    </div>
  );
}
