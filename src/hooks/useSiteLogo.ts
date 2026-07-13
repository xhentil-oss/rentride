import { useEffect, useState } from "react";

// ─── Site logo (admin-managed) ────────────────────────────────────────────
// The logo image URL is stored as the `logo_url` setting and served from
// /api/settings/public. It may be a normal URL or a base64 data URL (when the
// admin uploads a file). When empty, consumers fall back to the built-in
// icon + "Rent Ride" wordmark.
//
// Last-good value is mirrored to localStorage so the header/footer render the
// configured logo BEFORE the network resolves, avoiding a flash of the
// fallback mark on every page load.

const STORAGE_KEY = "rct_logo_url";

function readCache(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeCache(url: string) {
  if (typeof localStorage === "undefined") return;
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / disabled — ignore */
  }
}

let cachedLogo: string = readCache();
let inFlight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try { cb(); } catch { /* ignore */ }
  });
}

async function fetchLogo(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/settings/public", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad payload");
      const url = typeof json.logo_url === "string" ? json.logo_url.trim() : "";
      if (url !== cachedLogo) {
        cachedLogo = url;
        writeCache(url);
        notifySubscribers();
      }
    } catch {
      /* keep last-good cache */
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Returns the admin-configured logo URL (or "" when none is set, so the caller
 * can render the fallback icon + wordmark). Re-renders when the value changes.
 */
export function useSiteLogo(): string {
  const [logo, setLogo] = useState<string>(cachedLogo);

  useEffect(() => {
    let cancelled = false;
    const sync = () => { if (!cancelled) setLogo(cachedLogo); };
    subscribers.add(sync);
    fetchLogo().then(sync);
    return () => {
      cancelled = true;
      subscribers.delete(sync);
    };
  }, []);

  return logo;
}

/** Force a refetch after the admin saves a new logo. */
export function invalidateLogoCache() {
  inFlight = null;
  fetchLogo();
}
