import { one } from "./access";
import { getSupabaseAdmin } from "./supabase/admin";

/**
 * Scope fields returned with the signed-in user: an ITF officer's office and a
 * coordinator's institution + department. Fetched separately from the core user
 * columns so sign-in keeps working if the 002 migration has not been applied yet.
 */
export async function getUserScope(userId: string) {
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("itf_office_id, institution, department, itf_office:itf_office_id (id, name, state, city)")
    .eq("id", userId)
    .single();
  return {
    itf_office_id: data?.itf_office_id ?? null,
    itf_office: one(data?.itf_office as any) ?? null,
    institution: data?.institution ?? null,
    department: data?.department ?? null,
  };
}
