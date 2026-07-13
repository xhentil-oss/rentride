import type { ScoringTier } from "../types";

// Thresholds: tier is earned when totalSpent crosses any threshold.
// Values are in EUR (the project currency).
export const TIER_THRESHOLDS: { tier: ScoringTier; minSpent: number; minBookings: number }[] = [
  { tier: "Diamond", minSpent: 50000, minBookings: 30 },
  { tier: "Platinum", minSpent: 15000, minBookings: 15 },
  { tier: "Gold", minSpent: 5000, minBookings: 8 },
  { tier: "Silver", minSpent: 1500, minBookings: 3 },
  { tier: "Bronze", minSpent: 0, minBookings: 0 },
];

/**
 * Compute the tier a customer qualifies for from their totals.
 * A customer earns a tier when EITHER spent OR booking count crosses
 * its threshold (whichever they hit first). Defaults to Bronze.
 */
export function calculateTier(totalSpent: number, bookingCount: number): ScoringTier {
  for (const { tier, minSpent, minBookings } of TIER_THRESHOLDS) {
    if (totalSpent >= minSpent || bookingCount >= minBookings) {
      return tier;
    }
  }
  return "Bronze";
}

/**
 * Returns the upgrade roadmap: which tier is next, and how much more
 * the customer needs to spend OR book to get there.
 */
export function nextTierProgress(totalSpent: number, bookingCount: number) {
  const currentTier = calculateTier(totalSpent, bookingCount);
  const idx = TIER_THRESHOLDS.findIndex((t) => t.tier === currentTier);
  if (idx <= 0) return null; // already at top tier (Diamond)
  const next = TIER_THRESHOLDS[idx - 1];
  return {
    nextTier: next.tier,
    spentToGo: Math.max(0, next.minSpent - totalSpent),
    bookingsToGo: Math.max(0, next.minBookings - bookingCount),
  };
}
