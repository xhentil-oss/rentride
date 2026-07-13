// =========================================================
// PRICING RULES ENGINE — Car Rental Albania
// =========================================================
// Applies admin-created PricingRule records on top of the
// seasonal base price. Rules are stacked by priority (desc).
// Only the single highest-priority matching rule is applied
// (no double-stacking), unless type is "promo_code" which
// stacks separately.
// =========================================================

export interface PricingRule {
  id: string;
  name: string;
  type: string; // seasonal | early_bird | last_minute | promo_code | length_of_stay | weekend
  discountType: string; // percent | fixed
  discountValue: number;
  direction?: string;   // "discount" (default) | "surcharge"
  startDate: Date;
  endDate: Date;
  minDays?: number;
  maxDays?: number;
  advanceBookingDays?: number;
  lastMinuteHours?: number;
  promoCode?: string;
  applicableTo: string; // "all" | "category:SUV" | "category:Luksoze" | carId
  isActive: boolean;
  priority: number;
  description?: string;
  usageCount?: number;
  maxUsages?: number;
}

export interface RuleMatchContext {
  carId: string;
  carCategory: string;
  startDate: Date;
  endDate: Date;
  days: number;
  bookingDate: Date; // when is the booking being made (now)
  promoCode?: string;
}

export interface AppliedDiscount {
  rule: PricingRule;
  discountAmount: number; // in euros
  label: string;
}

export interface PricingResult {
  basePrice: number;          // after seasonal calculation
  appliedDiscounts: AppliedDiscount[];
  totalDiscount: number;
  finalPrice: number;
  savings: number;
}

export const RULE_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  seasonal:        { label: "Sezonale",        emoji: "📅", color: "bg-blue-100 text-blue-700 border-blue-200" },
  early_bird:      { label: "Early Bird",      emoji: "🐦", color: "bg-green-100 text-green-700 border-green-200" },
  last_minute:     { label: "Last Minute",     emoji: "⚡", color: "bg-orange-100 text-orange-700 border-orange-200" },
  promo_code:      { label: "Kod Promovues",   emoji: "🎟️", color: "bg-purple-100 text-purple-700 border-purple-200" },
  length_of_stay:  { label: "Qëndrim i gjatë", emoji: "📆", color: "bg-teal-100 text-teal-700 border-teal-200" },
  weekend:         { label: "Fundjavë",        emoji: "🎉", color: "bg-pink-100 text-pink-700 border-pink-200" },
  min_duration:    { label: "Minimum ditësh",  emoji: "⏱️", color: "bg-red-100 text-red-700 border-red-200" },
};

/** Check if a rule's date window covers the reservation period */
function isDateWindowActive(rule: PricingRule, startDate: Date, endDate: Date): boolean {
  // If no date restriction, rule is always active
  if (!rule.startDate && !rule.endDate) return true;
  const ruleStart = rule.startDate ? new Date(rule.startDate) : new Date(0);
  const ruleEnd = rule.endDate ? new Date(rule.endDate) : new Date("2099-12-31");
  // Rule must overlap with the booking window
  return startDate <= ruleEnd && endDate >= ruleStart;
}

/** Check if the rule applies to this specific car/category */
function isApplicableTocar(rule: PricingRule, carId: string, carCategory: string): boolean {
  if (rule.applicableTo === "all") return true;
  if (rule.applicableTo === `category:${carCategory}`) return true;
  if (rule.applicableTo === carId) return true;
  return false;
}

/** Check if usage limit is still available */
function isUsageAvailable(rule: PricingRule): boolean {
  if (!rule.maxUsages || rule.maxUsages === 0) return true;
  return (rule.usageCount ?? 0) < rule.maxUsages;
}

/**
 * Check if a rule's specific conditions are met for a booking context
 */
export function doesRuleMatch(rule: PricingRule, ctx: RuleMatchContext): boolean {
  if (!rule.isActive) return false;
  if (!isDateWindowActive(rule, ctx.startDate, ctx.endDate)) return false;
  if (!isApplicableTocar(rule, ctx.carId, ctx.carCategory)) return false;
  if (!isUsageAvailable(rule)) return false;

  switch (rule.type) {
    case "seasonal":
      // Date window check is enough — the rule is active during the window
      return true;

    case "early_bird": {
      if (!rule.advanceBookingDays) return false;
      const daysInAdvance = Math.floor(
        (ctx.startDate.getTime() - ctx.bookingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysInAdvance >= rule.advanceBookingDays;
    }

    case "last_minute": {
      if (!rule.lastMinuteHours) return false;
      const hoursUntilPickup =
        (ctx.startDate.getTime() - ctx.bookingDate.getTime()) / (1000 * 60 * 60);
      return hoursUntilPickup > 0 && hoursUntilPickup <= rule.lastMinuteHours;
    }

    case "promo_code": {
      if (!rule.promoCode || !ctx.promoCode) return false;
      return rule.promoCode.toUpperCase() === ctx.promoCode.toUpperCase();
    }

    case "length_of_stay": {
      const meetsMin = !rule.minDays || ctx.days >= rule.minDays;
      const meetsMax = !rule.maxDays || ctx.days <= rule.maxDays;
      return meetsMin && meetsMax;
    }

    case "weekend": {
      // Active if start date falls on Friday or Saturday
      const dayOfWeek = ctx.startDate.getDay(); // 0=Sun, 5=Fri, 6=Sat
      return dayOfWeek === 5 || dayOfWeek === 6;
    }

    case "min_duration":
      // Not a discount — handled separately via getMinDaysRequirement()
      return false;

    default:
      return false;
  }
}

/**
 * Returns the minimum booking days required for the given car/context,
 * based on active min_duration rules. Returns 0 if no restriction applies.
 */
export function getMinDaysRequirement(rules: PricingRule[], ctx: Omit<RuleMatchContext, 'days' | 'bookingDate' | 'promoCode'>): number {
  const matching = rules.filter(r =>
    r.type === "min_duration" &&
    r.isActive &&
    isApplicableTocar(r, ctx.carId, ctx.carCategory) &&
    isDateWindowActive(r, ctx.startDate, ctx.endDate)
  );
  if (matching.length === 0) return 0;
  return Math.max(...matching.map(r => r.minDays ?? 0));
}

/**
 * Pre-apply surcharge rules directly to pricePerDay so the customer sees a single
 * higher daily rate instead of a separate surcharge line.
 *
 * Only the highest-priority surcharge rule (non-promo) wins, same logic as the
 * main engine.  Returns the adjusted pricePerDay and the IDs of absorbed rules
 * so the main engine can skip them.
 */
export function absorbSurchargesToPricePerDay(
  rules: PricingRule[],
  pricePerDay: number,
  ctx: RuleMatchContext
): { adjustedPricePerDay: number; absorbedIds: string[] } {
  if (ctx.days === 0) return { adjustedPricePerDay: pricePerDay, absorbedIds: [] };

  const matching = rules
    .filter((r) => doesRuleMatch(r, ctx) && r.direction === "surcharge" && r.type !== "promo_code")
    .sort((a, b) => b.priority - a.priority);

  if (matching.length === 0) return { adjustedPricePerDay: pricePerDay, absorbedIds: [] };

  const top = matching[0];
  const value = Number(top.discountValue);
  let delta: number;
  if (top.discountType === "percent") {
    delta = Math.round(pricePerDay * (value / 100) * 100) / 100;
  } else {
    // fixed amount is total — spread over days to get per-day delta
    delta = Math.round((value / ctx.days) * 100) / 100;
  }

  return {
    adjustedPricePerDay: Math.round((pricePerDay + delta) * 100) / 100,
    absorbedIds: [top.id],
  };
}

/**
 * Calculate the adjustment amount for a single rule applied to a base price.
 * Returns a positive number; caller determines if it's added or subtracted.
 */
export function calcRuleDiscount(rule: PricingRule, basePrice: number): number {
  // MySQL DECIMAL columns return as strings — always coerce to number first
  const value = Number(rule.discountValue);
  if (rule.discountType === "percent") {
    return Math.round(basePrice * (value / 100) * 100) / 100;
  }
  // fixed — for surcharge, full amount; for discount, capped at basePrice
  if (rule.direction === "surcharge") return value;
  return Math.min(value, basePrice);
}

/**
 * Main engine: given all active pricing rules and a booking context,
 * returns the best stack of discounts to apply.
 *
 * Rule stacking logic:
 * - promo_code rules stack on top of everything (additive)
 * - All other rules: only the single highest-priority rule wins
 */
export function applyPricingRules(
  rules: PricingRule[],
  basePrice: number,
  ctx: RuleMatchContext
): PricingResult {
  const matching = rules
    .filter((r) => doesRuleMatch(r, ctx))
    .sort((a, b) => b.priority - a.priority);

  const appliedDiscounts: AppliedDiscount[] = [];
  let priceAfterRegular = basePrice;

  // Apply the single highest-priority NON-promo rule
  const regularRules = matching.filter((r) => r.type !== "promo_code");
  if (regularRules.length > 0) {
    const top = regularRules[0];
    const amount = calcRuleDiscount(top, basePrice);
    const isSurcharge = top.direction === "surcharge";
    priceAfterRegular = isSurcharge ? basePrice + amount : basePrice - amount;
    const meta = RULE_TYPE_LABELS[top.type] ?? { label: top.type, emoji: "🏷️", color: "" };
    appliedDiscounts.push({
      rule: top,
      discountAmount: isSurcharge ? -amount : amount,
      label: `${meta.emoji} ${top.name}`,
    });
  }

  // Apply promo code on top (stacks)
  let finalPrice = priceAfterRegular;
  const promoRules = matching.filter((r) => r.type === "promo_code");
  for (const promo of promoRules) {
    const amount = calcRuleDiscount(promo, priceAfterRegular);
    const isSurcharge = promo.direction === "surcharge";
    finalPrice = isSurcharge ? finalPrice + amount : finalPrice - amount;
    appliedDiscounts.push({
      rule: promo,
      discountAmount: isSurcharge ? -amount : amount,
      label: `🎟️ ${promo.name}`,
    });
  }

  finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);
  const totalDiscount = Math.round((basePrice - finalPrice) * 100) / 100;

  return {
    basePrice,
    appliedDiscounts,
    totalDiscount,
    finalPrice,
    savings: totalDiscount,
  };
}

/** Generate a human-readable condition description for a rule */
export function ruleConditionSummary(rule: PricingRule): string {
  const parts: string[] = [];
  const start = new Date(rule.startDate).toLocaleDateString("sq-AL", { day: "numeric", month: "short", year: "numeric" });
  const end = new Date(rule.endDate).toLocaleDateString("sq-AL", { day: "numeric", month: "short", year: "numeric" });
  parts.push(`Aktive: ${start} – ${end}`);

  if (rule.type === "early_bird" && rule.advanceBookingDays) {
    parts.push(`Rezervo ≥${rule.advanceBookingDays} ditë para`);
  }
  if (rule.type === "last_minute" && rule.lastMinuteHours) {
    parts.push(`Brenda ${rule.lastMinuteHours}h para marrjes`);
  }
  if (rule.type === "length_of_stay") {
    if (rule.minDays && rule.maxDays) parts.push(`${rule.minDays}–${rule.maxDays} ditë`);
    else if (rule.minDays) parts.push(`≥${rule.minDays} ditë`);
    else if (rule.maxDays) parts.push(`≤${rule.maxDays} ditë`);
  }
  if (rule.type === "promo_code" && rule.promoCode) {
    parts.push(`Kod: ${rule.promoCode}`);
  }
  if (rule.type === "min_duration" && rule.minDays) {
    parts.push(`Minimum: ${rule.minDays} ditë`);
  }
  if (rule.applicableTo !== "all") {
    parts.push(`Vetëm: ${rule.applicableTo.startsWith("category:") ? rule.applicableTo.replace("category:", "Kategoria ") : "Makinë specifike"}`);
  }
  if (rule.maxUsages && rule.maxUsages > 0) {
    parts.push(`Max ${rule.maxUsages} përdorime`);
  }
  return parts.join(" · ");
}
