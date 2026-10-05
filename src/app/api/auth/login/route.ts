import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword, generateToken, UserRole } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getUserScope } from "@/lib/users";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password_hash, full_name, role, avatar_url, phone_number, created_at")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Invalid email or password.",
        },
        { status: 401 }
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

    const token = generateToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role as UserRole,
    });

    const { password_hash, ...safeUser } = user;

    await logAuditEvent({
      userId: user.id,
      action: "USER_LOGIN",
      resourceType: "users",
      resourceId: user.id,
      metadata: { role: user.role },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        token,
        user: {
          ...safeUser,
          ...(await getUserScope(user.id)),
          student_profile: studentProfile,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message: error.message || "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
