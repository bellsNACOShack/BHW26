import { isYmd } from "@/features/logbook/lib/weeks";

/**
 * The information a student adds to the digital SCAF (Student Commencement
 * Attestation Form). Their name, matric number, institution and placement are
 * attached automatically from their profile and placement.
 */
export const SCAF_FIELDS = [
  { key: "commencement_date", label: "Date you resumed", type: "date", required: true },
  { key: "phone_number", label: "Your phone number", type: "tel", required: true, placeholder: "e.g. 0803 000 0000" },
  { key: "residential_address", label: "Your address during the attachment", type: "textarea", required: true, placeholder: "Street, city, state" },
  { key: "nature_of_business", label: "Organization's nature of business", type: "text", required: true, placeholder: "e.g. Software development" },
  { key: "organization_phone", label: "Organization phone", type: "tel", required: true, placeholder: "e.g. 0803 000 0000" },
  { key: "organization_email", label: "Organization email (optional)", type: "email", required: false, placeholder: "e.g. hr@company.com" },
  { key: "supervisor_name", label: "Industry-based supervisor's name", type: "text", required: true, placeholder: "e.g. Ada Obi" },
  { key: "supervisor_designation", label: "Supervisor's designation", type: "text", required: true, placeholder: "e.g. Engineering manager" },
  { key: "supervisor_phone", label: "Supervisor's phone", type: "tel", required: true, placeholder: "e.g. 0803 000 0000" },
] as const;

export type ScafFieldKey = (typeof SCAF_FIELDS)[number]["key"];
export type ScafDetails = Record<ScafFieldKey, string>;

export function emptyScafDetails(): ScafDetails {
  return Object.fromEntries(SCAF_FIELDS.map((f) => [f.key, ""])) as ScafDetails;
}

/** Keeps only known fields as trimmed strings (drafts may be incomplete). */
export function cleanScafDetails(input: unknown): ScafDetails {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return Object.fromEntries(
    SCAF_FIELDS.map((f) => [f.key, typeof source[f.key] === "string" ? (source[f.key] as string).trim().slice(0, 1000) : ""])
  ) as ScafDetails;
}

/** Field errors that block submitting (not saving a draft). */
export function getScafErrors(details: ScafDetails): Partial<Record<ScafFieldKey, string>> {
  const errors: Partial<Record<ScafFieldKey, string>> = {};
  for (const field of SCAF_FIELDS) {
    const value = details[field.key];
    if (field.required && !value) errors[field.key] = "Required";
    else if (value && field.type === "date" && !isYmd(value)) errors[field.key] = "Enter a valid date";
    else if (value && field.type === "email" && !/^\S+@\S+\.\S+$/.test(value)) errors[field.key] = "Enter a valid email";
    else if (value && field.type === "tel" && !/^\+?[\d\s()-]{7,20}$/.test(value)) errors[field.key] = "Enter a valid phone number";
  }
  return errors;
}
