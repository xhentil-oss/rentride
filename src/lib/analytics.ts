/**
 * Google Tag Manager (GTM) integration.
 *
 * The container ID is read from VITE_GTM_ID (e.g. "GTM-XXXXXXX"). If it is
 * empty, every function here is a no-op — local/dev builds send nothing.
 *
 * ALL Google tags (GA4, Google Ads conversion + remarketing, …) live inside the
 * GTM container. This file never loads gtag.js directly and never hard-codes a
 * G- or AW- ID: doing so in the past pulled in tags that belonged to another
 * website. The code only (a) loads gtm.js and (b) pushes well-named events into
 * `dataLayer`, which GTM triggers consume.
 *
 * Events pushed (configure matching triggers in GTM):
 *   page_view       — every SPA route change (GTM's built-in page view only
 *                     fires once, on first load). Fields: page_path,
 *                     page_location, page_title.
 *   view_item       — car detail page opened.        GA4 ecommerce payload.
 *   begin_checkout  — booking page opened for a car. GA4 ecommerce payload.
 *   purchase        — reservation completed (thank-you page). GA4 ecommerce
 *                     payload + flat `transaction_id`, `value`, `currency` for
 *                     the Google Ads conversion tag.
 *
 * Consent Mode v2: the default consent state (all denied) is pushed BEFORE
 * gtm.js loads, so Google tags start cookieless and modelled. The cookie
 * banner flips it to granted via setConsent(). GTM's own consent settings on
 * each tag honour these signals.
 */

const GTM_ID = (import.meta as any).env?.VITE_GTM_ID || "";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/** True when a GTM container is configured (drives the cookie banner). */
export const gaEnabled = !!GTM_ID;

// ── Cookie consent (GDPR) ───────────────────────────────────────────────────
// The choice is remembered in localStorage so the banner only shows once. With
// Consent Mode v2, GTM loads regardless; the choice only flips cookies on/off.
const CONSENT_KEY = "rct_analytics_consent";
export type Consent = "granted" | "denied";

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

function consentState(value: Consent) {
  const s = value === "granted" ? "granted" : "denied";
  return {
    ad_storage: s,
    ad_user_data: s,
    ad_personalization: s,
    analytics_storage: s,
  };
}

/** Push a Consent Mode v2 update reflecting the visitor's choice. */
function applyConsentUpdate(value: Consent): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", consentState(value));
}

/** Persist the visitor's choice and update Consent Mode. */
export function setConsent(value: Consent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  applyConsentUpdate(value);
}

let initialized = false;

/**
 * Inject gtm.js with Consent Mode v2 defaults. Loads for every visitor
 * (consent starts denied → cookieless pings). No-op without VITE_GTM_ID.
 * Safe to call multiple times.
 */
export function initTagManager(): void {
  if (!GTM_ID || initialized || typeof window === "undefined") return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  // gtag() stub — consent commands must be queued in dataLayer as `arguments`
  // objects (not plain objects) for GTM's consent handling to pick them up.
  window.gtag =
    window.gtag ||
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

  // Consent Mode v2 — default denied (no cookies) before the container loads.
  window.gtag("consent", "default", { ...consentState("denied"), wait_for_update: 500 });
  // Returning visitor who already accepted → restore granted state.
  const prior = getConsent();
  if (prior) applyConsentUpdate(prior);

  // Standard GTM snippet, minus the inline <script>.
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(script);
}

/** @deprecated kept for older imports; use initTagManager(). */
export const initGA = initTagManager;

function push(data: Record<string, any>): void {
  if (!GTM_ID || typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}

/** Send a page_view event. Call on every route change. */
export function trackPageView(path: string, title?: string): void {
  push({
    event: "page_view",
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}

/** Push a custom event with arbitrary params. */
export function trackEvent(name: string, params: Record<string, any> = {}): void {
  push({ event: name, ...params });
}

type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
};

/**
 * GA4 ecommerce event via dataLayer. `ecommerce: null` is pushed first so the
 * previous event's items do not leak into this one (GA4/GTM recommendation).
 */
function pushEcommerce(event: string, ecommerce: Record<string, any>, extra: Record<string, any> = {}): void {
  push({ ecommerce: null });
  push({ event, ecommerce, ...extra });
}

/**
 * Reservation conversion. Pushed as GA4 `purchase` (ecommerce) with the same
 * values duplicated flat (`transaction_id`, `value`, `currency`) so a Google
 * Ads conversion tag in GTM can read them with plain Data Layer Variables and
 * de-duplicate on transaction_id.
 */
export function trackReservation(opts: {
  reservationId: string;
  total: number;
  carName?: string;
  pickup?: string;
}): void {
  const value = Number.isFinite(opts.total) ? opts.total : 0;
  const items: EcommerceItem[] = opts.carName
    ? [{ item_id: opts.carName, item_name: opts.carName, item_category: opts.pickup, price: value, quantity: 1 }]
    : [];
  pushEcommerce(
    "purchase",
    { transaction_id: opts.reservationId, value, currency: "EUR", items },
    { transaction_id: opts.reservationId, value, currency: "EUR" },
  );
}

/** Funnel step 1: visitor opened a car's detail page. */
export function trackViewItem(opts: { carName: string; pricePerDay?: number; category?: string }): void {
  const price = Number.isFinite(opts.pricePerDay) ? opts.pricePerDay : undefined;
  pushEcommerce("view_item", {
    currency: "EUR",
    value: price,
    items: [{ item_id: opts.carName, item_name: opts.carName, item_category: opts.category, price }],
  });
}

/** Funnel step 2: visitor reached the booking page for a car. */
export function trackBeginCheckout(opts: { carName: string; pricePerDay?: number; category?: string }): void {
  const price = Number.isFinite(opts.pricePerDay) ? opts.pricePerDay : undefined;
  pushEcommerce("begin_checkout", {
    currency: "EUR",
    value: price,
    items: [{ item_id: opts.carName, item_name: opts.carName, item_category: opts.category, price }],
  });
}
