import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { verifyPasskeyChallenge } from "@/lib/webauthn";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["workplace_supervisor", "academic_supervisor", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { credential_id, public_key, challenge, device_type } = body;

    if (!credential_id || !public_key || !challenge) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "credential_id, public_key, and challenge are required.",
        },
        { status: 400 }
      );
    }

    const isValidChallenge = verifyPasskeyChallenge(auth.user.userId, challenge);
    if (!isValidChallenge) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Challenge",
          message: "The registration challenge has expired or is invalid.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("passkey_credentials")
      .insert({
        user_id: auth.user.userId,
        credential_id,
        public_key,
        device_type: device_type || "biometric_authenticator",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Database Error", message: error.message },
        { status: 500 }
      );
    }

    await logAuditEvent({
      userId: auth.user.userId,
      action: "PASSKEY_REGISTERED",
      resourceType: "passkey_credentials",
      resourceId: credential_id,
      metadata: { device_type },
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      success: true,
      message: "Passkey credential registered successfully. Supervisor is now enabled for digital signing.",
      credential: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
