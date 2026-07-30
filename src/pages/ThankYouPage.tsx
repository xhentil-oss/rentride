import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";
import { trackReservation } from "../lib/analytics";
import { trackEvent } from "../lib/track";
import { CheckCircle, Car, CalendarBlank, MapPin, ArrowRight } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import Footer from "../components/Footer";
import { useSEO } from "../hooks/useSEO";

export default function ThankYouPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(15);

  // Post-conversion page: never index. It carries reservation data, has no search
  // value, and indexing it would leak confirmation URLs into the SERPs.
  useSEO({
    title: t("thankyou.seo.title"),
    description: t("thankyou.seo.description"),
    canonical: "/faleminderit",
    noindex: true,
  });

  const state = (location.state as Record<string, string>) || {};
  const { localePath } = useLocale();
  const reservationId = state.rid || "";
  const customerName = state.name || "";
  const carName = state.car || "";
  const pickup = state.pickup || "";
  const startDate = state.start || "";
  const endDate = state.end || "";
  const total = state.total || "";

  // Fire the GA4 conversion (purchase) exactly once per reservation.
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!reservationId || trackedRef.current) return;
    trackedRef.current = true;
    trackReservation({
      reservationId,
      total: parseFloat(total) || 0,
      carName,
      pickup,
    });
    trackEvent("reservation", { car: carName, total: parseFloat(total) || 0, pickup });
  }, [reservationId, total, carName, pickup]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate(localePath("/llogaria"));
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          {/* Success animation */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 animate-bounce">
              <CheckCircle size={44} weight="fill" className="text-green-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 mb-2">
              {t("thankyou.title", "Faleminderit!")}
            </h1>
            <p className="text-neutral-500 text-sm md:text-base">
              {t("thankyou.subtitle", "Rezervimi juaj u regjistrua me sukses.")}
            </p>
          </div>

          {/* Booking summary card */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
            {reservationId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">{t("thankyou.refId", "Ref. ID")}</span>
                <span className="font-mono text-neutral-700 text-xs bg-neutral-50 px-2 py-1 rounded">
                  {reservationId.slice(0, 8).toUpperCase()}
                </span>
              </div>
            )}
            {customerName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">{t("thankyou.name", "Emri")}</span>
                <span className="font-medium text-neutral-800">{customerName}</span>
              </div>
            )}
            {carName && (
              <div className="flex items-center gap-2 text-sm">
                <Car size={16} className="text-primary shrink-0" />
                <span className="text-neutral-700">{carName}</span>
              </div>
            )}
            {pickup && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-primary shrink-0" />
                <span className="text-neutral-700">{pickup}</span>
              </div>
            )}
            {startDate && endDate && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarBlank size={16} className="text-primary shrink-0" />
                <span className="text-neutral-700">
                  {startDate} — {endDate}
                </span>
              </div>
            )}
            {total && (
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="text-sm font-medium text-neutral-900">{t("thankyou.total", "Totali")}</span>
                <span className="text-lg font-bold text-primary">€{total}</span>
              </div>
            )}
          </div>

          {/* Status info */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              {t("thankyou.statusInfo", "Rezervimi juaj është në pritje. Do të merrni një email konfirmimi sapo ekipi ynë ta verifikojë.")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(localePath("/llogaria"))}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              {t("thankyou.myAccount", "Paneli im")}
              <ArrowRight size={16} weight="bold" />
            </button>
            <button
              onClick={() => navigate(localePath("/"))}
              className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-medium border border-border text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              {t("thankyou.backHome", "Kthehu në kryefaqe")}
            </button>
          </div>

          {/* Countdown */}
          <p className="text-center text-xs text-neutral-400 mt-4">
            {t("thankyou.redirect", "Ridrejtim automatik te paneli juaj për")} {countdown}s
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
