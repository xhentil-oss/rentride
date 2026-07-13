// Server-side pricing surcharges. Mirrors the frontend engine
// (src/lib/pricingRules.ts → absorbSurchargesToPricePerDay): only the single
// highest-priority matching SURCHARGE rule is applied, added to the rental
// subtotal so the price the customer sees on the booking page is what actually
// gets stored/charged. Discounts stay display-only (unchanged behaviour).
const pool = require('../database/db');

function isDateWindowActive(rule, startDate, endDate) {
  if (!rule.start_date && !rule.end_date) return true;
  const rs = rule.start_date ? new Date(rule.start_date) : new Date(0);
  const re = rule.end_date ? new Date(rule.end_date) : new Date('2099-12-31');
  return startDate <= re && endDate >= rs;
}

function isApplicable(rule, carId, carCategory) {
  const a = rule.applicable_to || 'all';
  return a === 'all' || a === `category:${carCategory}` || a === carId;
}

function usageAvailable(rule) {
  if (!rule.max_usages || rule.max_usages === 0) return true;
  return (rule.usage_count || 0) < rule.max_usages;
}

function ruleMatches(rule, ctx) {
  if (!rule.is_active) return false;
  if (!isDateWindowActive(rule, ctx.startDate, ctx.endDate)) return false;
  if (!isApplicable(rule, ctx.carId, ctx.carCategory)) return false;
  if (!usageAvailable(rule)) return false;

  switch (rule.type) {
    case 'seasonal':
      return true;
    case 'early_bird': {
      if (!rule.advance_booking_days) return false;
      const days = Math.floor((ctx.startDate.getTime() - ctx.bookingDate.getTime()) / 86400000);
      return days >= rule.advance_booking_days;
    }
    case 'last_minute': {
      if (!rule.last_minute_hours) return false;
      const hrs = (ctx.startDate.getTime() - ctx.bookingDate.getTime()) / 3600000;
      return hrs > 0 && hrs <= rule.last_minute_hours;
    }
    case 'length_of_stay': {
      const okMin = !rule.min_days || ctx.days >= rule.min_days;
      const okMax = !rule.max_days || ctx.days <= rule.max_days;
      return okMin && okMax;
    }
    case 'weekend': {
      const dow = ctx.startDate.getDay(); // 5=Fri, 6=Sat
      return dow === 5 || dow === 6;
    }
    default:
      return false; // promo_code / min_duration are not auto-applied here
  }
}

/**
 * Returns the surcharge (euros) to ADD to the rental subtotal for this booking,
 * plus the winning rule (or null). ctx: { carId, carCategory, startDate:Date,
 * endDate:Date, days, bookingDate:Date, rentalSubtotal }.
 */
async function surchargeForBooking(ctx) {
  if (!ctx.days || ctx.days <= 0) return { amount: 0, rule: null };
  let rules;
  try {
    [rules] = await pool.query(
      "SELECT * FROM pricing_rules WHERE is_active = 1 AND direction = 'surcharge' AND type <> 'promo_code'"
    );
  } catch {
    return { amount: 0, rule: null };
  }
  const matching = rules
    .filter((r) => ruleMatches(r, ctx))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  if (!matching.length) return { amount: 0, rule: null };

  const top = matching[0];
  const value = Number(top.discount_value) || 0;
  const amount = top.discount_type === 'percent'
    ? Math.round(ctx.rentalSubtotal * (value / 100) * 100) / 100
    : value; // fixed = full amount added to the rental
  return { amount, rule: top };
}

module.exports = { surchargeForBooking };
