import type { Metadata } from "next";
import { WeekPage } from "@/components/pages/WeekPage";

export const metadata: Metadata = { title: "Edit week" };

export default function Page({ params }: { params: { id: string } }) {
  return <WeekPage entryId={params.id} />;
}
