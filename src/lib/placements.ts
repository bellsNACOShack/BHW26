import { one } from "./access";
import { getSupabaseAdmin } from "./supabase/admin";

/** The ITF area office serving an organization's state (the office "nearest" the placement). */
export async function getItfOfficeIdForState(state: string | null | undefined): Promise<string | null> {
  if (!state) return null;
  const { data } = await getSupabaseAdmin().from("itf_offices").select("id").eq("state", state).single();
  return data?.id ?? null;
}

/** Joins shared by placement list and detail responses. */
export const PLACEMENT_PEOPLE_SELECT = `
  student:student_id (id, full_name, email, phone_number, student_profiles (matric_number, institution, department, program, level)),
  workplace_supervisor:workplace_supervisor_id (id, full_name, email, phone_number),
  academic_supervisor:academic_supervisor_id (id, full_name, email, phone_number),
  itf_office:itf_office_id (id, name, state, city),
  logbook_assessments (id, score, grade, remarks, created_at, updated_at, supervisor_id)
`;

/** Flattens one-to-one embeds so clients get `student.student_profile` and `assessment` objects. */
export function shapePlacement<T extends Record<string, any>>(row: T) {
  const { logbook_assessments, scaf_submissions, ...rest } = row as any;
  const student = rest.student
    ? (({ student_profiles, ...s }) => ({ ...s, student_profile: one(student_profiles) }))(rest.student)
    : null;
  return {
    ...rest,
    student,
    itf_office: one(rest.itf_office),
    assessment: one(logbook_assessments),
    ...(scaf_submissions !== undefined ? { scaf_submission: one(scaf_submissions) } : {}),
  };
}
