import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { getAccessiblePlacementIds, getActor } from "@/lib/access";
import { getLockedDayEdits, getTotalWeeks, getWeekRange, hasWeekStarted } from "@/features/logbook/lib/weeks";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const placementId = searchParams.get("placement_id");
    const status = searchParams.get("status");
    const weekNumber = searchParams.get("week_number");

    const supabase = getSupabaseAdmin();
    let query = supabase.from("log_entries").select(`
      *,
      student:student_id (id, full_name, email),
      approvals (*),
      signatures (*)
    `);

    // Only entries of placements the user can access (own / assigned / ITF office / department).
    const scope = await getAccessiblePlacementIds(await getActor(auth.user));
    if (scope !== "all") {
      if (scope.length === 0) return NextResponse.json({ success: true, count: 0, logs: [] });
      query = query.in("placement_id", scope);
    }

    if (placementId) {
      query = query.eq("placement_id", placementId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (weekNumber) {
      query = query.eq("week_number", parseInt(weekNumber, 10));
    }

    const { data, error } = await query.order("week_number", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: data.length, logs: data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["student"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const {
      placement_id,
      week_number,
      start_date,
      end_date,
      activities,
      skills,
      tools,
      challenges,
      remarks,
      supporting_evidence_url,
    } = body;

    if (!placement_id || !week_number || !start_date || !end_date || !activities) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "placement_id, week_number, start_date, end_date, and activities are required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: placement } = await supabase
      .from("placements")
      .select("id, student_id, start_date, end_date")
      .eq("id", placement_id)
      .single();

    if (!placement || placement.student_id !== auth.user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Invalid placement or placement does not belong to you.",
        },
        { status: 403 }
      );
    }

    const weekNumber = Number(week_number);
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > getTotalWeeks(placement)) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: `Week ${week_number} is outside this placement.` },
        { status: 400 }
      );
    }

    // Week dates come from the placement, not the client, so they always match the calendar.
    const range = getWeekRange(placement, weekNumber);
    if (!hasWeekStarted(range)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: `Week ${week_number} starts on ${formatDate(range.start_date)}. You can log it once it begins.`,
        },
        { status: 400 }
      );
    }

    const lockedDays = getLockedDayEdits(range, activities, null);
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

    const { data: newEntry, error } = await supabase
      .from("log_entries")
      .insert({
        student_id: auth.user.userId,
        placement_id,
        week_number: weekNumber,
        start_date: range.start_date,
        end_date: range.end_date,
        activities: activities.trim(),
        skills: skills ? skills.trim() : null,
        tools: tools ? tools.trim() : null,
        challenges: challenges ? challenges.trim() : null,
        remarks: remarks ? remarks.trim() : null,
        supporting_evidence_url: supporting_evidence_url || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Conflict",
            message: `A log entry for Week ${week_number} already exists.`,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "LOG_ENTRY_CREATED",
      resourceType: "log_entries",
      resourceId: newEntry.id,
      metadata: { week_number, placement_id },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Week ${week_number} log entry created in Draft status.`,
        log_entry: newEntry,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
