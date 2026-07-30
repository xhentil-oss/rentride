import { useEffect, useState } from "react";
import {
  buildLocationOptions,
  computeLocationFee,
  DEFAULT_FREE_LOCATIONS,
  DEFAULT_LOCATION_FEES,
  type LocationOption,
} from "../lib/locations";

// ─── Persistent + module-level cache ──────────────────────────────────────
// Admin settings are AUTHORITATIVE — when an admin removes a location, the
// dropdown must hide it. Defaults are used only as a safety net:
//   - First render before API responds
//   - API failure (network/JSON error)
//   - Pathological response (empty or unparseable)
//
// Last-good API response is mirrored to localStorage so subsequent page loads
// hydrate with the user's CONFIGURED locations BEFORE the network resolves,
// avoiding the brief flash of defaults.

const STORAGE_KEY = "rct_locations_v2";

type LocationMode = { pickup: boolean; dropoff: boolean };
type LocationModes = Record<string, LocationMode>;

interface CachedShape {
  fees: Record<string, number>;
  free: string[];
  modes?: LocationModes;
  fetchedAt: number;
}

function readLocalStorageCache(): CachedShape | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.fees && typeof parsed.fees === "object" &&
      Array.isArray(parsed.free)
    ) {
      return parsed as CachedShape;
    }
  } catch {
    /* ignore corrupted localStorage */
  }
  return null;
}

function writeLocalStorageCache(fees: Record<string, number>, free: string[], modes: LocationModes) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fees, free, modes, fetchedAt: Date.now() }));
  } catch {
    /* quota exceeded / disabled — ignore */
  }
}

// Sanitize location_modes: keep only { name: { pickup, dropoff } } with booleans.
function cleanModes(raw: unknown): LocationModes {
  const out: LocationModes = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [name, m] of Object.entries(raw as Record<string, any>)) {
    if (!name || !m || typeof m !== "object") continue;
    out[name.trim()] = { pickup: m.pickup !== false, dropoff: m.dropoff !== false };
  }
  return out;
}

// Sanitize fees object: drop entries with invalid values, trim names.
function cleanFees(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const name = String(k || "").trim();
    const num = Number(v);
    if (name && Number.isFinite(num) && num >= 0) out[name] = num;
  }
  return out;
}

function cleanFree(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  return out;
}

// Seed module-level cache: prefer localStorage (last admin-configured set),
// fall back to defaults. Never empty.
const seed = readLocalStorageCache();
let cachedFees: Record<string, number> = seed?.fees ?? { ...DEFAULT_LOCATION_FEES };
let cachedFree: string[] = seed?.free ?? [...DEFAULT_FREE_LOCATIONS];
let cachedModes: LocationModes = seed?.modes ?? {};
let inFlight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try { cb(); } catch { /* ignore subscriber errors */ }
  });
}

async function fetchPublicSettings(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/settings/public", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad payload");

      const apiFees = cleanFees(json.location_fees);
      const apiFree = cleanFree(json.free_locations);

      // Treat both fees and free as authoritative ONLY when at least one of
      // them is non-empty — admin must have at least one location set. If
      // API returns nothing usable (server bug, empty settings table), keep
      // whatever we had (last cache or defaults) so the form never breaks.
      const hasAnyFee = apiFees && Object.keys(apiFees).length > 0;
      const hasAnyFree = apiFree && apiFree.length > 0;
      if (!hasAnyFee && !hasAnyFree) return;

      // REPLACE the cache with API response. Defaults are no longer mixed in
      // once we have a successful response — the admin's configured list is
      // the source of truth.
      cachedFees = apiFees ?? {};
      cachedFree = apiFree ?? [];
      cachedModes = cleanModes(json.location_modes);

      writeLocalStorageCache(cachedFees, cachedFree, cachedModes);
      notifySubscribers();
    } catch {
      // Network/JSON failure — keep whatever cache we have (last good or
      // defaults). Dropdown still works.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Returns the unified list of pickup / drop-off locations, fees, and helpers.
 *
 * Guarantees:
 *   - First render is always populated (defaults or last admin-configured set)
 *   - Admin settings changes propagate after fetch resolves
 *   - When admin removes a location, it disappears from the dropdown
 *   - When API fails, last known good list (or defaults) remains
 *   - Subscribers re-render automatically when cache updates
 */
export function useLocations(lang: "sq" | "en" = "sq") {
  const [fees, setFees] = useState<Record<string, number>>(cachedFees);
  const [free, setFree] = useState<string[]>(cachedFree);
  const [modes, setModes] = useState<LocationModes>(cachedModes);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      setFees(cachedFees);
      setFree(cachedFree);
      setModes(cachedModes);
    };

    subscribers.add(sync);
    fetchPublicSettings().then(sync);

    return () => {
      cancelled = true;
      subscribers.delete(sync);
    };
  }, []);

  const options: LocationOption[] = buildLocationOptions(fees, free, lang);
  // A location shows in the pickup / drop-off dropdown only when enabled for
  // that mode. Missing entry ⇒ enabled for both (backward compatible).
  const pickupOptions = options.filter((o) => modes[o.value]?.pickup !== false);
  const dropoffOptions = options.filter((o) => modes[o.value]?.dropoff !== false);

  return {
    fees,
    free,
    modes,
    options,
    pickupOptions,
    dropoffOptions,
    /** Default starting value for a fresh form (first free pickup location). */
    defaultLocation: (pickupOptions.find((o) => o.fee === 0) || pickupOptions[0])?.value || free[0] || options[0]?.value || "",
    computeFee: (pickup: string, dropoff: string) =>
      computeLocationFee(pickup, dropoff, fees),
  };
}

/**
 * Force the next `useLocations()` mount to refetch from the API.
 * Call this after admin saves location settings so other tabs/pages pick
 * up the change immediately on next render.
 */
export function invalidateLocationsCache() {
  cachedFees = { ...DEFAULT_LOCATION_FEES };
  cachedFree = [...DEFAULT_FREE_LOCATIONS];
  inFlight = null;
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  // Kick off a fresh fetch so subscribers update.
  fetchPublicSettings().then(notifySubscribers);
}
