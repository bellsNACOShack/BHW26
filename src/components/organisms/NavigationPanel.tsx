"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavLinkItem } from "@/components/molecules/NavLinkItem";
import { UserChip } from "@/components/molecules/UserChip";
import { useLogout } from "@/features/auth/hooks/useLogout";
import type { User } from "@/features/auth/types";
import { getNavItems, isActivePath } from "./navigation";

interface NavigationPanelProps {
  user: User;
  onNavigate?: () => void;
}

/** Nav links + user chip + sign-out, shared by the desktop sidebar and the mobile sheet. */
export function NavigationPanel({ user, onNavigate }: NavigationPanelProps) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Main" className="space-y-1">
        {getNavItems(user.role).map((item) => (
          <NavLinkItem key={item.href} {...item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto space-y-3 pt-8">
        <UserChip user={user} />
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3.5 py-1 text-[0.8125rem] text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </div>
    </div>
  );
}
