import type { Metadata } from "next";
import { ScafQueuePage } from "@/components/pages/ScafQueuePage";

export const metadata: Metadata = { title: "SCAF submissions" };

export default function Page() {
  return <ScafQueuePage />;
}
