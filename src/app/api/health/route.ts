import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const responseData: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Interlog SIWES API",
    version: "1.0.0",
    database: {
      connected: false,
      message: "Checking database connection...",
    },
  };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      responseData.database = {
        connected: false,
        message: error.message,
        hint: "Run supabase/schema.sql in your Supabase SQL Editor and set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
      };
      return NextResponse.json(responseData, { status: 503 });
    }

    responseData.database = {
      connected: true,
      message: "Successfully connected to Supabase database.",
    };
    return NextResponse.json(responseData, { status: 200 });
  } catch (err: any) {
    responseData.database = {
      connected: false,
      message: err.message || "Failed to connect to Supabase",
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    };
    return NextResponse.json(responseData, { status: 503 });
  }
}
