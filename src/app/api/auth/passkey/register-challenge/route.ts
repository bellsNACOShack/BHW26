import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generatePasskeyChallenge } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["workplace_supervisor", "academic_supervisor", "administrator"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const challenge = generatePasskeyChallenge(auth.user.userId);

    return NextResponse.json({
      success: true,
      challenge,
      rp: {
        name: "Interlog SIWES Platform",
        id: request.nextUrl.hostname,
      },
      user: {
        id: auth.user.userId,
        name: auth.user.email,
        displayName: auth.user.fullName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
