import { useEffect } from "react";

/** Fired once the routed page has mounted (its lazy chunk resolved). See src/index.tsx. */
export const APP_READY_EVENT = "rentride:page-ready";

/**
 * Render as a sibling of the page inside the same <Suspense>: it only mounts
 * when the page itself has, so its effect is the "content is on screen" signal.
 * A short delay lets the page's first data requests start painting.
 */
export function PageReadySignal() {
  useEffect(() => {
    const id = window.setTimeout(() => window.dispatchEvent(new Event(APP_READY_EVENT)), 300);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
