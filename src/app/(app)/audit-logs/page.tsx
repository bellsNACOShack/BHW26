import type { Metadata } from "next";
import { AuditLogsPage } from "@/components/pages/AuditLogsPage";

export const metadata: Metadata = { title: "Audit logs" };

export default function Page() {
  return <AuditLogsPage />;
}
