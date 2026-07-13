// Single source of truth for pickup / drop-off locations on the frontend.
//
// The authoritative list lives in the backend (`backend/routes/reservations.js`
// `LOCATION_FEES` + `FREE_LOCATIONS`) and is exposed via `/api/settings/public`.
// This module mirrors the same values as a fallback so the UI still works when
// the public-settings endpoint is unreachable, and provides helpers for
// building dropdown options with consistent icons / fee labels across pages.

export type LocationOption = {
  value: string;
  label: string;
  icon: string;
  fee: number; // surcharge in EUR (0 = free)
};

// Defaults — MUST mirror backend/routes/reservations.js constants.
export const DEFAULT_LOCATION_FEES: Record<string, number> = {
  "Aeroporti Nënë Tereza": 10,
  "Durrës": 15,
  "Vlorë": 20,
  "Sarandë": 25,
  "Shkodër": 20,
};

export const DEFAULT_FREE_LOCATIONS: string[] = ["Tiranë Qendër"];

// Display metadata (icon + optional override label) keyed by canonical value.
const LOCATION_META: Record<string, { icon: string; labelEn?: string }> = {
  "Tiranë Qendër":           { icon: "🏙️", labelEn: "Tirana — City Center" },
  "Aeroporti Nënë Tereza":   { icon: "✈️", labelEn: "Tirana International Airport (TIA)" },
  "Durrës":                  { icon: "🏖️", labelEn: "Durrës" },
  "Vlorë":                   { icon: "⛵",  labelEn: "Vlorë" },
  "Sarandë":                 { icon: "🌊", labelEn: "Sarandë" },
  "Shkodër":                 { icon: "🏔️", labelEn: "Shkodër" },
};

export function buildLocationOptions(
  fees: Record<string, number> = DEFAULT_LOCATION_FEES,
  free: string[] = DEFAULT_FREE_LOCATIONS,
  lang: "sq" | "en" = "sq",
): LocationOption[] {
  const seen = new Set<string>();
  const out: LocationOption[] = [];

  // Free locations first (no fee, listed at the top).
  for (const v of free) {
    if (seen.has(v)) continue;
    seen.add(v);
    const meta = LOCATION_META[v] || { icon: "📍" };
    out.push({
      value: v,
      label: lang === "en" && meta.labelEn ? meta.labelEn : v,
      icon: meta.icon,
      fee: 0,
    });
  }

  // Paid locations sorted by fee asc, then alpha.
  const paid = Object.entries(fees)
    .filter(([v]) => !seen.has(v))
    .sort(([a, fa], [b, fb]) => (fa - fb) || a.localeCompare(b));

  for (const [v, f] of paid) {
    seen.add(v);
    const meta = LOCATION_META[v] || { icon: "📍" };
    out.push({
      value: v,
      label: lang === "en" && meta.labelEn ? meta.labelEn : v,
      icon: meta.icon,
      fee: f,
    });
  }
  return out;
}

// Format an option for display in a `<option>` element.
export function formatLocationOption(opt: LocationOption): string {
  return `${opt.icon} ${opt.label}${opt.fee > 0 ? ` (+€${opt.fee})` : ""}`;
}

/** Location label WITHOUT the fee — used in the homepage search form. */
export function formatLocationName(opt: LocationOption): string {
  return `${opt.icon} ${opt.label}`;
}

// Compute the fee charged for a given (pickup, dropoff) pair. Matches backend
// `getLocationFee` semantics: BOTH fees are always charged, even when pickup
// and dropoff are the same paid city (Sarandë → Sarandë = 2×€20).
export function computeLocationFee(
  pickup: string,
  dropoff: string,
  fees: Record<string, number> = DEFAULT_LOCATION_FEES,
): { pickupFee: number; dropoffFee: number; total: number } {
  const pFee = fees[pickup] || 0;
  const dFee = fees[dropoff] || 0;
  return { pickupFee: pFee, dropoffFee: dFee, total: pFee + dFee };
}
