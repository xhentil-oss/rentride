/**
 * First-party, privacy-friendly analytics. Sends page views and key events to
 * our own backend (/api/analytics/track) which stores only an anonymous session
 * id + country (never the raw IP). Independent of Google Analytics. Uses
 * navigator.sendBeacon so events survive page navigation without blocking.
 */
const ENDPOINT = "/api/analytics/track";
const AID_KEY = "rct_aid";

function getAid(): string {
  try {
    let id = localStorage.getItem(AID_KEY);
    if (!id) {
      id = (window.crypto && "randomUUID" in window.crypto)
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(AID_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function send(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      ...payload,
      sessionId: getAid(),
      lang: document.documentElement.lang || undefined,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics must never break the app */
  }
}

export function trackPageview(path: string): void {
  send({ type: "pageview", path, referrer: document.referrer || undefined });
}

export function trackEvent(name: string, data?: Record<string, unknown>, path?: string): void {
  send({ type: "event", name, data, path: path ?? window.location.pathname });
}
