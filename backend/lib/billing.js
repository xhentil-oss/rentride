// Rental-day counting, shared by every price calculation on the server.
// Mirrored on the frontend by src/lib/billing.ts — keep both in sync.
//
// Industry rule (Hertz/Avis/Sixt/Europcar): a rental day is 24 HOURS from the
// pickup time, not a calendar day. After each 24h block there is a grace period
// (here 60 min by default, admin-configurable via `booking_grace_minutes`);
// returning inside it costs nothing, returning after it costs a full extra day.
//
//   pickup Tue 11:30 → Fri 11:30  = 72h00 → 3 days
//   pickup Tue 11:30 → Fri 12:30  = 73h00 → 3 days (inside grace)
//   pickup Tue 11:30 → Fri 12:31  = 73h01 → 4 days
const pool = require('../database/db');

const DEFAULT_GRACE_MINUTES = 60;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

function billableDays(start, end, graceMinutes = DEFAULT_GRACE_MINUTES) {
  const s = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const e = end instanceof Date ? end.getTime() : new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  const grace = Math.max(0, Number(graceMinutes) || 0) * 60000;
  // Round to the minute first so 23:45 − 11:30 never lands on 12h14m59.999s.
  const minutes = Math.round((e - s) / 60000);
  const billableMs = Math.max(0, minutes * 60000 - grace);
  return Math.max(1, Math.ceil(billableMs / DAY_MS));
}

// Cached read of the admin setting (60s) — the booking form and the server
// must agree, and the public settings endpoint serves the same value.
let cache = { value: DEFAULT_GRACE_MINUTES, at: 0 };
async function getGraceMinutes() {
  if (Date.now() - cache.at < 60000) return cache.value;
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'booking_grace_minutes' LIMIT 1"
    );
    const n = rows.length ? Number(rows[0].setting_value) : NaN;
    cache = { value: Number.isFinite(n) && n >= 0 ? n : DEFAULT_GRACE_MINUTES, at: Date.now() };
  } catch {
    cache = { value: DEFAULT_GRACE_MINUTES, at: Date.now() };
  }
  return cache.value;
}

function invalidateGraceCache() { cache = { value: DEFAULT_GRACE_MINUTES, at: 0 }; }

module.exports = { billableDays, getGraceMinutes, invalidateGraceCache, DEFAULT_GRACE_MINUTES, HOUR_MS };
