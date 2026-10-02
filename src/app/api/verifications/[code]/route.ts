import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { computeSha256 } from "@/lib/hash";

interface RouteParams {
  params: { code: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: verification, error } = await supabase
      .from("verifications")
      .select(`
        *,
        placement:placement_id (
          id,
          organization_name,
          organization_address,
          start_date,
          end_date,
          status,
          scaf_status,
          workplace_supervisor:workplace_supervisor_id (full_name),
          academic_supervisor:academic_supervisor_id (full_name)
        ),
        student:student_id (
          full_name
        )
      `)
      .eq("verification_code", params.code.trim().toUpperCase())
      .single();

    if (error || !verification) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Not Found",
          message: `Verification code '${params.code}' was not found or is invalid.`,
        },
        { status: 404 }
      );
    }

    const { data: logs } = await supabase
      .from("log_entries")
      .select("id, status, record_hash")
      .eq("placement_id", verification.placement_id)
      .in("status", ["approved", "locked"]);

    const validHashes = (logs || []).map((l) => l.record_hash).filter(Boolean).sort();
    const placement = verification.placement;

    const summaryPayload = {
      placement_id: verification.placement_id,
      student_id: verification.student_id,
      organization: placement?.organization_name,
      start_date: placement?.start_date,
      end_date: placement?.end_date,
      total_approved_weeks: verification.total_weeks_approved,
      hashes: validHashes,
    };

    const computedHash = computeSha256(summaryPayload);
    const isIntegrityIntact = computedHash === verification.record_hash;

    return NextResponse.json({
      success: true,
      verified: verification.status === "verified",
      integrity_intact: isIntegrityIntact,
      verification: {
        verification_code: verification.verification_code,
        status: verification.status,
        issued_at: verification.issued_at,
        student_name: verification.student?.full_name,
        organization_name: placement?.organization_name,
        organization_address: placement?.organization_address,
        siwes_duration: {
          start_date: placement?.start_date,
          end_date: placement?.end_date,
        },
        total_weeks_approved: verification.total_weeks_approved,
        scaf_status: placement?.scaf_status,
        workplace_supervisor: placement?.workplace_supervisor?.full_name || "Assigned",
        academic_supervisor: placement?.academic_supervisor?.full_name || "Assigned",
        record_hash: verification.record_hash,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
