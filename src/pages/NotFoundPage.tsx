import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LLink from "../components/LLink";
import { categoryLabel } from "../i18n/dataLabels";
import { useLocale } from "../hooks/useLocale";
import { useQuery } from "../hooks/useApi";
import {
  ArrowLeft,
  House,
  Car,
  Binoculars,
  ArrowRight,
  MapPin,
  Warning,
} from "@phosphor-icons/react";
import Footer from "../components/Footer";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { localePath } = useLocale();
  const { data: featuredCars } = useQuery("Car", {
    where: { featured: true, status: "Disponueshëm" },
    limit: 3,
  });

  const [count, setCount] = useState(10);

  // Auto-redirect countdown
  useEffect(() => {
    if (count <= 0) {
      navigate(localePath("/"));
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main 404 content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        {/* Animated icon */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto">
            <MapPin size={52} weight="duotone" className="text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center">
            <Warning size={16} weight="fill" className="text-amber-500" />
          </div>
        </div>

        {/* 404 number */}
        <h1 className="text-[120px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-neutral-200 to-neutral-100 select-none mb-2"
          style={{ WebkitTextStroke: "2px #e2e8f0" }}
        >
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
          {t("notFoundPage.title")}
        </h2>
        <p className="text-neutral-500 text-base max-w-md mx-auto mb-2 leading-relaxed">
          {t("notFoundPage.description")}
        </p>
        <p className="text-sm text-neutral-400 mb-8">
          {t("notFoundPage.redirecting")}{" "}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold mx-1">
            {count}
          </span>{" "}
          {t("notFoundPage.seconds")}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <LLink
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200 no-underline shadow-btn-primary"
          >
            <House size={18} weight="fill" />
            {t("notFoundPage.home")}
          </LLink>
          <LLink
            to="/flota"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-border text-neutral-700 font-semibold text-sm hover:bg-neutral-50 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 no-underline"
          >
            <Car size={18} weight="duotone" className="text-primary" />
            {t("notFoundPage.viewCars")}
            <ArrowRight size={15} weight="bold" className="text-primary" />
          </LLink>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-border text-neutral-700 font-semibold text-sm hover:bg-neutral-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft size={15} weight="bold" />
            {t("notFoundPage.goBack")}
          </button>
        </div>

        {/* Suggested cars */}
        {featuredCars && featuredCars.length > 0 && (
          <div className="w-full max-w-3xl">
            <div className="flex items-center gap-2 justify-center mb-5">
              <Binoculars size={16} weight="bold" className="text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                {t("notFoundPage.recommended")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featuredCars.map((car) => (
                <LLink
                  key={car.id}
                  to={`/makina/${car.slug}`}
                  className="group bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 no-underline"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={car.image}
                      alt={`${car.brand} ${car.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      <span className="text-white text-xs font-semibold drop-shadow">
                        {car.brand} {car.model}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">{categoryLabel(t, car.category)} · {car.year}</span>
                    <span className="text-sm font-bold text-primary">€{car.pricePerDay}{t("notFoundPage.perDay")}</span>
                  </div>
                </LLink>
              ))}
            </div>
            <div className="mt-5">
              <LLink
                to="/flota"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:gap-2.5 transition-all duration-200"
              >
                {t("notFoundPage.viewAll")}
                <ArrowRight size={14} weight="bold" />
              </LLink>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
