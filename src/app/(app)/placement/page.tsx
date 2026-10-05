import type { Metadata } from "next";
import { PlacementPage } from "@/components/pages/PlacementPage";

export const metadata: Metadata = { title: "Placement" };

export default function Page() {
  return <PlacementPage />;
}
