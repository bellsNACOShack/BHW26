import type { Metadata } from "next";
import { LogbookQueuePage } from "@/components/pages/LogbookQueuePage";
import { ACADEMIC_COMPLETED_STAGES, ACADEMIC_PENDING_STAGES } from "@/features/placements/lib/lifecycle";

export const metadata: Metadata = { title: "Assessments" };

export default function Page() {
  return (
    <LogbookQueuePage
      title="Assessments"
      description="Review, sign and grade your students' completed logbooks"
      permission="assessLogbooks"
      tabs={[
        { key: "pending", label: "To review", stages: ACADEMIC_PENDING_STAGES, empty: "No logbooks are waiting for your review" },
        { key: "completed", label: "Completed", stages: ACADEMIC_COMPLETED_STAGES, empty: "No assessments completed yet" },
        { key: "all", label: "All students", empty: "No students are assigned to you yet" },
      ]}
    />
  );
}
