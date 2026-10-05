import type { Placement } from "@/features/placements/types";
import { OPTIONAL_WEEKDAYS, WEEKDAYS, parseDailyLogs, type Weekday } from "./daily-logs";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SIWES runs on Nigerian time. The browser and the API both read "today" in this
 * zone so they always agree on which days and weeks are open for logging.
 */
export const SIWES_TIME_ZONE = "Africa/Lagos";

const todayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SIWES_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** API dates are `YYYY-MM-DD`; work in UTC so timezones never shift a day. */
function parseYmd(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toYmd(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

export function isYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseYmd(value));
}

export function addDays(value: string, days: number) {
  return toYmd(parseYmd(value) + days * DAY_MS);
}

/** Today's calendar date (`YYYY-MM-DD`) in {@link SIWES_TIME_ZONE}. */
export function todayYmd() {
  const parts = Object.fromEntries(todayFormatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

type PlacementDates = Pick<Placement, "start_date" | "end_date">;
export type WeekRange = { start_date: string; end_date: string };

/*
 * Logbook weeks are calendar weeks running Monday to Saturday (Sunday is never
 * logged). Week 1 is the week the placement starts in, so a Thursday start gives a
 * Thursday–Saturday first week; every later week is Monday–Saturday, and the last
 * week stops at the placement end. A weekend start begins on the next Monday, so
 * week 1 is never just an optional Saturday.
 */

/** Monday of week 1: the Monday on or before a weekday start, or the next Monday for a weekend start. */
function firstMonday(placement: PlacementDates) {
  const start = parseYmd(placement.start_date);
  const weekday = new Date(start).getUTCDay();
  if (weekday === 0) return start + DAY_MS;
  if (weekday === 6) return start + 2 * DAY_MS;
  return start - (weekday - 1) * DAY_MS;
}

export function getTotalWeeks(placement: PlacementDates) {
  return Math.max(1, Math.floor((parseYmd(placement.end_date) - firstMonday(placement)) / DAY_MS / 7) + 1);
}

/** Week N runs Monday to Saturday, clamped to the placement's start and end dates. */
export function getWeekRange(placement: PlacementDates, weekNumber: number): WeekRange {
  const monday = firstMonday(placement) + (weekNumber - 1) * 7 * DAY_MS;
  const start = Math.max(monday, parseYmd(placement.start_date));
  const end = Math.min(monday + 5 * DAY_MS, parseYmd(placement.end_date));
  return { start_date: toYmd(start), end_date: toYmd(Math.max(start, end)) };
}

/** The placement week that contains today; a Sunday still counts as the week it ends. */
export function getCurrentWeekNumber(placement: PlacementDates, today = todayYmd()) {
  const elapsed = Math.floor((parseYmd(today) - firstMonday(placement)) / DAY_MS);
  return Math.min(Math.max(Math.floor(elapsed / 7) + 1, 1), getTotalWeeks(placement));
}

export function hasPlacementStarted(placement: PlacementDates, today = todayYmd()) {
  return today >= placement.start_date;
}

export function hasPlacementEnded(placement: PlacementDates, today = todayYmd()) {
  return today > placement.end_date;
}

/** A week can only be logged once its first day has arrived. */
export function hasWeekStarted(range: WeekRange, today = todayYmd()) {
  return today >= range.start_date;
}

/** Weeks that have started and have no entry yet. Future weeks cannot be logged. */
export function getAvailableWeekNumbers(placement: PlacementDates, usedWeeks: number[], today = todayYmd()) {
  const used = new Set(usedWeeks);
  return Array.from({ length: getTotalWeeks(placement) }, (_, i) => i + 1).filter(
    (n) => !used.has(n) && hasWeekStarted(getWeekRange(placement, n), today)
  );
}

export interface WeekDay {
  day: Weekday;
  date: string;
  /** Saturday: can be logged, never required. */
  optional: boolean;
}

/** The loggable days (Mon–Sat) inside a week, in calendar order with their dates. */
export function getWeekDays(range: WeekRange): WeekDay[] {
  const days: WeekDay[] = [];
  for (let time = parseYmd(range.start_date); time <= parseYmd(range.end_date); time += DAY_MS) {
    const weekday = new Date(time).getUTCDay();
    if (weekday === 0) continue;
    const day = WEEKDAYS[weekday - 1];
    days.push({ day, date: toYmd(time), optional: OPTIONAL_WEEKDAYS.includes(day) });
  }
  return days;
}

/**
 * A week can be submitted once its last required day (normally Friday) has arrived,
 * so Saturday never holds a submission back. A week of only optional days opens on its last day.
 */
export function getSubmitOpensOn(range: WeekRange) {
  const days = getWeekDays(range);
  const required = days.filter((d) => !d.optional);
  const last = required[required.length - 1] ?? days[days.length - 1];
  return last ? last.date : range.end_date;
}

/**
 * Days whose text would change although they cannot be logged yet: the date has
 * not arrived, or the day falls outside the week. Used by the API to reject edits.
 */
export function getLockedDayEdits(range: WeekRange, next: string, previous: string | null, today = todayYmd()) {
  const open = new Set(getWeekDays(range).filter((d) => d.date <= today).map((d) => d.day));
  const nextDays = parseDailyLogs(next).days;
  const previousDays = parseDailyLogs(previous).days;
  return WEEKDAYS.filter((day) => !open.has(day) && nextDays[day].trim() !== previousDays[day].trim());
}
