import React from "react";
import LLink from "./LLink";
import { Users, Briefcase, GasPump, Gear, Star, Fire } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { categoryLabel, transmissionLabel, fuelLabel, statusLabel } from "../i18n/dataLabels";
interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  slug: string;
  image: string;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  luggage: number;
  pricePerDay: number;
  displayPrice?: number | null;
  status: string;
  featured?: boolean;
}

interface CarCardProps {
  car: Car;
  className?: string;
}

function CarCard({ car, className = "" }: CarCardProps) {
  const { t } = useTranslation();

  const statusColor =
    car.status === "Në dispozicion"
      ? "bg-success text-success-foreground"
      : car.status === "I rezervuar"
        ? "bg-warning text-warning-foreground"
        : "bg-neutral-400 text-white";

  // Visual price shown to the customer — promo (displayPrice) overrides the real
  // price when set. The real price is still used for booking calculations.
  const shownPrice = car.displayPrice ?? car.pricePerDay;
  const weeklyPrice = Math.round(shownPrice * 7 * 0.88);

  return (
    <article
      className={`bg-white rounded-lg border border-border overflow-hidden card-hover ${className}`}
    >
      <LLink to={`/makina/${car.slug}`} className="block relative overflow-hidden" style={{ height: "200px" }} tabIndex={-1}>
        <img
          src={car.image}
          alt={`${car.brand} ${car.model} ${car.year} me qira Tiranë — ${car.category}, ${car.transmission}`}
          title={`${car.brand} ${car.model} — €${car.pricePerDay}/ditë`}
          loading="lazy"
          decoding="async"
          width={800}
          height={533}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {statusLabel(t, car.status)}
          </span>
          {car.featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
              <Fire size={11} weight="fill" />
              {t("carCard.popular")}
            </span>
          )}
        </div>
        {car.category === "Luksoze" && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-accent text-accent-foreground">
              {t("carCard.luxury")}
            </span>
          </div>
        )}n      </LLink>

      <div className="p-6">
        <div className="mb-3">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {categoryLabel(t, car.category)}
          </span>
          <LLink to={`/makina/${car.slug}`} className="block no-underline group">
            <h3 className="text-lg font-medium text-neutral-900 mt-0.5 group-hover:text-primary transition-colors duration-200">
              {car.brand} {car.model}
            </h3>
          </LLink>
          <span className="text-xs text-neutral-500">{car.year}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-neutral-600">
            <Gear size={16} weight="regular" />
            <span>{transmissionLabel(t, car.transmission)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-neutral-600">
            <GasPump size={16} weight="regular" />
            <span>{fuelLabel(t, car.fuel)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-neutral-600">
            <Users size={16} weight="regular" />
            <span>{t("carCard.seats", { count: car.seats })}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-neutral-600">
            <Briefcase size={16} weight="regular" />
            <span>{t("carCard.luggage", { count: car.luggage })}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={11} weight="fill" className="text-amber-400" />
            ))}
          </div>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs text-neutral-500">{t("carCard.verifiedCar")}</span>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs text-success font-medium">{t("carCard.available")}</span>
        </div>

        <div className="flex items-center justify-between pt-0 border-t-0">
          <div>
            <span className="text-[11px] text-neutral-400 block leading-none mb-0.5">{t("carCard.startingFrom")}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-neutral-900">
                €{shownPrice}
              </span>
              <span className="text-sm text-neutral-500">{t("carCard.perDay")}</span>
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              ≈ €{weeklyPrice}{t("carCard.perWeek")} <span className="text-success font-medium">(-12%)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LLink
              to={`/makina/${car.slug}`}
              className="inline-flex items-center justify-center px-3 py-2.5 rounded-md text-sm font-medium border border-border text-neutral-700 hover:bg-azure transition-colors duration-200 no-underline"
              aria-label={`${t("carCard.details")} ${car.brand} ${car.model}`}
            >
              {t("carCard.details")}
            </LLink>
            <LLink
              to={`/rezervo?car=${car.id}`}
              className={`inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity duration-200 no-underline ${car.status !== "Në dispozicion" ? "opacity-45 pointer-events-none" : ""}`}
              aria-label={`${t("carCard.book")} ${car.brand} ${car.model}`}
            >
              {t("carCard.book")}
            </LLink>
          </div>
        </div>
      </div>
    </article>
  );
}

export default React.memo(CarCard);
