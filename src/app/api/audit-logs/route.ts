import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["administrator", "academic_supervisor", "itf_verifier"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get("resource_type");
    const resourceId = searchParams.get("resource_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = getSupabaseAdmin();
    let query = supabase.from("audit_logs").select(`
      *,
      user:user_id (id, full_name, email, role)
    `);

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (resourceId) {
      query = query.eq("resource_id", resourceId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: data.length, audit_logs: data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
