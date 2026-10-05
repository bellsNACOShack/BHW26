import type { Metadata } from "next";
import { LogbookReviewPage } from "@/components/pages/LogbookReviewPage";

export const metadata: Metadata = { title: "Logbook" };

export default function Page({ params }: { params: { id: string } }) {
  return <LogbookReviewPage placementId={params.id} />;
}
