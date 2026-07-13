/**
 * Google Analytics 4 (GA4) integration.
 *
 * The Measurement ID is read from VITE_GA_MEASUREMENT_ID (e.g. "G-XXXXXXXXXX").
 * If the env var is empty, every function here is a no-op — so local/dev
 * builds without an ID simply do not send any data.
 *
 * Because the site is a React Router SPA, gtag's automatic page_view is
 * disabled (`send_page_view: false`) and we fire page_view manually on every
 * route change via <AnalyticsTracker />.
 *
 * Consent Mode v2: gtag loads for EVERY visitor but starts with consent
 * `denied`, so no cookies are stored until the visitor accepts. While denied,
 * GA4 still sends cookieless, anonymized pings — these power GA4 modeling and
 * Google Ads conversion modeling, so we measure everyone GDPR-compliantly. The
 * cookie banner flips consent to `granted` via setConsent().
 */

const GA_ID = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || "";
// Optional Google Ads tag (AW-XXXXXXXXX) — shares the same gtag.js instance as
// GA4. Adding a second <script> in index.html would double-load gtag and bypass
// consent, so it is configured here instead.
const ADS_ID = (import.meta as any).env?.VITE_GOOGLE_ADS_ID || "";
// Google Ads conversion label (Ads → Goals → Conversions → your action → tag
// setup). Combined with ADS_ID as `AW-XXXX/LABEL`. When set, a completed
// reservation is reported to Google Ads as a conversion. Optional.
const ADS_CONVERSION_LABEL = (import.meta as any).env?.VITE_GOOGLE_ADS_CONVERSION_LABEL || "";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const gaEnabled = !!(GA_ID || ADS_ID);

// ── Cookie consent (GDPR) ───────────────────────────────────────────────────
// The choice is remembered in localStorage so the banner only shows once. With
// Consent Mode v2, GA loads regardless; the choice only flips cookies on/off.
const CONSENT_KEY = "rct_analytics_consent";
export type Consent = "granted" | "denied";

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

/** Push a Consent Mode v2 update reflecting the visitor's choice. */
function applyConsentUpdate(value: Consent): void {
  if (typeof window === "undefined" || !window.gtag) return;
  const granted = value === "granted";
  window.gtag("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
  });
}

/** Persist the visitor's choice and update Consent Mode. */
export function setConsent(value: Consent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  applyConsentUpdate(value);
}

let initialized = false;

/**
 * Inject gtag.js and configure GA4 with Consent Mode v2. Loads for every
 * visitor (consent starts denied → cookieless pings) so we always get
 * measurement. No-op if no ID is set. Safe to call multiple times.
 */
export function initGA(): void {
  if ((!GA_ID && !ADS_ID) || initialized || typeof window === "undefined") return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  // Consent Mode v2 — default denied (no cookies) before anything else.
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID || ADS_ID}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  if (GA_ID) window.gtag("config", GA_ID, { send_page_view: false });
  if (ADS_ID) window.gtag("config", ADS_ID); // Google Ads tag

  // Returning visitor who already accepted → restore granted state.
  const prior = getConsent();
  if (prior) applyConsentUpdate(prior);
}

/** Send a page_view event. Call on every route change. */
export function trackPageView(path: string, title?: string): void {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}

/** Send a custom event with arbitrary params. */
export function trackEvent(name: string, params: Record<string, any> = {}): void {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}

/**
 * Reservation conversion. Maps to GA4's recommended `purchase` event so it
 * shows up under Monetization / conversions and can be imported into Google
 * Ads as a conversion goal.
 */
export function trackReservation(opts: {
  reservationId: string;
  total: number;
  carName?: string;
  pickup?: string;
}): void {
  const value = Number.isFinite(opts.total) ? opts.total : 0;
  trackEvent("purchase", {
    transaction_id: opts.reservationId,
    value,
    currency: "EUR",
    items: opts.carName
      ? [{ item_id: opts.carName, item_name: opts.carName, item_category: opts.pickup }]
      : [],
  });
  // Google Ads conversion (independent of GA4 — fires even if only Ads is set).
  if (ADS_ID && ADS_CONVERSION_LABEL && typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: `${ADS_ID}/${ADS_CONVERSION_LABEL}`,
      value,
      currency: "EUR",
      transaction_id: opts.reservationId,
    });
  }
}

/** Funnel step 1: visitor opened a car's detail page. */
export function trackViewItem(opts: { carName: string; pricePerDay?: number; category?: string }): void {
  trackEvent("view_item", {
    currency: "EUR",
    value: Number.isFinite(opts.pricePerDay) ? opts.pricePerDay : undefined,
    items: [{ item_id: opts.carName, item_name: opts.carName, item_category: opts.category, price: opts.pricePerDay }],
  });
}

/** Funnel step 2: visitor reached the booking page for a car. */
export function trackBeginCheckout(opts: { carName: string; pricePerDay?: number; category?: string }): void {
  trackEvent("begin_checkout", {
    currency: "EUR",
    value: Number.isFinite(opts.pricePerDay) ? opts.pricePerDay : undefined,
    items: [{ item_id: opts.carName, item_name: opts.carName, item_category: opts.category, price: opts.pricePerDay }],
  });
}
