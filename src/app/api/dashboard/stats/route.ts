import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const role = auth.user.role;
    const userId = auth.user.userId;

    if (role === "student") {
      const { data: placement } = await supabase
        .from("placements")
        .select("id, status, scaf_status, organization_name, start_date, end_date")
        .eq("student_id", userId)
        .single();

      const { data: logs } = await supabase
        .from("log_entries")
        .select("id, status, week_number")
        .eq("student_id", userId);

      const totalLogs = logs?.length || 0;
      const approvedLogs = logs?.filter((l) => l.status === "approved" || l.status === "locked").length || 0;
      const pendingLogs = logs?.filter((l) => l.status === "submitted" || l.status === "under_review").length || 0;
      const draftLogs = logs?.filter((l) => l.status === "draft").length || 0;
      const rejectedLogs = logs?.filter((l) => l.status === "rejected").length || 0;

      return NextResponse.json({
        success: true,
        role: "student",
        stats: {
          placement: placement || null,
          total_weeks_logged: totalLogs,
          approved_weeks: approvedLogs,
          pending_reviews: pendingLogs,
          drafts: draftLogs,
          rejected_weeks: rejectedLogs,
        },
      });
    } else if (role === "workplace_supervisor" || role === "academic_supervisor") {
      const supervisorColumn =
        role === "workplace_supervisor" ? "workplace_supervisor_id" : "academic_supervisor_id";

      const { data: placements } = await supabase
        .from("placements")
        .select("id, student_id")
        .eq(supervisorColumn, userId);

      const placementIds = (placements || []).map((p) => p.id);

      let pendingReviewsCount = 0;
      let totalApprovedCount = 0;

      if (placementIds.length > 0) {
        const { count: pendingCount } = await supabase
          .from("log_entries")
          .select("id", { count: "exact", head: true })
          .in("placement_id", placementIds)
          .eq("status", "submitted");

        const { count: approvedCount } = await supabase
          .from("log_entries")
          .select("id", { count: "exact", head: true })
          .in("placement_id", placementIds)
          .in("status", ["approved", "locked"]);

        pendingReviewsCount = pendingCount || 0;
        totalApprovedCount = approvedCount || 0;
      }

      return NextResponse.json({
        success: true,
        role,
        stats: {
          assigned_students: placements?.length || 0,
          pending_reviews: pendingReviewsCount,
          total_approved_entries: totalApprovedCount,
        },
      });
    } else {
      const { count: totalStudents } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "student");

      const { count: totalPlacements } = await supabase
        .from("placements")
        .select("id", { count: "exact", head: true });

      const { count: totalActivePlacements } = await supabase
        .from("placements")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      const { count: totalVerifications } = await supabase
        .from("verifications")
        .select("id", { count: "exact", head: true });

      return NextResponse.json({
        success: true,
        role,
        stats: {
          total_students: totalStudents || 0,
          total_placements: totalPlacements || 0,
          active_placements: totalActivePlacements || 0,
          total_verifications: totalVerifications || 0,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
