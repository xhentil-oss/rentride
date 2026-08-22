// =========================================================
// MONTHLY / PERIOD RATES HELPER
// =========================================================
// A rate row is one of two kinds:
//   • MONTH  — `month` set (+ optional `year`), startDate/endDate null
//   • PERIOD — `startDate` + `endDate` set, `month` null
// A period covers an arbitrary window (e.g. 25 Gusht → 10 Shtator), letting an
// admin price a peak stretch without touching either whole month.
//
// SCOPE decides first, then kind: car > category > all, and only within one
// scope does a period beat that scope's month rate. So a global period never
// silently undercuts a price set on one specific car — to discount that car you
// set a period on the car itself. Among overlapping periods of equal scope the
// narrowest window wins.
// Mirrored on the server by backend/lib/monthlyRates.js — keep both in sync.
// =========================================================

export interface MonthlyRate {
  id: string;
  kind?: "month" | "period";
  year: number | null;
  month: number | null;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  label?: string | null;
  appliesTo: string; // "all" | "category" | "car"
  appliesToValue: string | null; // category name or car id
  pricePerDay: number;
  notes?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day of a Date as YYYY-MM-DD — matches the day the admin picked. */
export function dayKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normDay(value?: string | null): string | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function isPeriodRate(r: MonthlyRate): boolean {
  return Boolean(normDay(r.startDate) && normDay(r.endDate));
}

function spanDays(r: MonthlyRate): number {
  const s = normDay(r.startDate);
  const e = normDay(r.endDate);
  if (!s || !e) return Number.MAX_SAFE_INTEGER;
  return Math.round((Date.parse(`${e}T00:00:00Z`) - Date.parse(`${s}T00:00:00Z`)) / DAY_MS);
}

// Prices can arrive as strings from the API (DECIMAL column) — always coerce.
function priceOf(r: MonthlyRate): number | null {
  const n = Number(r.pricePerDay);
  return Number.isFinite(n) ? n : null;
}

// car > category > all
function pickByScope(candidates: MonthlyRate[], carId: string, carCategory: string): MonthlyRate | null {
  return (
    candidates.find((r) => r.appliesTo === "car" && r.appliesToValue === carId)
    ?? candidates.find((r) => r.appliesTo === "category" && r.appliesToValue === carCategory)
    ?? candidates.find((r) => r.appliesTo === "all")
    ?? null
  );
}

// Scope tests, most specific first — the order the resolver walks.
function scopeChain(carId: string, carCategory: string): Array<(r: MonthlyRate) => boolean> {
  return [
    (r) => r.appliesTo === "car" && r.appliesToValue === carId,
    (r) => r.appliesTo === "category" && r.appliesToValue === carCategory,
    (r) => r.appliesTo === "all",
  ];
}

/**
 * Price per day applicable to a specific calendar day, or null if nothing covers it.
 * Walks scopes from most to least specific; the first scope that has anything to
 * say decides, preferring its period over its month rate.
 */
export function resolveRateForDate(
  rates: MonthlyRate[],
  carId: string,
  carCategory: string,
  date: Date
): number | null {
  const key = dayKeyOf(date);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  for (const inScope of scopeChain(carId, carCategory)) {
    const scoped = rates.filter(inScope);
    if (!scoped.length) continue;

    const period = scoped
      .filter((r) => {
        const s = normDay(r.startDate);
        const e = normDay(r.endDate);
        return Boolean(s && e && s <= key && key <= e);
      })
      .sort((a, b) => spanDays(a) - spanDays(b))[0]; // narrowest window wins
    if (period) {
      const p = priceOf(period);
      if (p !== null) return p;
    }

    const monthRate = scoped.find(
      (r) => !isPeriodRate(r) && Number(r.month) === month && (r.year === null || r.year === undefined || Number(r.year) === year)
    );
    if (monthRate) {
      const p = priceOf(monthRate);
      if (p !== null) return p;
    }
  }

  return null;
}

/**
 * Backwards-compatible month/year lookup — ignores period rates, since a whole
 * month is not a single day. Prefer resolveRateForDate for anything price-facing.
 */
export function resolveMonthlyRate(
  rates: MonthlyRate[],
  carId: string,
  carCategory: string,
  month: number,
  year: number
): number | null {
  const months = rates.filter(
    (r) => !isPeriodRate(r) && Number(r.month) === month && (r.year === null || r.year === undefined || Number(r.year) === year)
  );
  const rate = pickByScope(months, carId, carCategory);
  return rate ? priceOf(rate) : null;
}

/**
 * Calculate total price for a date range, charging each day at its own
 * applicable rate (period > month > car base price).
 * Returns { total, usedMonthlyRate, effectiveDailyRate }.
 */
export function calcTotalWithMonthlyRates(
  rates: MonthlyRate[],
  carId: string,
  carCategory: string,
  basePricePerDay: number,
  startDate: Date,
  endDate: Date
): { total: number; effectiveDailyRate: number; usedMonthlyRate: boolean } {
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const days = Math.max(1, Math.ceil((end.getTime() - current.getTime()) / DAY_MS));

  // Prices may arrive as strings (DECIMAL column) — without this coercion `+`
  // would concatenate text and the total would come out NaN.
  const base = Number.isFinite(Number(basePricePerDay)) ? Number(basePricePerDay) : 0;

  let total = 0;
  let usedMonthlyRate = false;

  for (let i = 0; i < days; i += 1) {
    const rate = resolveRateForDate(rates, carId, carCategory, current);
    if (rate !== null) {
      total += rate;
      usedMonthlyRate = true;
    } else {
      total += base;
    }
    current.setDate(current.getDate() + 1);
  }

  total = Math.round(total * 100) / 100;
  const effectiveDailyRate = days > 0 ? Math.round((total / days) * 100) / 100 : base;

  return { total, effectiveDailyRate, usedMonthlyRate };
}
