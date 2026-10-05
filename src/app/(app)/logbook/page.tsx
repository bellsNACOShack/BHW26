import type { Metadata } from "next";
import { LogbookPage } from "@/components/pages/LogbookPage";

export const metadata: Metadata = { title: "Logbook" };

export default function Page() {
  return <LogbookPage />;
}
