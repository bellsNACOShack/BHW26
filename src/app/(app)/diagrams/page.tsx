import type { Metadata } from "next";
import { DiagramsPage } from "@/components/pages/DiagramsPage";

export const metadata: Metadata = { title: "Diagrams" };

export default function Page() {
  return <DiagramsPage />;
}
