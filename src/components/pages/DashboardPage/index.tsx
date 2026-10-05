"use client";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { StaffDashboard } from "./StaffDashboard";
import { StudentDashboard } from "./StudentDashboard";

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  return user.role === "student" ? <StudentDashboard user={user} /> : <StaffDashboard user={user} />;
}
