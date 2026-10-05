import type { Metadata } from "next";
import { LogbookQueuePage } from "@/components/pages/LogbookQueuePage";

export const metadata: Metadata = { title: "Department logbooks" };

export default function Page() {
  return (
    <LogbookQueuePage
      title="Department logbooks"
      description="Completed SIWES logbooks of students in your department"
      permission="manageDepartmentRecords"
      tabs={[
        {
          key: "received",
          label: "Received",
          stages: ["department_submitted", "department_received"],
          empty: "No completed logbooks have been submitted yet",
        },
        { key: "archived", label: "Archived", stages: ["archived"], empty: "No logbooks have been archived yet" },
        { key: "all", label: "All students", empty: "No students from your department yet" },
      ]}
    />
  );
}
