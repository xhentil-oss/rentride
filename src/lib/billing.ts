// Rental-day counting, shared by every price shown to the customer or admin.
// Mirrored on the backend by backend/lib/billing.js — keep both in sync.
//
// A rental day is 24 HOURS from the pickup time, not a calendar day. After each
// 24h block there is a grace period (60 min by default, admin-configurable via
// the `booking_grace_minutes` setting); returning inside it costs nothing,
// returning after it costs a full extra day.
//
//   pickup Tue 11:30 → Fri 11:30  = 72h00 → 3 days
//   pickup Tue 11:30 → Fri 12:30  = 73h00 → 3 days (inside grace)
//   pickup Tue 11:30 → Fri 12:31  = 73h01 → 4 days

export const DEFAULT_GRACE_MINUTES = 60;
const DAY_MS = 86400000;

export function billableDays(
  start: Date | null | undefined,
  end: Date | null | undefined,
  graceMinutes: number = DEFAULT_GRACE_MINUTES,
): number {
  if (!start || !end) return 0;
  const s = start.getTime();
  const e = end.getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  const grace = Math.max(0, Number(graceMinutes) || 0) * 60000;
  // Round to the minute first so 23:45 − 11:30 never lands on 12h14m59.999s.
  const minutes = Math.round((e - s) / 60000);
  const billableMs = Math.max(0, minutes * 60000 - grace);
  return Math.max(1, Math.ceil(billableMs / DAY_MS));
}

/** Parse the admin setting as served by /api/settings/public. */
export function graceMinutesFromSettings(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_GRACE_MINUTES;
}
