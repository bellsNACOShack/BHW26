import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { serverError } from "@/lib/access";

/** Marks the given notifications (or all of them when `ids` is omitted) as read. */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    let query = getSupabaseAdmin()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user.userId)
      .is("read_at", null);
    if (Array.isArray(body.ids)) query = query.in("id", body.ids.filter((id: unknown) => typeof id === "string"));

    const { error } = await query;
    if (error) return serverError(error.message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return serverError(error.message, "Internal Server Error");
  }
}
