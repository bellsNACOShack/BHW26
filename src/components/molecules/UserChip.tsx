import { UserAvatar } from "@/components/atoms/UserAvatar";
import { ROLE_LABELS } from "@/features/auth/permissions";
import type { User } from "@/features/auth/types";

export function UserChip({ user }: { user: User }) {
  const subtitle = user.student_profile?.institution ?? ROLE_LABELS[user.role];
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5">
      <UserAvatar name={user.full_name} src={user.avatar_url} />
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] text-foreground">{user.full_name}</p>
        <p className="truncate text-[0.625rem] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
