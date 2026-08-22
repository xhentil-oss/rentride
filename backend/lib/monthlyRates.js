// Resolver for the "Çmimet Mujore" table. A rate row is one of two kinds:
//   • MONTH  — `month` set (+ optional `year`), start_date/end_date NULL
//   • PERIOD — `start_date` + `end_date` set, `month` NULL
// A period covers an arbitrary window (e.g. 25 Gusht → 10 Shtator) and wins
// over the month rates it overlaps, so an admin can price a peak stretch
// without touching either whole month. Within the same kind the usual scope
// priority applies: car > category > all; among overlapping periods of equal
// scope the narrowest window wins (most specific intent).
// Mirrored on the frontend by src/lib/monthlyRates.ts — keep both in sync.

const DAY_MS = 86400000;

// DATE columns arrive as Date objects (or strings) — normalise to YYYY-MM-DD.
const toDayKey = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

// Calendar day of a Date in local time — matches the day the admin picked.
const dayKeyOf = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isPeriod = (r) => Boolean(toDayKey(r.start_date) && toDayKey(r.end_date));

const spanDays = (r) => {
  const s = toDayKey(r.start_date);
  const e = toDayKey(r.end_date);
  if (!s || !e) return Number.MAX_SAFE_INTEGER;
  return Math.round((Date.parse(`${e}T00:00:00Z`) - Date.parse(`${s}T00:00:00Z`)) / DAY_MS);
};

// car > category > all. `candidates` is assumed pre-sorted by specificity.
const pickByScope = (candidates, carId, carCategory) =>
  candidates.find((r) => r.applies_to === 'car' && r.applies_to_value === carId)
  || candidates.find((r) => r.applies_to === 'category' && r.applies_to_value === carCategory)
  || candidates.find((r) => r.applies_to === 'all')
  || null;

const priceOf = (rate) => {
  const n = Number(rate.price_per_day);
  return Number.isFinite(n) ? n : null;
};

/**
 * Price per day applicable to `date`, or null when nothing covers it.
 */
function resolveRateForDate(rates, carId, carCategory, date) {
  const key = dayKeyOf(date);

  const periods = rates
    .filter((r) => isPeriod(r) && toDayKey(r.start_date) <= key && key <= toDayKey(r.end_date))
    .sort((a, b) => spanDays(a) - spanDays(b));
  const period = pickByScope(periods, carId, carCategory);
  if (period) {
    const p = priceOf(period);
    if (p !== null) return p;
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const months = rates.filter((r) => !isPeriod(r)
    && Number(r.month) === month
    && (r.year === null || r.year === undefined || Number(r.year) === year));
  const monthRate = pickByScope(months, carId, carCategory);
  if (monthRate) return priceOf(monthRate);

  return null;
}

/**
 * Sum each day of the rental at its own applicable rate, falling back to the
 * car's base price for days no rate covers.
 */
function sumRateForRange(rates, carId, carCategory, basePricePerDay, startDate, days) {
  const base = Number.isFinite(Number(basePricePerDay)) ? Number(basePricePerDay) : 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  let total = 0;
  let usedRate = false;
  for (let i = 0; i < days; i += 1) {
    const rate = resolveRateForDate(rates, carId, carCategory, cursor);
    if (rate !== null) { total += rate; usedRate = true; } else { total += base; }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { total: Math.round(total * 100) / 100, usedRate };
}

module.exports = { resolveRateForDate, sumRateForRange, toDayKey, isPeriod };
