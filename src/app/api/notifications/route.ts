import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { serverError } from "@/lib/access";

/** The signed-in user's latest notifications and their unread count. */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .eq("user_id", auth.user.userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.userId)
        .is("read_at", null),
    ]);
    if (error) return serverError(error.message);

    return NextResponse.json({ success: true, notifications: data ?? [], unread_count: count ?? 0 });
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}
