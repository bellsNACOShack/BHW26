"use client";

import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { PublicPageShell } from "@/components/organisms/PublicPageShell";
import { VerificationResultCard } from "@/components/organisms/VerificationResultCard";
import { VerifyCodeForm } from "@/components/organisms/VerifyCodeForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerification } from "@/features/verifications/hooks/useVerification";
import { ApiError } from "@/lib/api-client";

export function VerificationResultPage({ code }: { code: string }) {
  const { data, isLoading, error, refetch } = useVerification(code);
  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <PublicPageShell title="SIWES record verification" description={`Verification code ${code.toUpperCase()}`}>
      {isLoading ? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : notFound ? (
        <div className="space-y-4">
          <EmptyState
            icon={SearchX}
            title="No record matches this code"
            description="Check the code for typos. Codes look like ITL-1A2B3C4D."
            className="py-6"
          />
          <VerifyCodeForm defaultCode={code.toUpperCase()} />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <VerificationResultCard result={data} />
      )}
    </PublicPageShell>
  );
}
