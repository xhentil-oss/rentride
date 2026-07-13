import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageView } from "../lib/analytics";
import { trackPageview as trackPageviewFP } from "../lib/track";

/**
 * Initializes GA4 once and reports a page_view on every SPA route change.
 * Renders nothing. Must live inside <BrowserRouter>.
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
    trackPageviewFP(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
