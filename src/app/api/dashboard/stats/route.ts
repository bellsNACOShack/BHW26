import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { getActor, getDepartmentStudentIds } from "@/lib/access";
import {
  ACADEMIC_COMPLETED_STAGES,
  ACADEMIC_PENDING_STAGES,
  ITF_APPROVED_STAGES,
  ITF_PENDING_STAGES,
} from "@/features/placements/lib/lifecycle";

/** Counts placements by logbook stage group. */
function countStages(placements: { logbook_stage: string }[], stages: string[]) {
  return placements.filter((p) => stages.includes(p.logbook_stage)).length;
}

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
    } else if (role === "academic_supervisor") {
      const { data: placements } = await supabase
        .from("placements")
        .select("id, logbook_stage")
        .eq("academic_supervisor_id", userId);
      const rows = placements ?? [];
      return NextResponse.json({
        success: true,
        role,
        stats: {
          assigned_students: rows.length,
          pending_assessments: countStages(rows, ACADEMIC_PENDING_STAGES),
          completed_assessments: countStages(rows, ACADEMIC_COMPLETED_STAGES),
        },
      });
    } else if (role === "itf_verifier") {
      const actor = await getActor(auth.user);
      if (!actor.itf_office_id) {
        return NextResponse.json({
          success: true,
          role,
          stats: { office_students: 0, pending_scaf: 0, pending_logbooks: 0, approved_logbooks: 0, rejected_logbooks: 0 },
        });
      }
      const [{ data: placements }, { count: pendingScaf }] = await Promise.all([
        supabase.from("placements").select("id, logbook_stage").eq("itf_office_id", actor.itf_office_id),
        supabase
          .from("scaf_submissions")
          .select("id", { count: "exact", head: true })
          .eq("itf_office_id", actor.itf_office_id)
          .in("status", ["submitted", "under_review"]),
      ]);
      const rows = placements ?? [];
      return NextResponse.json({
        success: true,
        role,
        stats: {
          office_students: rows.length,
          pending_scaf: pendingScaf ?? 0,
          pending_logbooks: countStages(rows, ITF_PENDING_STAGES),
          approved_logbooks: countStages(rows, ITF_APPROVED_STAGES),
          rejected_logbooks: countStages(rows, ["itf_rejected"]),
        },
      });
    } else if (role === "departmental_coordinator") {
      const studentIds = await getDepartmentStudentIds(await getActor(auth.user));
      const { data: placements } = studentIds.length
        ? await supabase.from("placements").select("id, logbook_stage").in("student_id", studentIds)
        : { data: [] as { id: string; logbook_stage: string }[] };
      const rows = placements ?? [];
      return NextResponse.json({
        success: true,
        role,
        stats: {
          department_students: studentIds.length,
          awaiting_receipt: countStages(rows, ["department_submitted"]),
          received_logbooks: countStages(rows, ["department_received"]),
          archived_logbooks: countStages(rows, ["archived"]),
        },
      });
    } else if (role === "workplace_supervisor") {
      const { data: placements } = await supabase
        .from("placements")
        .select("id, student_id")
        .eq("workplace_supervisor_id", userId);

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
