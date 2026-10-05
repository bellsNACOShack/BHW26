/**
 * The API stores a week's work in a single `activities` text field, while the
 * product captures one entry per working day. Days are encoded as readable
 * sections so supervisors (and any other API consumer) see plain text:
 *
 *   ## Monday
 *   Planning session for the new feature roadmap.
 *
 *   ## Tuesday
 *   ...
 */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Saturday can be logged but is never required to submit a week. */
export const OPTIONAL_WEEKDAYS: readonly Weekday[] = ["Saturday"];
export type DailyLogs = Record<Weekday, string>;

const HEADING = /^## (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*$/;

function emptyDailyLogs(): DailyLogs {
  return { Monday: "", Tuesday: "", Wednesday: "", Thursday: "", Friday: "", Saturday: "" };
}

/** `notes` holds free-form text that precedes the day sections (kept so nothing is lost). */
export function serializeDailyLogs(days: DailyLogs, notes = ""): string {
  const sections = WEEKDAYS.filter((day) => days[day].trim()).map((day) => `## ${day}\n${days[day].trim()}`);
  return [notes.trim(), ...sections].filter(Boolean).join("\n\n");
}

export interface ParsedActivities {
  days: DailyLogs;
  /** Text outside the per-day sections (e.g. entries written through another client). */
  notes: string;
}

export function parseDailyLogs(activities: string | null | undefined): ParsedActivities {
  const days = emptyDailyLogs();
  const text = (activities ?? "").trim();
  if (!text) return { days, notes: "" };

  let current: Weekday | null = null;
  const preamble: string[] = [];
  const buffers: Partial<Record<Weekday, string[]>> = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(HEADING);
    if (match) {
      current = match[1] as Weekday;
      buffers[current] = [];
    } else if (current) {
      buffers[current]!.push(line);
    } else {
      preamble.push(line);
    }
  }

  for (const day of WEEKDAYS) {
    if (buffers[day]) days[day] = buffers[day]!.join("\n").trim();
  }

  const leftover = preamble.join("\n").trim();
  const hasDays = Object.keys(buffers).length > 0;
  return { days, notes: hasDays ? leftover : text };
}
