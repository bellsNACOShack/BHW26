import { PublicPageShell } from "@/components/organisms/PublicPageShell";
import { VerifyCodeForm } from "@/components/organisms/VerifyCodeForm";

export function VerifyPage() {
  return (
    <PublicPageShell
      title="Verify a SIWES record"
      description="Employers, institutions and ITF can confirm a completed SIWES record using the code on the student's verification record or by scanning its QR code."
    >
      <VerifyCodeForm />
    </PublicPageShell>
  );
}
