import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { canAccessPlacement, forbidden, getActor } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { getLockedDayEdits, hasWeekStarted } from "@/features/logbook/lib/weeks";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: logEntry, error } = await supabase
      .from("log_entries")
      .select(`
        *,
        student:student_id (id, full_name, email),
        placement:placement_id (*),
        approvals (*, supervisor:supervisor_id (id, full_name, role)),
        signatures (*, user:user_id (id, full_name, role))
      `)
      .eq("id", params.id)
      .single();

    if (error || !logEntry) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Log entry not found." },
        { status: 404 }
      );
    }

    if (!logEntry.placement || !(await canAccessPlacement(await getActor(auth.user), logEntry.placement))) {
      return forbidden("You don't have access to this log entry.");
    }

    return NextResponse.json({ success: true, log_entry: logEntry }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["student"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: logEntry } = await supabase
      .from("log_entries")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!logEntry) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Log entry not found." },
        { status: 404 }
      );
    }

    if (logEntry.student_id !== auth.user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "You can only edit your own log entries." },
        { status: 403 }
      );
    }

    // Strict PRD Rule: Only draft or rejected entries can be edited
    if (logEntry.status !== "draft" && logEntry.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: `Cannot edit log entry in '${logEntry.status}' state. Only 'draft' or 'rejected' entries can be modified.`,
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!hasWeekStarted(logEntry)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: `Week ${logEntry.week_number} starts on ${formatDate(logEntry.start_date)}. You can edit it once it begins.`,
        },
        { status: 400 }
      );
    }

    if (body.activities !== undefined) {
      const lockedDays = getLockedDayEdits(logEntry, body.activities ?? "", logEntry.activities);
      if (lockedDays.length) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation Error",
            message: `You can't log ${lockedDays.join(", ")} yet. Days can only be logged once they arrive.`,
          },
          { status: 400 }
        );
      }
    }

    const { data: updated, error } = await supabase
      .from("log_entries")
      .update({
        activities: body.activities !== undefined ? body.activities.trim() : logEntry.activities,
        skills: body.skills !== undefined ? body.skills?.trim() : logEntry.skills,
        tools: body.tools !== undefined ? body.tools?.trim() : logEntry.tools,
        challenges: body.challenges !== undefined ? body.challenges?.trim() : logEntry.challenges,
        remarks: body.remarks !== undefined ? body.remarks?.trim() : logEntry.remarks,
        supporting_evidence_url:
          body.supporting_evidence_url !== undefined
            ? body.supporting_evidence_url
            : logEntry.supporting_evidence_url,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "LOG_ENTRY_UPDATED",
      resourceType: "log_entries",
      resourceId: params.id,
      metadata: { week_number: logEntry.week_number },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: "Log entry updated successfully.",
      log_entry: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request, ["student", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: logEntry } = await supabase
      .from("log_entries")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!logEntry) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Log entry not found." },
        { status: 404 }
      );
    }

    if (auth.user.role === "student" && logEntry.student_id !== auth.user.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "You can only delete your own log entries." },
        { status: 403 }
      );
    }

    if (logEntry.status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: `Cannot delete a log entry with status '${logEntry.status}'. Only draft entries can be deleted.`,
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("log_entries").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "LOG_ENTRY_DELETED",
      resourceType: "log_entries",
      resourceId: params.id,
      metadata: { week_number: logEntry.week_number },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: `Week ${logEntry.week_number} draft entry deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
