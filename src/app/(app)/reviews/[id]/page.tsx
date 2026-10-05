import type { Metadata } from "next";
import { EntryReviewPage } from "@/components/pages/EntryReviewPage";

export const metadata: Metadata = { title: "Review entry" };

export default function Page({ params }: { params: { id: string } }) {
  return <EntryReviewPage entryId={params.id} />;
}
