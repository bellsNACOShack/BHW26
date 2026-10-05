const calendarDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const localDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `YYYY-MM-DD` values are calendar dates; format them in UTC so they never shift a day. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const isCalendarDate = value.length === 10;
  const date = new Date(isCalendarDate ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return (isCalendarDate ? calendarDateFormatter : localDateFormatter).format(date);
}

/** Short `YYYY-MM-DD` label without the year, e.g. "5 Oct". */
export function formatDayMonth(value: string) {
  return dayMonthFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

export function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function firstName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

export function initials(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
