import type { Metadata } from "next";
import { ReviewsPage } from "@/components/pages/ReviewsPage";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return <ReviewsPage />;
}
