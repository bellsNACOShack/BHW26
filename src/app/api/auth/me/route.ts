import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, avatar_url, phone_number, created_at, updated_at")
      .eq("id", auth.user.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "User not found." },
        { status: 404 }
      );
    }

    let studentProfile = null;
    if (user.role === "student") {
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      studentProfile = profile;
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          ...user,
          student_profile: studentProfile,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
