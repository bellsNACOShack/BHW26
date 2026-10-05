import type { Metadata } from "next";
import { ScafReviewPage } from "@/components/pages/ScafReviewPage";

export const metadata: Metadata = { title: "Review SCAF" };

export default function Page({ params }: { params: { id: string } }) {
  return <ScafReviewPage scafId={params.id} />;
}
