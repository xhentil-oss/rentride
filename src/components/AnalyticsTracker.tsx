import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initTagManager, trackPageView } from "../lib/analytics";
import { trackPageview as trackPageviewFP } from "../lib/track";

/**
 * Loads Google Tag Manager once and pushes a page_view on every SPA route change.
 * Renders nothing. Must live inside <BrowserRouter>.
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initTagManager();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
    trackPageviewFP(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
