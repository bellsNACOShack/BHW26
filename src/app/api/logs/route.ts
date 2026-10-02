import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

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

    if (auth.user.role === "student") {
      query = query.eq("student_id", auth.user.userId);
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
      .select("id, student_id")
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

    const { data: newEntry, error } = await supabase
      .from("log_entries")
      .insert({
        student_id: auth.user.userId,
        placement_id,
        week_number,
        start_date,
        end_date,
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
