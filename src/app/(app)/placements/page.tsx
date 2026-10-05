import type { Metadata } from "next";
import { PlacementsPage } from "@/components/pages/PlacementsPage";

export const metadata: Metadata = { title: "Placements" };

export default function Page() {
  return <PlacementsPage />;
}
