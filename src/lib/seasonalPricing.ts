// =========================================================
// SEASONAL PRICING — Car Rental Albania
// =========================================================
// Seasons are defined by month ranges (1-based months).
// Multiplier is applied to the car's base pricePerDay.
// =========================================================

export interface Season {
  id: string;
  label: string;           // Albanian label shown to user
  labelEn: string;         // English label
  months: number[];        // 1-12 month numbers that belong to this season
  multiplier: number;      // 1.0 = no change, 1.3 = +30%, 0.85 = -15%
  badgeColor: string;      // Tailwind classes for badge
  description: string;     // Short description shown to user
  emoji: string;
}

export const SEASONS: Season[] = [
  {
    id: "low",
    label: "Sezon i ulët",
    labelEn: "Low Season",
    months: [1, 2, 11],
    multiplier: 0.85,
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Çmimet janë 15% më të ulëta gjatë muajve janar, shkurt dhe nëntor.",
    emoji: "❄️",
  },
  {
    id: "normal",
    label: "Sezon normal",
    labelEn: "Regular Season",
    months: [3, 4, 10, 12],
    multiplier: 1.0,
    badgeColor: "bg-neutral-100 text-neutral-600 border-neutral-200",
    description: "Çmimet standarde pa ndonjë shtesa ose zbritje sezonale.",
    emoji: "🌤️",
  },
  {
    id: "high",
    label: "Sezon i lartë",
    labelEn: "High Season",
    months: [5, 6, 9],
    multiplier: 1.2,
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Kërkesa e lartë në maj, qershor dhe shtator: +20% mbi çmimin bazë.",
    emoji: "☀️",
  },
  {
    id: "peak",
    label: "Sezon kulminant",
    labelEn: "Peak Season",
    months: [7, 8],
    multiplier: 1.4,
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Korrik dhe gusht janë muajt me kërkesën më të lartë: +40% mbi çmimin bazë.",
    emoji: "🔥",
  },
];

/** Returns the Season for a given Date (or today if not provided) */
export function getSeasonForDate(date: Date = new Date()): Season {
  const month = date.getMonth() + 1; // getMonth() is 0-based
  return SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[1]; // fallback to normal
}

/** Returns the seasonal price per day (rounded to 2 decimals) */
export function getSeasonalPricePerDay(basePrice: number, date: Date = new Date()): number {
  const base = Number(basePrice);
  if (!Number.isFinite(base)) return 0;
  const season = getSeasonForDate(date);
  return Math.round(base * season.multiplier * 100) / 100;
}

/**
 * Calculates the total price for a date range, applying the correct seasonal
 * multiplier for each day individually.
 */
export function calculateSeasonalTotal(
  basePrice: number,
  startDate: Date,
  endDate: Date
): { total: number; breakdown: { season: Season; days: number; pricePerDay: number; subtotal: number }[] } {
  const breakdown: { season: Season; days: number; pricePerDay: number; subtotal: number }[] = [];
  const base = Number.isFinite(Number(basePrice)) ? Number(basePrice) : 0;

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.ceil((end.getTime() - current.getTime()) / msPerDay));

  for (let i = 0; i < days; i += 1) {
    const season = getSeasonForDate(current);
    const pricePerDay = Math.round(base * season.multiplier * 100) / 100;
    const existing = breakdown.find((b) => b.season.id === season.id);
    if (existing) {
      existing.days += 1;
      existing.subtotal = Math.round((existing.subtotal + pricePerDay) * 100) / 100;
    } else {
      breakdown.push({ season, days: 1, pricePerDay, subtotal: pricePerDay });
    }
    current.setDate(current.getDate() + 1);
  }

  const total = breakdown.reduce((sum, b) => sum + b.subtotal, 0);
  return { total: Math.round(total * 100) / 100, breakdown };
}

/** Returns the dominant season for a date range (the one with most days) */
export function getDominantSeason(startDate: Date, endDate: Date): Season {
  const { breakdown } = calculateSeasonalTotal(1, startDate, endDate);
  if (breakdown.length === 0) return SEASONS[1];
  return breakdown.reduce((a, b) => (a.days >= b.days ? a : b)).season;
}

/** All 4 seasons summary — useful for showing pricing table to users */
export function getAllSeasonPrices(basePrice: number): { season: Season; pricePerDay: number }[] {
  return SEASONS.map((s) => ({
    season: s,
    pricePerDay: Math.round(basePrice * s.multiplier * 100) / 100,
  }));
}
