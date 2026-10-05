import type { Metadata } from "next";
import { VerifyPage } from "@/components/pages/VerifyPage";

export const metadata: Metadata = { title: "Verify a SIWES record" };

export default function Page() {
  return <VerifyPage />;
}
