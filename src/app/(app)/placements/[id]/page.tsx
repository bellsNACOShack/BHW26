import type { Metadata } from "next";
import { PlacementDetailPage } from "@/components/pages/PlacementDetailPage";

export const metadata: Metadata = { title: "Placement" };

export default function Page({ params }: { params: { id: string } }) {
  return <PlacementDetailPage placementId={params.id} />;
}
