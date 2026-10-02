import crypto from "crypto";

/**
 * Computes a deterministic SHA-256 hash of an object or string.
 * Used for tamper-evident digital logbook locking and verification.
 */
export function computeSha256(data: any): string {
  const content = typeof data === "string" ? data : JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Computes the canonical integrity hash of a weekly logbook entry.
 */
export function computeLogEntryHash(entry: {
  id: string;
  student_id: string;
  placement_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  activities: string;
  skills?: string | null;
  tools?: string | null;
  challenges?: string | null;
  remarks?: string | null;
}): string {
  const payload = {
    id: entry.id,
    student_id: entry.student_id,
    placement_id: entry.placement_id,
    week_number: entry.week_number,
    start_date: entry.start_date,
    end_date: entry.end_date,
    activities: (entry.activities || "").trim(),
    skills: (entry.skills || "").trim(),
    tools: (entry.tools || "").trim(),
    challenges: (entry.challenges || "").trim(),
    remarks: (entry.remarks || "").trim(),
  };
  return computeSha256(payload);
}
