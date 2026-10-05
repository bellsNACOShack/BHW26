import { one } from "./access";

/** A SCAF with everything ITF needs to review it: student, placement and routed office. */
export const SCAF_SUBMISSION_SELECT = `
  *,
  student:student_id (id, full_name, email, phone_number, student_profiles (matric_number, institution, department, program, level)),
  reviewer:reviewer_id (id, full_name, role),
  itf_office:itf_office_id (id, name, state, city),
  placement:placement_id (
    id, organization_name, organization_address, organization_state, start_date, end_date, scaf_status,
    workplace_supervisor:workplace_supervisor_id (id, full_name, email, phone_number)
  )
`;

export function shapeScafSubmission(row: any) {
  const student = row.student
    ? (({ student_profiles, ...s }: any) => ({ ...s, student_profile: one(student_profiles) }))(row.student)
    : null;
  return { ...row, student, itf_office: one(row.itf_office), placement: one(row.placement), reviewer: one(row.reviewer) };
}
