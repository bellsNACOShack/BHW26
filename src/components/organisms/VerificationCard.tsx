"use client";

import { ExternalLink, Loader2, QrCode } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CopyField } from "@/components/molecules/CopyField";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Button } from "@/components/ui/button";
import { useGenerateVerification } from "@/features/verifications/hooks/useGenerateVerification";
import { getErrorMessage } from "@/lib/api-client";
import { pluralize } from "@/lib/format";

interface VerificationCardProps {
  placementId: string;
  approvedWeeks: number;
}

/**
 * Issues a verification code + QR for the placement (POST /api/verifications/generate).
 * The API has no endpoint to list previously issued codes, so the result is shown once.
 */
export function VerificationCard({ placementId, approvedWeeks }: VerificationCardProps) {
  const generate = useGenerateVerification();
  const result = generate.data;

  function handleGenerate() {
    generate.mutate(placementId, {
      onSuccess: () => toast.success("Verification code issued"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <SectionCard
      title="Verification record"
      description="A code and QR that employers, your institution and ITF can use to verify this SIWES record."
    >
      {result ? (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="mx-auto shrink-0 rounded-2xl border bg-white p-3 sm:mx-0">
            <QRCodeSVG value={result.verification_url} size={144} level="M" aria-label="Verification QR code" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <CopyField label="Verification code" value={result.verification.verification_code} />
            <CopyField label="Verification link" value={result.verification_url} />
            <p className="text-xs text-muted-foreground">
              Covers {pluralize(result.verification.total_weeks_approved, "approved week")}. Save this code — it is shown only once.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/verify/${result.verification.verification_code}`} target="_blank">
                Open verification page <ExternalLink />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <QrCode className="size-6" aria-hidden />
          </span>
          <p className="flex-1 text-sm text-muted-foreground">
            {approvedWeeks > 0
              ? `${pluralize(approvedWeeks, "approved week")} will be sealed into the record. Issue a new code after more weeks are signed.`
              : "Codes can be issued once at least one week has been approved by a supervisor."}
          </p>
          <Button onClick={handleGenerate} disabled={approvedWeeks === 0 || generate.isPending}>
            {generate.isPending && <Loader2 className="animate-spin" />}
            Generate code
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
