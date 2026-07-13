import type { TFunction } from "i18next";

// Car category/transmission/fuel/status are stored in the database as free text
// with inconsistent variants (Albanian with/without diacritics, sometimes the
// English word). These helpers normalize the stored value to a canonical i18n
// key so the translated label always resolves — regardless of how it was saved.
// If no canonical match is found, the raw value is shown as a safe fallback.

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const FUEL_CANON: Record<string, string> = {
  "benzine": "Benzinë", "petrol": "Benzinë", "gasoline": "Benzinë", "gas": "Benzinë",
  "nafte": "Naftë", "diesel": "Naftë", "naphtha": "Naftë",
  "hibrid": "Hibrid", "hybrid": "Hibrid",
  "elektrik": "Elektrik", "electric": "Elektrik", "ev": "Elektrik",
};

const TRANSMISSION_CANON: Record<string, string> = {
  "automatike": "Automatike", "automatic": "Automatike", "auto": "Automatike",
  "manuale": "Manuale", "manual": "Manuale", "manuel": "Manuale",
};

const CATEGORY_CANON: Record<string, string> = {
  "ekonomike": "Ekonomike", "economy": "Ekonomike", "economic": "Ekonomike",
  "suv": "SUV",
  "luksoze": "Luksoze", "luxury": "Luksoze", "lux": "Luksoze",
  "familjare": "Familjare", "family": "Familjare",
  "automatike": "Automatike", "automatic": "Automatike",
};

const STATUS_CANON: Record<string, string> = {
  "ne dispozicion": "Në dispozicion", "available": "Në dispozicion",
  "i rezervuar": "I rezervuar", "rented": "I rezervuar", "booked": "I rezervuar", "reserved": "I rezervuar",
  "ne mirembajtje": "Në mirëmbajtje", "maintenance": "Në mirëmbajtje", "under maintenance": "Në mirëmbajtje", "out of service": "Në mirëmbajtje",
};

function labelFor(t: TFunction, ns: string, canon: Record<string, string>, value?: string | null): string {
  if (!value) return "";
  const key = canon[norm(value)] ?? value;
  return t(`data.${ns}.${key}`, { defaultValue: value });
}

export const categoryLabel = (t: TFunction, value?: string | null) => labelFor(t, "category", CATEGORY_CANON, value);
export const transmissionLabel = (t: TFunction, value?: string | null) => labelFor(t, "transmission", TRANSMISSION_CANON, value);
export const fuelLabel = (t: TFunction, value?: string | null) => labelFor(t, "fuel", FUEL_CANON, value);
export const statusLabel = (t: TFunction, value?: string | null) => labelFor(t, "status", STATUS_CANON, value);
