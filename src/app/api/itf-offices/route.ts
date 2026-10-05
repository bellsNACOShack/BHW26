import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Public list of ITF area offices (used at sign-up by ITF officers and to show routing). */
export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("itf_offices")
      .select("id, name, state, city")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: "Database Error", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, offices: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
