import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";

interface RouteParams {
  params: { id: string };
}

const VALID_ACTIONS = ["approve", "reject", "request_changes"];

export async function POST(request: NextRequest, { params }: RouteParams) {
  // Weekly sign-off belongs to the industry (workplace) supervisor; academic supervisors act on the completed logbook.
  const auth = requireAuth(request, ["workplace_supervisor", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { action, comments } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: `action must be one of: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: logEntry, error } = await supabase
      .from("log_entries")
      .select(`*, placement:placement_id (*)`)
      .eq("id", params.id)
      .single();

    if (error || !logEntry) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Log entry not found." },
        { status: 404 }
      );
    }

    // Check supervisor authorization
    const placement = logEntry.placement;
    const isWorkplaceSupervisor = placement.workplace_supervisor_id === auth.user.userId;
    const isAdmin = auth.user.role === "administrator";

    if (!isWorkplaceSupervisor && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "You are not assigned as a supervisor for this student placement.",
        },
        { status: 403 }
      );
    }

    if (logEntry.status !== "submitted" && logEntry.status !== "under_review") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid State",
          message: `Week ${logEntry.week_number} is '${logEntry.status}' and isn't waiting for review.`,
        },
        { status: 400 }
      );
    }

    const { error: approvalError } = await supabase.from("approvals").insert({
      log_entry_id: params.id,
      supervisor_id: auth.user.userId,
      action,
      comments: comments || null,
    });

    if (approvalError) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: approvalError.message },
        { status: 500 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { data: updatedEntry, error: updateError } = await supabase
      .from("log_entries")
      .update({ status: newStatus })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: updateError.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: action === "approve" ? "LOG_ENTRY_APPROVED" : "LOG_ENTRY_REJECTED",
      resourceType: "log_entries",
      resourceId: params.id,
      metadata: { action, comments, week_number: logEntry.week_number },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    if (newStatus === "rejected") {
      await notifyUsers([logEntry.student_id], {
        title: `Week ${logEntry.week_number} needs revision`,
        body: comments || "Your supervisor returned this week for changes.",
        link: `/logbook/${logEntry.id}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Week ${logEntry.week_number} log entry has been ${newStatus}.`,
      log_entry: updatedEntry,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
