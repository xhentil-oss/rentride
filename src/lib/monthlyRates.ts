// =========================================================
// MONTHLY RATES HELPER
// =========================================================
// Resolves the applicable monthly rate for a car/category/all,
// with priority: car-specific > category > all.
// Returns the price per day, or null if no monthly rate set.
// =========================================================

export interface MonthlyRate {
  id: string;
  year: number | null;
  month: number;
  appliesTo: string; // "all" | "category" | "car"
  appliesToValue: string | null; // category name or car id
  pricePerDay: number;
  notes?: string;
}

/**
 * Find the best monthly rate for a given car, month and year.
 * Priority: car-specific > category > all
 */
export function resolveMonthlyRate(
  rates: MonthlyRate[],
  carId: string,
  carCategory: string,
  month: number,
  year: number
): number | null {
  const matching = rates.filter(
    (r) =>
      Number(r.month) === month &&
      (r.year === null || Number(r.year) === year)
  );

  if (matching.length === 0) return null;

  // Car-specific (highest priority)
  const carRate = matching.find(
    (r) => r.appliesTo === "car" && r.appliesToValue === carId
  );
  if (carRate) return carRate.pricePerDay;

  // Category
  const catRate = matching.find(
    (r) => r.appliesTo === "category" && r.appliesToValue === carCategory
  );
  if (catRate) return catRate.pricePerDay;

  // All
  const allRate = matching.find((r) => r.appliesTo === "all");
  if (allRate) return allRate.pricePerDay;

  return null;
}

/**
 * Calculate total price for a date range using monthly rates.
 * If a monthly rate exists for a given day's month, uses it instead of base price.
 * Returns { total, usedMonthlyRate: true/false, effectiveDailyRate }.
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

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.ceil((end.getTime() - current.getTime()) / msPerDay));

  let total = 0;
  let usedMonthlyRate = false;

  for (let i = 0; i < days; i += 1) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    const rate = resolveMonthlyRate(rates, carId, carCategory, month, year);
    if (rate !== null) {
      total += rate;
      usedMonthlyRate = true;
    } else {
      total += basePricePerDay;
    }
    current.setDate(current.getDate() + 1);
  }

  total = Math.round(total * 100) / 100;
  const effectiveDailyRate = days > 0 ? Math.round((total / days) * 100) / 100 : basePricePerDay;

  return { total, effectiveDailyRate, usedMonthlyRate };
}
