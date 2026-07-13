import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  CalendarBlank,
  Clock,
  User,
  Phone,
  EnvelopeSimple,
  CheckCircle,
  CaretDown,
  CaretUp,
  Tag,
  Info,
  FileText,
  WarningCircle,
  DownloadSimple,
  Airplane,
  Car,
} from "@phosphor-icons/react";
import { downloadContractPdf } from "../lib/generateContractPdf";
import SignaturePad from "../components/SignaturePad";
import { useQuery, useMutation } from "../hooks/useApi";
import { trackBeginCheckout } from "../lib/analytics";
import { trackEvent } from "../lib/track";
import { categoryLabel, transmissionLabel } from "../i18n/dataLabels";
import { COUNTRY_CODES, flagEmoji } from "../lib/countryCodes";
import Footer from "../components/Footer";
import { useSEO } from "../hooks/useSEO";
import {
  getSeasonForDate,
  calculateSeasonalTotal,
  getDominantSeason,
  getAllSeasonPrices,
} from "../lib/seasonalPricing";
import { applyPricingRules, RULE_TYPE_LABELS, getMinDaysRequirement, doesRuleMatch } from "../lib/pricingRules";
import type { PricingRule } from "../lib/pricingRules";
import { calcTotalWithMonthlyRates, resolveMonthlyRate } from "../lib/monthlyRates";
import type { MonthlyRate } from "../lib/monthlyRates";
import { useLocations } from "../hooks/useLocations";
import { formatLocationOption, formatLocationName } from "../lib/locations";
import {
  parseLocalDate,
  buildLocalDateTime,
  formatDateInputValue,
  formatLocalDate,
} from "../lib/dateHelpers";

interface BookingForm {
  pickup: string;
  dropoff: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  firstName: string;
  lastName: string;
  phonePrefix: string;
  phone: string;
  email: string;
  flightNumber: string;
  country: string;
  /** Map of extra.id → quantity. Includes the single chosen insurance and any other extras. */
  selectedExtras: Record<string, number>;
  discountCode: string;
}

type ExtraCategory = "insurance" | "equipment" | "service" | "addon";
type ExtraPriceType = "per_day" | "per_rental" | "one_time";

interface ApiExtra {
  id: string;
  code: string;
  nameSq: string;
  nameEn: string;
  descriptionSq?: string | null;
  descriptionEn?: string | null;
  category: ExtraCategory;
  price: number;
  priceType: ExtraPriceType;
  icon?: string | null;
  maxQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

// Names/descriptions live in i18n (booking.categories.*); only emoji/color are static here.
const CATEGORY_META: Record<ExtraCategory, { emoji: string; color: string }> = {
  insurance: { emoji: "🛡️", color: "border-blue-200 bg-blue-50/40" },
  equipment: { emoji: "🎒", color: "border-emerald-200 bg-emerald-50/40" },
  service:   { emoji: "🌍", color: "border-purple-200 bg-purple-50/40" },
  addon:     { emoji: "✨", color: "border-amber-200 bg-amber-50/40" },
};

// Extra names/descriptions come from the DB which only stores sq/en. Albanian
// visitors get Albanian; everyone else gets English (better than Albanian).
function extraDisplayName(e: ApiExtra, lang: "sq" | "en"): string {
  return lang === "sq" ? e.nameSq : e.nameEn;
}
function extraDisplayDesc(e: ApiExtra, lang: "sq" | "en"): string {
  return (lang === "sq" ? e.descriptionSq : e.descriptionEn) || "";
}
function calcExtraLineTotal(e: ApiExtra, quantity: number, days: number): number {
  const multiplier = e.priceType === "per_day" ? Math.max(1, days) : 1;
  return +(Number(e.price) * quantity * multiplier).toFixed(2);
}

// ── Seasonal Price Table Component ──────────────────────────────────────────
function SeasonalPriceTable({ basePrice }: { basePrice: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const allPrices = getAllSeasonPrices(basePrice);
  const currentSeason = getSeasonForDate(new Date());
  // Albanian/English short month names from i18n — `returnObjects: true` lets
  // us index by month number.
  const monthsShort = (t("booking.extras.monthsShort", { returnObjects: true }) as unknown) as string[];
  const monthsFallback = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag size={16} weight="regular" className="text-primary" />
          <span className="text-sm font-medium text-neutral-900">{t("booking.extras.seasonalPrices")}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${currentSeason.badgeColor}`}>
            {currentSeason.emoji} {t("booking.currentlyLabel")} {currentSeason.label}
          </span>
        </div>
        {open ? (
          <CaretUp size={16} weight="regular" className="text-neutral-400 flex-shrink-0" />
        ) : (
          <CaretDown size={16} weight="regular" className="text-neutral-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-border">
          <p className="text-xs text-neutral-500 mb-4 mt-3 flex items-start gap-1.5">
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            {t("booking.extras.seasonalInfo", { price: basePrice })}
          </p>
          <div className="space-y-2">
            {allPrices.map(({ season, pricePerDay }) => (
              <div
                key={season.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${season.id === currentSeason.id ? `${season.badgeColor} ring-1 ring-current/20` : "bg-neutral-50 border-border"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{season.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{season.label}</p>
                    <p className="text-xs text-neutral-500">
                      {season.months.map((m) => (Array.isArray(monthsShort) ? monthsShort[m - 1] : monthsFallback[m - 1])).join(", ")}
                    </p>
                  </div>
                  {season.id === currentSeason.id && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 border border-current/20">{t("booking.extras.currentSeason")}</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-neutral-900">€{pricePerDay}<span className="text-xs font-normal text-neutral-500">{t("booking.extras.perDay")}</span></p>
                  {season.multiplier !== 1 && (
                    <p className="text-xs text-neutral-500">
                      {season.multiplier > 1
                        ? `+${Math.round((season.multiplier - 1) * 100)}%`
                        : `-${Math.round((1 - season.multiplier) * 100)}%`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  const { t, i18n } = useTranslation();
  useSEO({
    title: t("booking.seo.title"),
    description: t("booking.seo.description"),
    keywords: t("booking.seo.keywords"),
    canonical: "/rezervo",
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { data: allCars } = useQuery("Car");
  const { data: allReservations } = useQuery("ReservationAvailability");
  const carId = searchParams.get("car");
  const car = carId ? (allCars ?? []).find((c) => c.id === carId) : undefined;

  // GA4 funnel step 2 — fire once when the booking page has a resolved car.
  const beginCheckoutTracked = useRef(false);
  useEffect(() => {
    if (!car || beginCheckoutTracked.current) return;
    beginCheckoutTracked.current = true;
    trackBeginCheckout({ carName: `${car.brand} ${car.model}`, pricePerDay: car.pricePerDay, category: car.category });
    trackEvent("begin_checkout", { car: `${car.brand} ${car.model}`, category: car.category });
  }, [car?.id]);

  const [form, setForm] = useState<BookingForm>({
    pickup: searchParams.get("pickup") || "",
    dropoff: searchParams.get("dropoff") || "",
    startDate: searchParams.get("start") || "",
    startTime: searchParams.get("startTime") || "10:00",
    endDate: searchParams.get("end") || "",
    endTime: searchParams.get("endTime") || "10:00",
    firstName: "",
    lastName: "",
    phonePrefix: "+355",
    phone: "",
    email: "",
    flightNumber: "",
    country: "Shqipëri",
    selectedExtras: {},
    discountCode: "",
  });

  // Load extras catalog from admin-managed API
  const { data: extrasData } = useQuery("Extra");
  const extras = (extrasData ?? []) as ApiExtra[];
  const uiLang: "sq" | "en" = (i18n?.language === "sq" ? "sq" : "en");
  const priceTypeLabel = (pt: ExtraPriceType): string =>
    pt === "per_day" ? t("booking.priceType.perDay") : pt === "per_rental" ? t("booking.priceType.perRental") : "";

  const extrasByCategory = React.useMemo(() => {
    const map: Record<ExtraCategory, ApiExtra[]> = { insurance: [], equipment: [], service: [], addon: [] };
    for (const e of extras) if (e.isActive) map[e.category]?.push(e);
    return map;
  }, [extras]);

  // Auto-select free Basic insurance once catalog loads (only on initial mount if nothing chosen yet)
  const insuranceAutoSelected = React.useRef(false);
  React.useEffect(() => {
    if (insuranceAutoSelected.current) return;
    if (extrasByCategory.insurance.length === 0) return;
    const hasInsuranceSelected = extrasByCategory.insurance.some((e) => (form.selectedExtras[e.id] ?? 0) > 0);
    if (hasInsuranceSelected) { insuranceAutoSelected.current = true; return; }
    const free = extrasByCategory.insurance.find((e) => Number(e.price) === 0) ?? extrasByCategory.insurance[0];
    if (free) {
      setForm((f) => ({ ...f, selectedExtras: { ...f.selectedExtras, [free.id]: 1 } }));
      insuranceAutoSelected.current = true;
    }
  }, [extrasByCategory.insurance]);

  function selectInsurance(extraId: string) {
    setForm((f) => {
      const next: Record<string, number> = { ...f.selectedExtras };
      // Clear all other insurance picks (single-select)
      for (const ins of extrasByCategory.insurance) {
        if (ins.id !== extraId) delete next[ins.id];
      }
      next[extraId] = 1;
      return { ...f, selectedExtras: next };
    });
  }

  function setExtraQuantity(extra: ApiExtra, qty: number) {
    setForm((f) => {
      const next = { ...f.selectedExtras };
      const clamped = Math.max(0, Math.min(qty, extra.maxQuantity));
      if (clamped === 0) delete next[extra.id];
      else next[extra.id] = clamped;
      return { ...f, selectedExtras: next };
    });
  }
  const todayInputValue = formatDateInputValue();
  const startDateObj = React.useMemo(() => (form.startDate ? parseLocalDate(form.startDate) : null), [form.startDate]);
  const endDateObj = React.useMemo(() => (form.endDate ? parseLocalDate(form.endDate) : null), [form.endDate]);

  // Pickup/return use real <input type="time">. `min` is the current time when
  // the date is today, so you can't pick the past. Helpers below.
  const toHM = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const nowTimeValue = toHM(new Date());
  const nowPlus = (mins: number) => { const d = new Date(); d.setMinutes(d.getMinutes() + mins); return toHM(d); };

  // Selecting today auto-fills the pickup time with "now + 10 min".
  React.useEffect(() => {
    if (form.startDate !== todayInputValue) return;
    setForm((f) => ({ ...f, startTime: nowPlus(10) }));
  }, [form.startDate, todayInputValue]);
  // For a same-day return, bump it forward only if it landed in the past.
  React.useEffect(() => {
    if (form.endDate !== todayInputValue) return;
    const nowHM = toHM(new Date());
    setForm((f) => (f.endTime < nowHM ? { ...f, endTime: nowPlus(10) } : f));
  }, [form.endDate, todayInputValue]);

  // Check if car is available (status + date conflict)
  const carStatusBlocked = car
    ? car.status === "I rezervuar" || car.status === "Në mirëmbajtje"
    : false;

  const isCarAvailable = React.useMemo(() => {
    if (!car) return true;
    // Block if car status is not available regardless of dates
    if (car.status === "I rezervuar" || car.status === "Në mirëmbajtje") return false;
    if (!form.startDate || !form.endDate) return true;
    const start = buildLocalDateTime(form.startDate, form.startTime);
    const end = buildLocalDateTime(form.endDate, form.endTime);
    if (!start || !end || end <= start) return true;
    const overlappingCount = (allReservations ?? []).filter((r) => {
      if (r.carId !== car.id) return false;
      if (r.status === "Cancelled" || r.status === "Completed") return false;
      const rStart = buildLocalDateTime(r.startDate, r.startTime || "10:00");
      const rEnd = buildLocalDateTime(r.endDate, r.endTime || "10:00");
      return Boolean(rStart && rEnd && start < rEnd && end > rStart);
    }).length;
    return overlappingCount < (Number(car.quantity) || 1);
  }, [car, form.startDate, form.endDate, form.startTime, form.endTime, allReservations]);

  const { create: createCustomer } = useMutation("Customer");
  const { create: createReservation } = useMutation("Reservation");
  const [errors, setErrors] = useState<Partial<BookingForm>>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Final confirmation gate so price-checkers don't book by accident.
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Mobile "Details" popup (pickup/return + what's included).
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [contractDownloaded, setContractDownloaded] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Public company info — used to populate the printable contract footer/header
  // instead of hardcoded values (kept in sync with admin Settings panel).
  const [companyInfo, setCompanyInfo] = useState<{
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
  }>({});
  // Digital contract section can be toggled off from admin Settings.
  const [contractEnabled, setContractEnabled] = useState(true);
  // Discount-code section can be toggled off from admin Settings.
  const [discountCodeEnabled, setDiscountCodeEnabled] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setCompanyInfo({
          companyName: j.company_name || undefined,
          companyPhone: j.company_phone || undefined,
          companyEmail: j.company_email || undefined,
          companyAddress: j.company_address || undefined,
        });
        setContractEnabled(j.booking_contract_enabled !== "false");
        setDiscountCodeEnabled(j.booking_discount_code_enabled !== "false");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load pricing rules and monthly rates from DB
  const { data: pricingRules } = useQuery("PricingRule", { where: { isActive: true } });
  const { data: monthlyRatesRaw } = useQuery("MonthlyRatePublic", { where: { year: new Date().getFullYear() } });

  const { days, hours } = (() => {
    if (!form.startDate || !form.endDate) return { days: 0, hours: 0 };
    const start = buildLocalDateTime(form.startDate, form.startTime);
    const end = buildLocalDateTime(form.endDate, form.endTime);
    if (!start || !end) return { days: 0, hours: 0 };
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return { days: 0, hours: 0 };
    const totalHours = diffMs / (1000 * 60 * 60);
    const fullDays = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    // Round up partial day to full day for pricing
    const billableDays = remainingHours > 0 ? fullDays + 1 : fullDays;
    return { days: billableDays, hours: Math.round(totalHours) };
  })();

  // Seasonal pricing calculation
  const seasonalData = React.useMemo(() => {
    if (!form.startDate || !form.endDate || !car) return null;
    const start = buildLocalDateTime(form.startDate, form.startTime);
    const end = buildLocalDateTime(form.endDate, form.endTime);
    if (!start || !end) return null;
    if (end <= start) return null;
    return calculateSeasonalTotal(car.pricePerDay, start, end);
  }, [form.startDate, form.endDate, form.startTime, form.endTime, car]);

  const dominantSeason = React.useMemo(() => {
    if (!form.startDate || !form.endDate) return getSeasonForDate(new Date());
    const start = buildLocalDateTime(form.startDate, form.startTime);
    const end = buildLocalDateTime(form.endDate, form.endTime);
    if (!start || !end) return getSeasonForDate(new Date());
    if (end <= start) return getSeasonForDate(new Date());
    return getDominantSeason(start, end);
  }, [form.startDate, form.endDate, form.startTime, form.endTime]);

  const { options: locationOptions, computeFee: computeLocFee } = useLocations(
    (i18n?.language === "en" ? "en" : "sq") as "sq" | "en",
  );
  const { pickupFee, dropoffFee, total: locationFeeTotal } = computeLocFee(form.pickup, form.dropoff);

  // Resolved extras = selected catalog items with computed line totals
  const resolvedExtras = React.useMemo(() => {
    const out: { extra: ApiExtra; quantity: number; lineTotal: number }[] = [];
    for (const e of extras) {
      const qty = form.selectedExtras[e.id] ?? 0;
      if (qty > 0) out.push({ extra: e, quantity: qty, lineTotal: calcExtraLineTotal(e, qty, days) });
    }
    return out;
  }, [extras, form.selectedExtras, days]);

  const selectedInsurance = resolvedExtras.find((r) => r.extra.category === "insurance")?.extra ?? null;
  const insurancePrice = resolvedExtras.filter((r) => r.extra.category === "insurance").reduce((s, r) => s + r.lineTotal, 0);
  const extrasTotal = resolvedExtras.filter((r) => r.extra.category !== "insurance").reduce((s, r) => s + r.lineTotal, 0);
  const flatBasePrice = days * (car?.pricePerDay ?? 0);

  // Monthly rates as primary price source (priority 1 over seasonal)
  const monthlyRatesCalc = React.useMemo(() => {
    if (!car || !startDateObj || !endDateObj || days === 0) return null;
    const rates = (monthlyRatesRaw ?? []) as MonthlyRate[];
    if (rates.length === 0) return null;
    return calcTotalWithMonthlyRates(
      rates, car.id, car.category, car.pricePerDay,
      startDateObj, endDateObj
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyRatesRaw, car, startDateObj, endDateObj, days]);

  // Raw base: monthly rates → seasonal → flat
  const rawBase = monthlyRatesCalc
    ? monthlyRatesCalc.total
    : (seasonalData ? seasonalData.total : flatBasePrice);

  // Admin SURCHARGE rules (e.g. short-rental / length_of_stay). Mirrors the
  // backend (backend/lib/pricingRules.js) so the price shown == price charged.
  // Top-priority matching surcharge wins; % of base or fixed amount.
  const surchargeAmount = React.useMemo(() => {
    if (!car || !startDateObj || !endDateObj || days === 0 || rawBase === 0) return 0;
    const ctx = { carId: car.id, carCategory: car.category, startDate: startDateObj, endDate: endDateObj, days, bookingDate: new Date() };
    const matching = ((pricingRules ?? []) as PricingRule[])
      .filter((r) => r.direction === "surcharge" && r.type !== "promo_code" && doesRuleMatch(r, ctx))
      .sort((a, b) => b.priority - a.priority);
    if (!matching.length) return 0;
    const top = matching[0];
    const value = Number(top.discountValue) || 0;
    return top.discountType === "percent"
      ? Math.round(rawBase * (value / 100) * 100) / 100
      : value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingRules, car, startDateObj, endDateObj, days, rawBase]);

  // Pre-discount base includes any short-rental surcharge.
  const preDiscountBase = rawBase + surchargeAmount;

  // Apply only DISCOUNT (not surcharge) pricing rules on top of pre-discount base
  const pricingRuleResult = React.useMemo(() => {
    if (!car || !startDateObj || !endDateObj || days === 0 || preDiscountBase === 0) return null;
    const rules = ((pricingRules ?? []) as PricingRule[])
      .filter(r => !r.direction || r.direction === "discount");
    if (rules.length === 0) return null;
    const ctx = {
      carId: car.id, carCategory: car.category,
      startDate: startDateObj, endDate: endDateObj,
      days, bookingDate: new Date(), promoCode: form.discountCode || undefined,
    };
    const res = applyPricingRules(rules, preDiscountBase, ctx);
    return res.appliedDiscounts.length > 0 ? res : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingRules, car, startDateObj, endDateObj, form.discountCode, days, preDiscountBase]);

  // insurancePrice already accounts for days via calcExtraLineTotal (multiplier=days for per_day)
  const insuranceTotal = insurancePrice;

  // Minimum days restriction
  const minDaysRequired = React.useMemo(() => {
    if (!car || !startDateObj || !endDateObj) return 0;
    return getMinDaysRequirement(
      (pricingRules ?? []) as PricingRule[],
      { carId: car.id, carCategory: car.category, startDate: startDateObj, endDate: endDateObj }
    );
  }, [pricingRules, car, startDateObj, endDateObj]);

  const minDaysViolation = days > 0 && minDaysRequired > 0 && days < minDaysRequired;

  // basePrice: after discounts applied (or pre-discount base if no discounts)
  const basePrice = pricingRuleResult
    ? pricingRuleResult.finalPrice
    : preDiscountBase;

  // Legacy discount (old promo code fallback) — must be declared BEFORE total
  const legacyDiscount =
    discountCodeEnabled && !pricingRuleResult && form.discountCode.toUpperCase() === "TIRANA10"
      ? Math.round(basePrice * 0.1)
      : 0;
  const totalDiscount = Math.max(0, pricingRuleResult?.totalDiscount ?? 0) + legacyDiscount;

  const total = basePrice + extrasTotal + insuranceTotal + locationFeeTotal - legacyDiscount;

  // Effective per-day rate shown to customer
  const effectiveDailyRate = days > 0
    ? Math.round(basePrice / days * 100) / 100
    : (car?.pricePerDay ?? 0);

  // Price per day shown as car info label (uses monthly rate for start month if available)
  const displayPricePerDay = React.useMemo(() => {
    if (!car) return 0;
    let base = car.pricePerDay;
    const rates = (monthlyRatesRaw ?? []) as MonthlyRate[];
    if (rates.length > 0) {
      const ref = startDateObj ?? new Date();
      const monthly = resolveMonthlyRate(rates, car.id, car.category, ref.getMonth() + 1, ref.getFullYear());
      if (monthly !== null) base = monthly;
    }
    // Reflect any active surcharge in the per-day label so it matches the total.
    const perDaySurcharge = surchargeAmount > 0 && days > 0 ? surchargeAmount / days : 0;
    return Math.round((base + perDaySurcharge) * 100) / 100;
  }, [monthlyRatesRaw, car?.id, car?.category, car?.pricePerDay, startDateObj, surchargeAmount, days]);

  const validate = () => {
    const newErrors: Partial<BookingForm> = {};
    if (!form.pickup) newErrors.pickup = t("booking.validation.pickup");
    if (!form.dropoff) newErrors.dropoff = t("booking.validation.dropoff");
    if (!form.startDate) newErrors.startDate = t("booking.validation.startDate");
    if (!form.endDate) newErrors.endDate = t("booking.validation.endDate");
    if (form.startDate && form.endDate) {
      const start = buildLocalDateTime(form.startDate, form.startTime);
      const end = buildLocalDateTime(form.endDate, form.endTime);
      if (!start || !end) {
        newErrors.endDate = t("booking.validation.endDateAfter");
      } else {
        const nowFloor = new Date();
        nowFloor.setMinutes(0, 0, 0); // allow booking the current hour, not earlier
        if (start < nowFloor) newErrors.startDate = t("booking.validation.startDatePast");
        if (end <= start) newErrors.endDate = t("booking.validation.endDateAfter");
        if (minDaysRequired > 0 && days < minDaysRequired) newErrors.endDate = t("booking.validation.minDays", { count: minDaysRequired });
      }
    }
    if (!form.firstName) newErrors.firstName = t("booking.validation.firstName");
    if (!form.lastName) newErrors.lastName = t("booking.validation.lastName");
    if (!form.phone) newErrors.phone = t("booking.validation.phone");
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = t("booking.validation.email");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = validate();
    if (contractEnabled) {
      if (!signatureData) {
        setSignatureError(true);
        valid = false;
      } else {
        setSignatureError(false);
      }
      if (!termsAccepted) {
        setTermsError(true);
        valid = false;
      } else {
        setTermsError(false);
      }
    }
    if (!valid) return;
    if (!car) return;
    // Don't submit yet — ask for an explicit confirmation so visitors who are
    // only checking prices don't place a real reservation by accident.
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    if (!car) return;
    setConfirmOpen(false);
    setSaving(true);
    setBookingError(null);
    try {
      // 1. Criar ose gjej klientin
      const customer = await createCustomer({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: `${form.phonePrefix} ${form.phone.trim()}`.trim(),
        type: "Standard",
      });
      // 2. Krijo rezervimin
      const reservation = await createReservation({
        carId: car.id,
        customerId: customer.id,
        pickupLocation: form.pickup,
        dropoffLocation: form.dropoff,
        startDate: form.startDate,
        startTime: form.startTime,
        endDate: form.endDate,
        endTime: form.endTime,
        flightNumber: form.flightNumber.trim() || undefined,
        country: form.country || undefined,
        notes: "",
        source: "Web",
        status: "Pending",
        totalPrice: total,
        insurance: selectedInsurance ? selectedInsurance.nameSq : undefined,
        selectedExtras: Object.entries(form.selectedExtras)
          .filter(([, q]) => q > 0)
          .map(([extraId, quantity]) => ({ extraId, quantity })),
        discountCode: form.discountCode || undefined,
      });
      setSubmitted(true);
      // Always redirect to the single English thank-you URL (/en/thank-you) so
      // there is ONE conversion page for Google Ads / analytics, regardless of
      // the site language. Booking summary passed via state (no PII in URL).
      navigate('/en/thank-you', {
        state: {
          rid: reservation.id,
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          car: `${car.brand} ${car.model}`,
          pickup: form.pickup,
          start: formatLocalDate(form.startDate),
          end: formatLocalDate(form.endDate),
          total: String(total),
        },
      });
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : t("errors.bookingFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleExtra = (extra: ApiExtra) => {
    setForm((f) => {
      const current = f.selectedExtras[extra.id] ?? 0;
      const next = { ...f.selectedExtras };
      if (current > 0) delete next[extra.id];
      else next[extra.id] = 1;
      return { ...f, selectedExtras: next };
    });
  };

  // No carId in URL → show clear error immediately (don't wait for data)
  if (!carId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-6">
        <div className="bg-white rounded-xl border border-border p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <WarningCircle size={28} weight="regular" className="text-error" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Nuk u zgjodh asnjë makinë</h1>
          <p className="text-sm text-neutral-500 mb-6">Ju lutemi zgjidhni një makinë nga flota jonë për të vazhduar me rezervimin.</p>
          <button
            onClick={() => navigate(localePath("/flota"))}
            className="px-6 py-3 rounded-full text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            Shiko flotën
          </button>
        </div>
      </div>
    );
  }

  // carId present but cars still loading
  if (carId && !car && (allCars === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-neutral-500">{t("booking.loading")}</p>
      </div>
    );
  }

  // carId present but not found in DB
  if (carId && !car && allCars !== undefined) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-6">
        <div className="bg-white rounded-xl border border-border p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <WarningCircle size={28} weight="regular" className="text-error" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Makina nuk u gjet</h1>
          <p className="text-sm text-neutral-500 mb-6">Makina me këtë ID nuk ekziston ose nuk është më e disponueshme.</p>
          <button
            onClick={() => navigate(localePath("/flota"))}
            className="px-6 py-3 rounded-full text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            Shiko flotën
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="bg-white rounded-xl border border-border p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} weight="regular" className="text-success" />
          </div>
          <h1 className="text-2xl font-medium text-neutral-900 mb-2">
            {t("booking.confirmed.title")}
          </h1>
          <p className="text-neutral-500 mb-4">
            {t("booking.confirmed.subtitle")}
          </p>
          <p className="text-sm text-neutral-400">{t("booking.confirmed.redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-white border-b border-border py-6 px-6">
        <div className="max-w-[1440px] mx-auto">
          <h1 className="text-2xl font-medium text-neutral-900">
            {t("booking.title")}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {t("booking.subtitle")}
          </p>
          {car && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium">
              <Car size={16} weight="fill" />
              {t("booking.youAreBooking")}:{" "}
              <span className="font-semibold text-neutral-900">{`${car.brand} ${car.model}`.replace(/\b\p{L}/gu, (c) => c.toUpperCase())}</span>
              <span className="font-normal text-neutral-500">{" "}({t("booking.orSimilar")})</span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 space-y-6"
            noValidate
          >
            {/* Sticky mini car summary — keeps the car + price visible on mobile
                while the visitor fills the form (desktop has the sidebar). */}
            <div className="lg:hidden sticky top-[60px] z-20">
              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3 p-3">
                  <img
                    src={car.image}
                    alt={`${car.brand} ${car.model}`}
                    loading="lazy"
                    className="w-16 h-12 rounded-md object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{car.brand} {car.model}</p>
                    <p className="text-xs text-neutral-500 truncate">{categoryLabel(t, car.category)} · {transmissionLabel(t, car.transmission)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-neutral-900">€{total > 0 ? total : displayPricePerDay}</p>
                    <p className="text-[10px] text-neutral-500">{total > 0 ? t("booking.summaryTotal", "Totali") : t("carDetail.perDay", "/ditë")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="w-full border-t border-border px-3 py-2 text-xs font-medium text-primary flex items-center justify-center gap-1 cursor-pointer"
                >
                  {t("booking.detailsBtn", "Detajet")}
                  <CaretDown size={12} weight="bold" />
                </button>
              </div>
            </div>

            {/* Location & Dates */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-4">
                {t("booking.locationDates")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="b-pickup"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.pickup")}
                  </label>
                  <div className="relative">
                    <MapPin
                      size={16}
                      weight="regular"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <select
                      id="b-pickup"
                      value={form.pickup}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pickup: e.target.value }))
                      }
                      className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none"
                    >
                      <option value="">{t("booking.selectPlace")}</option>
                      {locationOptions.map((loc) => (
                        <option key={loc.value} value={loc.value}>
                          {formatLocationOption(loc)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {pickupFee > 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <MapPin size={11} weight="fill" />
                      {t("booking.extras.pickupFee")}: +€{pickupFee}
                    </p>
                  )}
                  {errors.pickup && (
                    <p className="text-xs text-error mt-1">{errors.pickup}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="b-dropoff"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.dropoff")}
                  </label>
                  <div className="relative">
                    <MapPin
                      size={16}
                      weight="regular"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <select
                      id="b-dropoff"
                      value={form.dropoff}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dropoff: e.target.value }))
                      }
                      className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none"
                    >
                      <option value="">{t("booking.selectPlace")}</option>
                      {locationOptions.map((loc) => (
                        <option key={loc.value} value={loc.value}>
                          {formatLocationOption(loc)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {dropoffFee > 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <MapPin size={11} weight="fill" />
                      {t("booking.extras.dropoffFee")}: +€{dropoffFee}
                    </p>
                  )}
                  {errors.dropoff && (
                    <p className="text-xs text-error mt-1">{errors.dropoff}</p>
                  )}
                </div>

                {/* Start Date + Time */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {t("booking.departureDatetime")}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <CalendarBlank
                        size={16}
                        weight="regular"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                      />
                      <input
                        id="b-start"
                        type="date"
                        value={form.startDate}
                        min={todayInputValue}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setForm((f) => ({
                            ...f,
                            startDate: newStart,
                            endDate: f.endDate && f.endDate < newStart ? "" : f.endDate,
                          }));
                        }}
                        className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                    <div className="relative w-36">
                      <Clock
                        size={16}
                        weight="regular"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                      />
                      <input
                        type="time"
                        value={form.startTime}
                        min={form.startDate === todayInputValue ? nowTimeValue : undefined}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, startTime: e.target.value }))
                        }
                        className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  </div>
                  {errors.startDate && (
                    <p className="text-xs text-error mt-1">{errors.startDate}</p>
                  )}
                </div>

                {/* End Date + Time */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {t("booking.returnDatetime")}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <CalendarBlank
                        size={16}
                        weight="regular"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                      />
                      <input
                        id="b-end"
                        type="date"
                        value={form.endDate}
                        min={form.startDate || todayInputValue}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, endDate: e.target.value }))
                        }
                        className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                    <div className="relative w-36">
                      <Clock
                        size={16}
                        weight="regular"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                      />
                      <input
                        type="time"
                        value={form.endTime}
                        min={form.endDate === todayInputValue ? nowTimeValue : undefined}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, endTime: e.target.value }))
                        }
                        className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  </div>
                  {minDaysViolation && !errors.endDate && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <WarningCircle size={13} weight="regular" />
                      {t("booking.validation.minDays", { count: minDaysRequired })}
                    </p>
                  )}
                  {errors.endDate && (
                    <p className="text-xs text-error mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-4">
                {t("booking.yourInfo")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="b-fname"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.firstName")}
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      weight="regular"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      id="b-fname"
                      type="text"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      placeholder={t("booking.firstNamePlaceholder")}
                      className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-xs text-error mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="b-lname"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.lastName")}
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      weight="regular"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      id="b-lname"
                      type="text"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      placeholder={t("booking.lastNamePlaceholder")}
                      className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-xs text-error mt-1">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="b-phone"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.phone")}
                  </label>
                  <div className="flex gap-2">
                    {/* Editable combobox: pick a prefix from the list OR type any custom one. */}
                    <input
                      type="text"
                      list="phone-prefixes"
                      value={form.phonePrefix}
                      onChange={(e) => setForm((f) => ({ ...f, phonePrefix: e.target.value }))}
                      aria-label="Prefiksi i shtetit"
                      placeholder="+355"
                      className="shrink-0 w-24 px-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <datalist id="phone-prefixes">
                      {COUNTRY_CODES.map((c) => (
                        <option key={`${c.iso2}${c.dial}`} value={c.dial}>
                          {flagEmoji(c.iso2)} {c.name}
                        </option>
                      ))}
                    </datalist>
                    <div className="relative flex-1">
                      <Phone
                        size={16}
                        weight="regular"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        id="b-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        placeholder={t("booking.phonePlaceholder")}
                        className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-error mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="b-email"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.email")}
                  </label>
                  <div className="relative">
                    <EnvelopeSimple
                      size={16}
                      weight="regular"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      id="b-email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder={t("booking.emailPlaceholder")}
                      className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-error mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="b-flight"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    {t("booking.flightNumber")}
                  </label>
                  <div className="relative">
                    <Airplane
                      size={16}
                      weight="regular"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      id="b-flight"
                      type="text"
                      value={form.flightNumber}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, flightNumber: e.target.value }))
                      }
                      placeholder={t("booking.flightNumberPlaceholder")}
                      className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="b-country" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {t("booking.country", "Shteti")}
                  </label>
                  <select
                    id="b-country"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.iso2} value={c.name}>{flagEmoji(c.iso2)} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Extras & Insurance */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">
                {t("booking.extrasInsurance")}
              </h2>
              <p className="text-sm text-neutral-500 mb-5">
                {t("booking.extrasSubtitle")}
              </p>

              {/* INSURANCE — radio (single select) */}
              {extrasByCategory.insurance.length > 0 && (
                <section className={`rounded-lg border p-4 mb-4 ${CATEGORY_META.insurance.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{CATEGORY_META.insurance.emoji}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-800">{t("booking.categories.insurance.name")}</h3>
                      <p className="text-xs text-neutral-500">{t("booking.categories.insurance.description")}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {extrasByCategory.insurance.map((e) => {
                      const isChecked = (form.selectedExtras[e.id] ?? 0) > 0;
                      const desc = extraDisplayDesc(e, uiLang);
                      return (
                        <label
                          key={e.id}
                          className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${isChecked ? "border-primary bg-white shadow-sm" : "border-border bg-white/70 hover:border-neutral-400"}`}
                        >
                          <input
                            type="radio"
                            name="insurance"
                            checked={isChecked}
                            onChange={() => selectInsurance(e.id)}
                            className="w-4 h-4 mt-0.5 accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-neutral-800">{extraDisplayName(e, uiLang)}</span>
                              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                {Number(e.price) === 0 ? t("booking.free") : `+€${e.price}${priceTypeLabel(e.priceType)}`}
                              </span>
                            </div>
                            {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* EQUIPMENT / SERVICE / ADDON — checkboxes with optional quantity */}
              {(["equipment", "service", "addon"] as ExtraCategory[]).map((cat) => {
                const items = extrasByCategory[cat];
                if (items.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <section key={cat} className={`rounded-lg border p-4 mb-4 ${meta.color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{meta.emoji}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800">{t(`booking.categories.${cat}.name`)}</h3>
                        <p className="text-xs text-neutral-500">{t(`booking.categories.${cat}.description`)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((e) => {
                        const qty = form.selectedExtras[e.id] ?? 0;
                        const checked = qty > 0;
                        const desc = extraDisplayDesc(e, uiLang);
                        return (
                          <div
                            key={e.id}
                            className={`flex items-start gap-3 p-3 rounded-md border bg-white transition-colors ${checked ? "border-primary shadow-sm" : "border-border hover:border-neutral-400"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleExtra(e)}
                              className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-neutral-800">{extraDisplayName(e, uiLang)}</span>
                                <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                  +€{e.price}{priceTypeLabel(e.priceType)}
                                </span>
                              </div>
                              {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
                              {checked && e.maxQuantity > 1 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => setExtraQuantity(e, qty - 1)}
                                    className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-sm hover:bg-azure cursor-pointer"
                                  >−</button>
                                  <span className="text-xs font-medium text-neutral-700 min-w-[1.5rem] text-center">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => setExtraQuantity(e, qty + 1)}
                                    disabled={qty >= e.maxQuantity}
                                    className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-sm hover:bg-azure cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  >+</button>
                                  <span className="text-[10px] text-neutral-400">max {e.maxQuantity}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Seasonal Pricing Banner — hidden when monthly rates are active */}
            {form.startDate && form.endDate && days > 0 && !monthlyRatesCalc?.usedMonthlyRate && (
              <div className={`rounded-lg border p-4 ${dominantSeason.badgeColor}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none mt-0.5">{dominantSeason.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{dominantSeason.label}</span>
                      {dominantSeason.multiplier !== 1 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                          {dominantSeason.multiplier > 1
                            ? `+${Math.round((dominantSeason.multiplier - 1) * 100)}% mbi bazë`
                            : `-${Math.round((1 - dominantSeason.multiplier) * 100)}% zbritje sezonale`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-80">{dominantSeason.description}</p>
                    {/* Multi-season breakdown */}
                    {seasonalData && seasonalData.breakdown.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                        <p className="text-xs font-medium opacity-70">Ndarja sipas sezonit:</p>
                        {seasonalData.breakdown.map((b) => (
                          <div key={b.season.id} className="flex justify-between text-xs">
                            <span>{b.season.emoji} {b.season.label} ({b.days} ditë × €{b.pricePerDay})</span>
                            <span className="font-medium">€{b.subtotal}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Discount */}
            {discountCodeEnabled && (
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-4">
                {t("booking.discountCode")}
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={form.discountCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountCode: e.target.value }))
                  }
                  placeholder={t("booking.discountPlaceholder")}
                  className="flex-1 px-4 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  className="px-5 py-3 rounded-full text-sm font-medium bg-azure text-secondary-foreground hover:bg-azure-hover transition-colors duration-200 cursor-pointer"
                >
                  {t("booking.apply")}
                </button>
              </div>
              {pricingRuleResult && pricingRuleResult.appliedDiscounts.some(d => d.rule.type === "promo_code") && (
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <CheckCircle size={14} weight="regular" />
                  Kodi u aplikua! -{pricingRuleResult.appliedDiscounts.find(d => d.rule.type === "promo_code")?.rule.discountType === "percent"
                    ? `${pricingRuleResult.appliedDiscounts.find(d => d.rule.type === "promo_code")?.rule.discountValue}%`
                    : `€${pricingRuleResult.appliedDiscounts.find(d => d.rule.type === "promo_code")?.rule.discountValue}`} zbritje
                </p>
              )}
              {!pricingRuleResult && form.discountCode.toUpperCase() === "TIRANA10" && (
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <CheckCircle size={14} weight="regular" />
                  Kodi u aplikua! -10% zbritje
                </p>
              )}
            </div>
            )}

            {/* Contract & Signature */}
            {contractEnabled && (
            <div className="bg-white rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={20} weight="regular" className="text-primary" />
                <h2 className="text-lg font-medium text-neutral-900">{t("booking.contract.title")}</h2>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                {t("booking.contract.subtitle")}
              </p>

              {/* Contract Terms Box */}
              <div className="bg-neutral-50 border border-border rounded-lg p-4 mb-4 max-h-48 overflow-y-auto text-xs text-neutral-600 leading-relaxed space-y-2">
                <p className="font-semibold text-neutral-800">{t("booking.contract.termsTitle")}</p>
                {(t("booking.contract.clauses", { returnObjects: true }) as { label: string; text: string }[]).map((c, i) => (
                  <p key={i}><strong>{i + 1}. {c.label}:</strong> {c.text}</p>
                ))}
                <p className="text-neutral-400 italic">{t("booking.contract.clausesFooter")}</p>
              </div>

              {/* Terms checkbox */}
              <label className={`flex items-start gap-3 mb-5 cursor-pointer p-3 rounded-lg border transition-colors ${termsAccepted ? "border-primary bg-azure" : termsError ? "border-error bg-error/5" : "border-border hover:border-neutral-400"}`}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) setTermsError(false);
                  }}
                  className="w-4 h-4 mt-0.5 accent-primary flex-shrink-0"
                />
                <span className="text-sm text-neutral-700">
                  {t("booking.contract.acceptLabel")}
                </span>
              </label>
              {termsError && (
                <p className="text-xs text-error mb-3 flex items-center gap-1">
                  <WarningCircle size={13} weight="regular" />
                  {t("booking.contract.mustAccept")}
                </p>
              )}

              {/* Signature pad */}
              <div className="mb-1">
                <p className="text-sm font-medium text-neutral-700 mb-2">{t("booking.contract.signatureLabel")}</p>
                <SignaturePad
                  onSign={(data) => {
                    setSignatureData(data);
                    setSignatureError(false);
                    setContractDownloaded(false);
                  }}
                  onClear={() => {
                    setSignatureData(null);
                    setContractDownloaded(false);
                  }}
                  signed={!!signatureData}
                />
                {signatureError && (
                  <p className="text-xs text-error mt-2 flex items-center gap-1">
                    <WarningCircle size={13} weight="regular" />
                    {t("booking.contract.signatureRequired")}
                  </p>
                )}
              </div>

              {/* Download Contract PDF — shows after signing */}
              {signatureData && (
                <div className={`mt-4 rounded-lg border p-4 transition-colors ${contractDownloaded ? "border-success/40 bg-success/5" : "border-primary/30 bg-azure"}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                    <p className="text-sm font-medium text-neutral-800">
                      {contractDownloaded ? t("booking.contract.downloadedTitle") : t("booking.contract.downloadTitle")}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {contractDownloaded ? t("booking.contract.downloadedSubtitle") : t("booking.contract.downloadSubtitle")}
                    </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!car || !signatureData) return;
                        const today = new Date().toLocaleDateString("sq-AL", { year: "numeric", month: "long", day: "numeric" });
                        downloadContractPdf({
                          clientName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || "Klient",
                          clientEmail: form.email.trim() || "—",
                          clientPhone: form.phone.trim() ? `${form.phonePrefix} ${form.phone.trim()}` : "—",
                          carName: `${car.brand} ${car.model}`,
                          carCategory: car.category,
                          carTransmission: car.transmission,
                          carImage: car.image,
                          pickupLocation: form.pickup || "—",
                          dropoffLocation: form.dropoff || "—",
                          startDate: form.startDate
                            ? formatLocalDate(form.startDate)
                            : "—",
                          startTime: form.startTime,
                          endDate: form.endDate
                            ? formatLocalDate(form.endDate)
                            : "—",
                          endTime: form.endTime,
                          days,
                          insurance: selectedInsurance ? extraDisplayName(selectedInsurance, uiLang) : "",
                          extras: resolvedExtras
                            .filter((r) => r.extra.category !== "insurance")
                            .map((r) => r.quantity > 1 ? `${extraDisplayName(r.extra, uiLang)} x${r.quantity}` : extraDisplayName(r.extra, uiLang)),
                          basePrice: preDiscountBase,
                          extrasTotal,
                          insuranceTotal,
                          discount: totalDiscount,
                          total,
                          signatureDataUrl: signatureData,
                          contractDate: today,
                          companyName: companyInfo.companyName,
                          companyPhone: companyInfo.companyPhone,
                          companyEmail: companyInfo.companyEmail,
                          companyAddress: companyInfo.companyAddress,
                          lang: i18n.language,
                          i18n: {
                            ...(t("booking.contractPdf", { returnObjects: true }) as Record<string, string>),
                            clauses: t("booking.contract.clauses", { returnObjects: true }) as { label: string; text: string }[],
                            clausesFooter: t("booking.contract.clausesFooter"),
                          },
                        });
                        setContractDownloaded(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors flex-shrink-0"
                    >
                      <DownloadSimple size={16} weight="regular" />
                      {t("booking.contract.downloadBtn")}
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            {carStatusBlocked && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-4 flex items-start gap-3">
                <span className="text-error text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-error">{t("booking.carUnavailable")}</p>
                  <p className="text-xs text-error/80 mt-0.5">
                    {t("booking.carUnavailableDetail", { status: car?.status })} <a href="/flota" className="underline">{t("header.fleet")}</a>.
                  </p>
                </div>
              </div>
            )}
            {!carStatusBlocked && !isCarAvailable && form.startDate && form.endDate && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-4 flex items-start gap-3">
                <span className="text-error text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-error">{t("booking.dateConflict")}</p>
                  <p className="text-xs text-error/80 mt-0.5">{t("booking.dateConflictDetail")} <a href="/flota" className="underline">{t("header.fleet")}</a>.</p>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={saving || !isCarAvailable || minDaysViolation}
              className="w-full py-4 rounded-full text-base font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity duration-200 cursor-pointer disabled:opacity-60"
            >
              {saving ? t("booking.submitting") : !isCarAvailable ? t("booking.unavailableBtn") : t("booking.submit")}
            </button>
            <p className="mt-2 text-center text-xs text-neutral-500">
              {t("booking.realBookingHint", "Ky është një rezervim real, jo kontroll çmimi. Për të parë vetëm çmimet, shiko ")}
              <a href="/flota" className="underline hover:text-primary">{t("header.fleet", "flotën")}</a>.
            </p>
            {bookingError && (
              <div className="mt-3 p-3 rounded-md bg-error/10 border border-error/20">
                <p className="text-sm text-error font-medium">{bookingError}</p>
              </div>
            )}
          </form>

          {/* Summary */}
          <div className="lg:col-span-1">
            {/* Mobile toggle */}
            <button
              className="lg:hidden w-full flex items-center justify-between p-4 bg-white rounded-lg border border-border mb-4 cursor-pointer"
              onClick={() => setSummaryOpen(!summaryOpen)}
              aria-expanded={summaryOpen}
            >
              <span className="text-sm font-medium text-neutral-800">
                {t("booking.summary")}
              </span>
              {summaryOpen ? (
                <CaretUp
                  size={16}
                  weight="regular"
                  className="text-neutral-500"
                />
              ) : (
                <CaretDown
                  size={16}
                  weight="regular"
                  className="text-neutral-500"
                />
              )}
            </button>

            <div className={`lg:block lg:h-full ${summaryOpen ? "block" : "hidden"}`}>
              <div className="sticky top-24 bg-white rounded-lg border border-border p-6">
                <h2 className="text-lg font-medium text-neutral-900 mb-4">
                  {t("booking.summaryTitle")}
                </h2>

                <div className="flex gap-3 mb-4 pb-4 border-b border-border">
                  <img
                    src={car.image}
                    alt={`${car.brand} ${car.model}`}
                    loading="lazy"
                    className="w-20 h-16 rounded-md object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {car.brand} {car.model}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {categoryLabel(t, car.category)} · {transmissionLabel(t, car.transmission)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      €{displayPricePerDay}/ditë
                    </p>
                  </div>
                </div>

                {/* What's included — always visible on desktop */}
                <div className="mb-4 pb-4 border-b border-border">
                  <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">{t("booking.includedTitle", "Çfarë përfshihet")}</p>
                  <ul className="space-y-1.5">
                    {(t("booking.included", { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
                        <CheckCircle size={14} weight="fill" className="text-success shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 mb-4">
                  {/* Active pricing rule discounts */}
                  {pricingRuleResult && pricingRuleResult.appliedDiscounts
                    .filter((disc) => disc.discountAmount > 0)
                    .map((disc) => {
                    const meta = RULE_TYPE_LABELS[disc.rule.type] ?? { emoji: "🏷️", color: "bg-green-100 text-green-700 border-green-200" };
                    return (
                      <div key={disc.rule.id} className={`text-xs px-2 py-1 rounded-md border inline-flex items-center gap-1 ${meta.color}`}>
                        <span>{disc.label}</span>
                        <span className="font-semibold">-€{disc.discountAmount}</span>
                      </div>
                    );
                  })}
                  {!monthlyRatesCalc?.usedMonthlyRate && seasonalData && seasonalData.breakdown.length > 1 ? (
                    <>
                      {seasonalData.breakdown.map((b) => (
                        <div key={b.season.id} className="flex justify-between text-sm text-neutral-700">
                          <span>{b.season.emoji} {b.days} ditë × €{b.pricePerDay}</span>
                          <span>€{b.subtotal}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex justify-between text-sm text-neutral-700">
                      <span>
                        {days > 0 && seasonalData && !monthlyRatesCalc?.usedMonthlyRate
                          ? `${dominantSeason.emoji} ${days} ${t("booking.days")} × €${effectiveDailyRate}`
                          : days > 0
                          ? `${days} ${t("booking.days")} × €${effectiveDailyRate}`
                          : t("booking.discountCode")}
                      </span>
                      <span>€{basePrice}</span>
                    </div>
                  )}
                  {!monthlyRatesCalc?.usedMonthlyRate && dominantSeason.multiplier !== 1 && days > 0 && (
                    <div className={`text-xs px-2 py-1 rounded-md border inline-flex items-center gap-1 ${dominantSeason.badgeColor}`}>
                      <Tag size={11} weight="bold" />
                      {dominantSeason.label}
                    </div>
                  )}
                  {locationFeeTotal > 0 && (
                    <div className="flex justify-between text-sm text-amber-700">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} weight="fill" />
                        {t("booking.extras.locationFee")}
                        {pickupFee > 0 && dropoffFee > 0 ? ` (${t("booking.extras.pickupAndDropoff")})` : ""}
                      </span>
                      <span>+€{locationFeeTotal}</span>
                    </div>
                  )}
                  {extrasTotal > 0 && (
                    <div className="flex justify-between text-sm text-neutral-700">
                      <span>{t("booking.extras")}</span>
                      <span>€{extrasTotal}</span>
                    </div>
                  )}
                  {insuranceTotal > 0 && (
                    <div className="flex justify-between text-sm text-neutral-700">
                      <span>{t("booking.insurance2")}</span>
                      <span>€{insuranceTotal}</span>
                    </div>
                  )}
                  {pricingRuleResult && pricingRuleResult.appliedDiscounts
                    .filter((disc) => disc.discountAmount > 0)
                    .map((disc) => (
                    <div key={disc.rule.id} className="flex justify-between text-sm text-success">
                      <span>{disc.label}</span>
                      <span>-€{disc.discountAmount}</span>
                    </div>
                  ))}
                  {legacyDiscount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>{t("booking.discount")}</span>
                      <span>-€{legacyDiscount}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-base font-semibold text-neutral-900 pt-3 border-t border-border">
                  <span>{t("booking.total")}</span>
                  <span>€{total}</span>
                </div>

                {days === 0 && (
                  <p className="text-xs text-neutral-400 mt-3 text-center">
                    {t("booking.selectDateNote")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile "Details" popup — pickup/return + what's included */}
      {detailsOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/60" onClick={() => setDetailsOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <img src={car.image} alt={`${car.brand} ${car.model}`} loading="lazy" className="w-16 h-12 rounded-md object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 truncate">{car.brand} {car.model}</p>
                <p className="text-xs text-neutral-500 truncate">{categoryLabel(t, car.category)} · {transmissionLabel(t, car.transmission)}</p>
              </div>
              <button onClick={() => setDetailsOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer text-lg leading-none" aria-label="Mbylle">✕</button>
            </div>

            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">{t("booking.pickupReturn", "Marrja dhe kthimi")}</p>
            <div className="space-y-3 mb-5">
              <div className="flex gap-2">
                <MapPin size={16} weight="fill" className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-neutral-400">{t("booking.pickupLabel", "Marrja")}</p>
                  <p className="text-sm text-neutral-800">{(() => { const o = locationOptions.find((x) => x.value === form.pickup); return o ? formatLocationName(o) : (form.pickup || "—"); })()}</p>
                  {form.startDate && <p className="text-xs text-neutral-500">{formatLocalDate(form.startDate)} · {form.startTime}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <MapPin size={16} weight="fill" className="text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-neutral-400">{t("booking.returnLabel", "Kthimi")}</p>
                  <p className="text-sm text-neutral-800">{(() => { const o = locationOptions.find((x) => x.value === form.dropoff); return o ? formatLocationName(o) : (form.dropoff || "—"); })()}</p>
                  {form.endDate && <p className="text-xs text-neutral-500">{formatLocalDate(form.endDate)} · {form.endTime}</p>}
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2 pt-4 border-t border-border">{t("booking.includedTitle", "Çfarë përfshihet")}</p>
            <ul className="space-y-2">
              {(t("booking.included", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <CheckCircle size={16} weight="fill" className="text-success shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button onClick={() => setDetailsOpen(false)} className="mt-5 w-full py-2.5 rounded-md text-sm font-medium border border-border text-neutral-700 hover:bg-azure transition-colors cursor-pointer">
              {t("booking.close", "Mbylle")}
            </button>
          </div>
        </div>
      )}

      {/* Final confirmation — makes clear this is a REAL reservation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/60" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={26} weight="fill" className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              {t("booking.confirmTitle", "Po bën një rezervim real")}
            </h3>
            <p className="text-sm text-neutral-600 mb-5">
              {t("booking.confirmBody", "Ky nuk është kontroll çmimi — po dërgon një kërkesë rezervimi dhe ekipi do të të kontaktojë. Dëshiron të vazhdosh?")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border text-neutral-700 hover:bg-azure transition-colors cursor-pointer"
              >
                {t("booking.confirmCancel", "Jo, vetëm çmimet")}
              </button>
              <button
                onClick={doSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
              >
                {saving ? t("booking.submitting") : t("booking.confirmOk", "Po, rezervo")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
