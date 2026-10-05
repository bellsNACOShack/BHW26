import { AuthenticatedLayout } from "@/components/organisms/AuthenticatedLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
