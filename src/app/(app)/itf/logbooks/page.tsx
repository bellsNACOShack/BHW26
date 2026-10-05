import type { Metadata } from "next";
import { LogbookQueuePage } from "@/components/pages/LogbookQueuePage";
import { ITF_APPROVED_STAGES, ITF_PENDING_STAGES } from "@/features/placements/lib/lifecycle";

export const metadata: Metadata = { title: "Logbook requests" };

export default function Page() {
  return (
    <LogbookQueuePage
      title="Logbook requests"
      description="Logbooks from students routed to your ITF office"
      permission="reviewLogbookItf"
      tabs={[
        { key: "requests", label: "Requests", stages: ITF_PENDING_STAGES, empty: "No logbooks are waiting for ITF review" },
        { key: "approved", label: "Approved", stages: ITF_APPROVED_STAGES, empty: "No logbooks have been approved yet" },
        { key: "rejected", label: "Rejected", stages: ["itf_rejected"], empty: "No logbooks are waiting on corrections" },
        { key: "all", label: "All students", empty: "No students are routed to your office yet" },
      ]}
    />
  );
}
