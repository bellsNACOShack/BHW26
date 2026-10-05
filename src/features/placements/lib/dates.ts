import { addDays, isYmd, todayYmd } from "@/features/logbook/lib/weeks";
import { formatDate } from "@/lib/format";

/** A SIWES placement must last at least 4 weeks. */
export const MIN_PLACEMENT_DAYS = 28;

export interface PlacementDateError {
  field: "start_date" | "end_date";
  message: string;
}

/** Earliest end date allowed for a start date: 4 weeks later, and never before today. */
export function getMinEndDate(startDate: string | undefined, today = todayYmd()) {
  if (!isYmd(startDate)) return today;
  const minEnd = addDays(startDate, MIN_PLACEMENT_DAYS);
  return minEnd > today ? minEnd : today;
}

/**
 * Rules for a new placement's training dates (enforced by the form and the API):
 * the end date cannot be before today and must be at least 4 weeks after the start.
 */
export function getPlacementDateError(startDate: unknown, endDate: unknown, today = todayYmd()): PlacementDateError | null {
  if (!isYmd(startDate)) return { field: "start_date", message: "Choose a valid start date" };
  if (!isYmd(endDate)) return { field: "end_date", message: "Choose a valid end date" };
  if (endDate < today) return { field: "end_date", message: "End date can't be before today" };
  const minEnd = addDays(startDate, MIN_PLACEMENT_DAYS);
  if (endDate < minEnd) {
    return { field: "end_date", message: `SIWES must last at least 4 weeks: choose ${formatDate(minEnd)} or later` };
  }
  return null;
}
