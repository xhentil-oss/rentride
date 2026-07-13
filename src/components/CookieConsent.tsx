import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "../hooks/useLocale";
import { getConsent, setConsent, gaEnabled } from "../lib/analytics";

/**
 * GDPR cookie consent banner. Shows once until the visitor accepts or declines.
 * Accepting boots GA4 (see analytics.setConsent). Renders nothing if analytics
 * is not configured or a choice has already been made.
 */
export default function CookieConsent() {
  const { t } = useTranslation();
  const { localePath } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (gaEnabled && getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (value: "granted" | "denied") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-white border border-border rounded-xl shadow-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-neutral-600 flex-1">
          {t("cookieConsent.message")}{" "}
          <Link
            to={localePath("/privatesie")}
            className="text-primary underline hover:opacity-80"
          >
            {t("cookieConsent.learnMore")}
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => choose("denied")}
            className="px-4 py-2.5 rounded-md text-sm font-medium border border-border text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            {t("cookieConsent.decline")}
          </button>
          <button
            onClick={() => choose("granted")}
            className="px-5 py-2.5 rounded-md text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("cookieConsent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
