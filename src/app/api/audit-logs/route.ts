import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { getAccessiblePlacementIds, getActor } from "@/lib/access";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["administrator", "academic_supervisor", "itf_verifier", "departmental_coordinator"]);
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

    // Non-administrators only see the trail of placements (and their entries) they can access.
    const scope = await getAccessiblePlacementIds(await getActor(auth.user));
    if (scope !== "all") {
      if (scope.length === 0) return NextResponse.json({ success: true, count: 0, audit_logs: [] });
      const { data: entries } = await supabase.from("log_entries").select("id").in("placement_id", scope);
      query = query.in("resource_id", [...scope, ...(entries ?? []).map((e) => e.id)]);
    }

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
