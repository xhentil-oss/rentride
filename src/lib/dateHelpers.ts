// Centralized date helpers. Use these instead of `new Date(string)` to avoid
// timezone shift bugs: a date-only string like "2026-06-01" is parsed by JS
// as UTC midnight, which can shift to the previous day in negative-offset
// locales after `toLocaleDateString()`.

/**
 * Parse a date-only string (YYYY-MM-DD) as a local Date.
 * Returns null if invalid. Tolerates trailing "T..." (ISO datetime input).
 */
export function parseLocalDate(value: string): Date | null {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Combine a date-only string + HH:MM string into a local Date.
 * Returns null if either part is invalid.
 */
export function buildLocalDateTime(
  dateValue: string,
  timeValue = "10:00",
): Date | null {
  const date = parseLocalDate(dateValue);
  const match = String(timeValue || "10:00").match(/^(\d{2}):(\d{2})$/);
  if (!date || !match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Convert any value to a YYYY-MM-DD string (for `<input type="date">`).
 * Accepts:
 * - Date object  → format as YYYY-MM-DD using local time components
 * - "YYYY-MM-DD" or "YYYY-MM-DDT..." string → returns first 10 chars
 * - anything else → today
 */
export function formatDateInputValue(
  value: string | Date = new Date(),
): string {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date-only string for display in sq-AL locale without timezone shift.
 * Returns empty string for invalid input.
 */
export function formatLocalDate(value?: string | Date | null): string {
  if (!value) return "";
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? parseLocalDate(value)
        : null;
  return date ? date.toLocaleDateString("sq-AL") : "";
}

/**
 * Difference in whole days between two date-only strings (or Dates).
 * Returns 0 if either is invalid. End-exclusive: 2026-06-01 → 2026-06-03 = 2.
 */
export function daysBetween(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): number {
  const startDate =
    start instanceof Date
      ? start
      : start
        ? parseLocalDate(start)
        : null;
  const endDate =
    end instanceof Date ? end : end ? parseLocalDate(end) : null;
  if (!startDate || !endDate) return 0;
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}
