import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, generateToken, UserRole } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const VALID_ROLES: UserRole[] = [
  "student",
  "workplace_supervisor",
  "academic_supervisor",
  "administrator",
  "itf_verifier",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      full_name,
      role,
      phone_number,
      avatar_url,
      // student specific fields per PRD Section 6.2
      matric_number,
      institution,
      department,
      program,
      level,
    } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "email, password, full_name, and role are required.",
        },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: `Invalid role. Allowed roles: ${VALID_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    if (role === "student" && (!matric_number || !institution || !department || !program)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "matric_number, institution, department, and program are required for student accounts.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict",
          message: "An account with this email address already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Insert user
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: full_name.trim(),
        role,
        phone_number: phone_number || null,
        avatar_url: avatar_url || null,
      })
      .select("id, email, full_name, role, phone_number, avatar_url, created_at")
      .single();

    if (userError || !newUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Database Error",
          message: userError?.message || "Failed to create user.",
        },
        { status: 500 }
      );
    }

    let studentProfile = null;
    if (role === "student") {
      const { data: profile, error: profileError } = await supabase
        .from("student_profiles")
        .insert({
          user_id: newUser.id,
          matric_number: matric_number.trim(),
          institution: institution.trim(),
          department: department.trim(),
          program: program.trim(),
          level: level || "400L",
        })
        .select()
        .single();

      if (profileError) {
        console.error("Failed to create student profile:", profileError);
      } else {
        studentProfile = profile;
      }
    }

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role as UserRole,
    });

    await logAuditEvent({
      userId: newUser.id,
      action: "USER_REGISTERED",
      resourceType: "users",
      resourceId: newUser.id,
      metadata: { role: newUser.role, email: newUser.email },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully.",
        token,
        user: {
          ...newUser,
          student_profile: studentProfile,
        },
      },
      { status: 201 }
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
