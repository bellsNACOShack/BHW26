import { getSupabaseAdmin } from "./supabase/admin";

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

/**
 * Creates an immutable audit record in the audit_logs table.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      user_id: params.userId || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
    });
  } catch (error) {
    // Non-blocking catch to ensure audit errors don't crash main request, while logging
    console.error("Failed to write audit log:", error);
  }
}
