/**
 * Locations loader — single source of truth for pickup/drop-off locations.
 *
 * Reads the `location_fees` (JSON object: { "Tiranë Qendër": 0, "Durrës": 15, … })
 * and `free_locations` (JSON array: ["Tiranë Qendër", …]) settings from the
 * `settings` table, falls back to sane defaults if not configured.
 *
 * Cached in-memory for `CACHE_TTL_MS` to avoid hitting the DB on every booking
 * request. Call `invalidateLocationCache()` after admin saves settings.
 */
const pool = require('../database/db');

const DEFAULT_LOCATION_FEES = {
  'Aeroporti Nënë Tereza': 10,
  'Durrës': 15,
  'Vlorë': 20,
  'Sarandë': 25,
  'Shkodër': 20,
};
// "Free" means no surcharge (fee = 0); these still need to be valid pickup options.
const DEFAULT_FREE_LOCATIONS = ['Tiranë Qendër'];

const CACHE_TTL_MS = 60_000;
let cache = null; // { fees, free, loadedAt }

function parseJsonSetting(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return fallback;
  }
}

async function loadLocations() {
  if (cache && (Date.now() - cache.loadedAt) < CACHE_TTL_MS) return cache;
  let fees = DEFAULT_LOCATION_FEES;
  let free = DEFAULT_FREE_LOCATIONS;
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('location_fees', 'free_locations')"
    );
    for (const row of rows) {
      if (row.setting_key === 'location_fees') {
        const v = parseJsonSetting(row.setting_value, null);
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          // Coerce values to numbers, drop NaN/negative.
          fees = {};
          for (const [name, price] of Object.entries(v)) {
            const n = Number(price);
            if (Number.isFinite(n) && n >= 0 && name) fees[String(name).trim()] = n;
          }
        }
      } else if (row.setting_key === 'free_locations') {
        const v = parseJsonSetting(row.setting_value, null);
        if (Array.isArray(v)) {
          free = v.map((x) => String(x).trim()).filter(Boolean);
        }
      }
    }
  } catch (err) {
    // Non-fatal: fall back to defaults.
    console.error('loadLocations: falling back to defaults', err.message);
  }
  cache = { fees, free, loadedAt: Date.now() };
  return cache;
}

function invalidateLocationCache() {
  cache = null;
}

async function getLocationFee(pickup, dropoff) {
  const { fees } = await loadLocations();
  // Tolerant lookup: normalize key + DB names to NFC + collapsed whitespace.
  const norm = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const map = new Map(Object.entries(fees).map(([k, v]) => [norm(k), v]));
  const pFee = map.get(norm(pickup)) || 0;
  const dFee = map.get(norm(dropoff)) || 0;
  // Always charge BOTH the pickup and the dropoff fee — even when the customer
  // picks up and returns in the same paid city (e.g. Sarandë → Sarandë =
  // pickup-fee + dropoff-fee = 2×€20). Free locations (fee = 0) naturally
  // contribute nothing.
  return pFee + dFee;
}

async function getAllowedLocations() {
  const { fees, free } = await loadLocations();
  return Array.from(new Set([...Object.keys(fees), ...free]));
}

module.exports = {
  loadLocations,
  invalidateLocationCache,
  getLocationFee,
  getAllowedLocations,
  DEFAULT_LOCATION_FEES,
  DEFAULT_FREE_LOCATIONS,
};
