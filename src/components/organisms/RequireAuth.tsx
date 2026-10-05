"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FullPageLoader } from "@/components/atoms/FullPageLoader";
import { ErrorState } from "@/components/molecules/ErrorState";
import { useAuthToken } from "@/features/auth/hooks/useAuthToken";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { User } from "@/features/auth/types";

/**
 * Protects authenticated routes. The API issues bearer tokens kept in web storage,
 * so the check happens on the client: no token → /login, then the profile is
 * loaded from GET /api/auth/me before rendering.
 */
export function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
  const token = useAuthToken();
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, error, refetch } = useCurrentUser();

  useEffect(() => {
    if (token === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [token, router, pathname]);

  if (token && error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <ErrorState error={error} title="We couldn't load your account" onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!token || !user) return <FullPageLoader />;
  return <>{children(user)}</>;
}
