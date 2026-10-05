import type { Metadata } from "next";
import { VerificationResultPage } from "@/components/pages/VerificationResultPage";

export const metadata: Metadata = { title: "SIWES record verification" };

export default function Page({ params }: { params: { code: string } }) {
  return <VerificationResultPage code={decodeURIComponent(params.code)} />;
}
