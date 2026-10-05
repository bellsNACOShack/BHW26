import type { Metadata } from "next";
import { WeekPage } from "@/components/pages/WeekPage";

export const metadata: Metadata = { title: "Add new week" };

export default function Page() {
  return <WeekPage />;
}
