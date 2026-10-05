"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/atoms/FullPageLoader";
import { AuthCard } from "@/components/organisms/AuthCard";
import { LoginForm } from "@/components/organisms/LoginForm";
import { useAuthToken } from "@/features/auth/hooks/useAuthToken";

/** Only allow in-app relative redirects after sign-in. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthToken();
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    if (token) router.replace(next);
  }, [token, next, router]);

  if (token !== null) return <FullPageLoader />;

  return (
    <AuthCard
      heading="Continue to Inter.log"
      title="Welcome back!"
      description="Please sign in to access the dashboard"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm onSuccess={() => router.replace(next)} />
    </AuthCard>
  );
}
