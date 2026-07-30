import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LLink from "../components/LLink";
import { useLocale } from "../hooks/useLocale";
import { useTranslation } from "react-i18next";
import { useSEO, buildCarProductSchema, buildBreadcrumbSchema, SITE_URL } from "../hooks/useSEO";
import {
  Users,
  Briefcase,
  GasPump,
  Gear,
  ShieldCheck,
  MapPin,
  CheckCircle,
  ArrowLeft,
  SpinnerGap,
  Star,
  Clock,
  CaretRight,
  Headset,
  SealCheck,
  Lightning,
  Gauge,
  Wind,
  Thermometer,
  CarSimple,
  Info,
  ArrowRight,
  Phone,
  WhatsappLogo,
  CaretLeft,
  CaretRight as CaretRightIcon,
  GoogleLogo,
  X,
  ShareNetwork,
  LinkSimple,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Tag,
  Eye,
} from "@phosphor-icons/react";
import { useQuery } from "../hooks/useApi";
import { trackViewItem } from "../lib/analytics";
import { trackEvent } from "../lib/track";
import CarCard from "../components/CarCard";
import FAQAccordion from "../components/FAQAccordion";
import Footer from "../components/Footer";
import StatusBadge from "../components/StatusBadge";
import { getSeasonForDate, getSeasonalPricePerDay, calculateSeasonalTotal } from "../lib/seasonalPricing";
import { applyPricingRules, RULE_TYPE_LABELS, getMinDaysRequirement, doesRuleMatch } from "../lib/pricingRules";
import type { PricingRule, PricingResult } from "../lib/pricingRules";
import { useLocations } from "../hooks/useLocations";
import { categoryLabel, transmissionLabel, fuelLabel } from "../i18n/dataLabels";
import { formatLocationOption } from "../lib/locations";
import { parseLocalDate, buildLocalDateTime, formatDateInputValue } from "../lib/dateHelpers";

// Inline monthly rate resolution (avoids shared-module TDZ in Rollup bundle)
interface MonthlyRate { id: string; year: number | null; month: number; appliesTo: string; appliesToValue: string | null; pricePerDay: number; }
function resolveMonthlyRate(rates: MonthlyRate[], carId: string, carCategory: string, month: number, year: number): number | null {
  const matching = rates.filter(r => Number(r.month) === month && (r.year === null || Number(r.year) === year));
  if (matching.length === 0) return null;
  return (matching.find(r => r.appliesTo === 'car' && r.appliesToValue === carId)
    ?? matching.find(r => r.appliesTo === 'category' && r.appliesToValue === carCategory)
    ?? matching.find(r => r.appliesTo === 'all')
    ?? null)?.pricePerDay ?? null;
}
function calcMonthlyTotal(rates: MonthlyRate[], carId: string, carCategory: string, basePPD: number, startDate: Date, endDate: Date): number {
  const cur = new Date(startDate); cur.setHours(0,0,0,0);
  const end = new Date(endDate); end.setHours(0,0,0,0);
  const msPerDay = 86400000;
  const days = Math.max(1, Math.ceil((end.getTime() - cur.getTime()) / msPerDay));
  let total = 0;
  for (let i = 0; i < days; i += 1) {
    const r = resolveMonthlyRate(rates, carId, carCategory, cur.getMonth() + 1, cur.getFullYear());
    total += r !== null ? r : basePPD;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.round(total * 100) / 100;
}

// These constants use icon references; labels are resolved via t() at render time
const EXTRAS_ICONS = [
  { icon: Wind, key: "ac" },
  { icon: Gauge, key: "cruise" },
  { icon: Thermometer, key: "heating" },
  { icon: CarSimple, key: "parking" },
];

// Scroll-triggered animation hook
function useInView(threshold = 0.15) {
  const [inView, setInView] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  // Callback ref fires whenever the element mounts/unmounts, even after async car data loads
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }
    if (!el) return;
    obsRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obsRef.current?.disconnect(); } },
      { threshold }
    );
    obsRef.current.observe(el);
  }, [threshold]);
  return { ref, inView };
}

type Tab = "specs" | "features" | "policy";

// Car images — generate extra views from the base image via unsplash params (real apps would have multiple URLs)
function getCarImages(baseImage: string): string[] {
  // If it's already an unsplash URL, generate variations; otherwise just repeat
  if (baseImage.includes("unsplash.com")) {
    const base = baseImage.split("?")[0];
    return [
      `${base}?w=1200&q=80`,
      `${base}?w=1200&q=80&sat=-20`,
      `${base}?w=1200&q=80&con=20`,
      `${base}?w=1200&q=80&bri=10`,
    ];
  }
  return [baseImage, baseImage, baseImage];
}

export default function CarDetailPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { localePath } = useLocale();
  const { data: allCars, isPending } = useQuery("Car");
  const { data: allReservations } = useQuery("ReservationAvailability");
  const { data: dbReviews } = useQuery("Review", { where: { approved: true }, orderBy: { createdAt: "desc" }, limit: 6 });
  const { data: googleData } = useQuery("GoogleReview");
  const { data: pricingRulesRaw } = useQuery("PricingRule");
  const { data: monthlyRatesPublic } = useQuery("MonthlyRatePublic", { where: { year: new Date().getFullYear() } });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:00");
  const [tab, setTab] = useState<Tab>("specs");
  const [heroVisible, setHeroVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  // Unified locations from /api/settings/public (single source of truth).
  const { options: locationOptions, pickupOptions, dropoffOptions, defaultLocation, computeFee } = useLocations(
    (i18n?.language === "en" ? "en" : "sq") as "sq" | "en",
  );
  const [pickupLocation, setPickupLocation] = useState(defaultLocation);
  const [dropoffLocation, setDropoffLocation] = useState(defaultLocation);
  // Re-sync when the async fetch resolves and the default changes.
  useEffect(() => {
    if (!pickupLocation && defaultLocation) setPickupLocation(defaultLocation);
    if (!dropoffLocation && defaultLocation) setDropoffLocation(defaultLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocation]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryZoom, setGalleryZoom] = useState(1);
  const galleryRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const bookingCardRef = useRef<HTMLDivElement>(null);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);

  // Scroll-triggered refs
  const { ref: reviewsRef, inView: reviewsInView } = useInView();

  // Reset state when slug changes (navigating to a different car)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setTab("specs");
    setGalleryIndex(0);
    setGalleryOpen(false);
    setGalleryZoom(1);
    setHeroVisible(false);
    setCardVisible(false);
    setStartDate("");
    setEndDate("");
    setPickupLocation(defaultLocation);
    setDropoffLocation(defaultLocation);
    setShowFloatingBtn(false);
    const t1 = setTimeout(() => setHeroVisible(true), 80);
    const t2 = setTimeout(() => setCardVisible(true), 280);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [slug]);

  // Show floating CTA when booking card is out of view
  useEffect(() => {
    const handleScroll = () => {
      if (!bookingCardRef.current) return;
      const rect = bookingCardRef.current.getBoundingClientRect();
      setShowFloatingBtn(rect.bottom < 0 || rect.top > window.innerHeight);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const car = (allCars ?? []).find((c) => c.slug === slug);
  const carImages = useMemo(() => car ? getCarImages(car.image) : [], [car?.image]);

  // GA4 funnel step 1 — fire once when the car resolves.
  const viewItemTracked = useRef(false);
  useEffect(() => {
    if (!car || viewItemTracked.current) return;
    viewItemTracked.current = true;
    trackViewItem({ carName: `${car.brand} ${car.model}`, pricePerDay: car.pricePerDay, category: car.category });
    trackEvent("view_car", { car: `${car.brand} ${car.model}`, category: car.category });
  }, [car?.id]);

  // Gallery keyboard navigation + focus trap
  useEffect(() => {
    if (!galleryOpen) return;
    const dialog = galleryRef.current;
    if (dialog) dialog.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setGalleryOpen(false); setGalleryZoom(1); return; }
      if (e.key === "ArrowLeft") { setGalleryIndex((prev) => (prev - 1 + carImages.length) % carImages.length); setGalleryZoom(1); return; }
      if (e.key === "ArrowRight") { setGalleryIndex((prev) => (prev + 1) % carImages.length); setGalleryZoom(1); return; }
      if (e.key === "+" || e.key === "=") { setGalleryZoom((z) => Math.min(z + 0.5, 3)); return; }
      if (e.key === "-") { setGalleryZoom((z) => Math.max(z - 0.5, 1)); return; }
      // Focus trap
      if (e.key === "Tab" && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = prevOverflow; };
  }, [galleryOpen, carImages.length]);

  const startDateObj = useMemo(() => (startDate ? parseLocalDate(startDate) : null), [startDate]);
  const endDateObj = useMemo(() => (endDate ? parseLocalDate(endDate) : null), [endDate]);
  const invalidDateRange = useMemo(
    () => Boolean(startDateObj && endDateObj && startDateObj > endDateObj),
    [startDateObj, endDateObj]
  );

  // Compute prices early so useSEO can use them
  const seasonalPricePerDay = useMemo(
    () => car ? getSeasonalPricePerDay(car.pricePerDay, startDateObj ?? undefined) : 0,
    [car?.pricePerDay, car, startDateObj]
  );
  const effectivePricePerDay = useMemo(() => {
    if (!car) return seasonalPricePerDay;
    const rates = (monthlyRatesPublic ?? []) as MonthlyRate[];
    if (rates.length > 0) {
      const ref = startDateObj ?? new Date();
      const monthly = resolveMonthlyRate(rates, car.id, car.category, ref.getMonth() + 1, ref.getFullYear());
      if (monthly !== null) return monthly;
    }
    return seasonalPricePerDay;
  }, [car?.id, car?.category, car?.pricePerDay, monthlyRatesPublic, seasonalPricePerDay, startDateObj]);

  // Rating for Product schema — real review data only (Google Places first, then
  // approved DB reviews). Never the i18n placeholder reviews and never a
  // hardcoded score: fabricated aggregateRating is a Google spam-policy
  // violation and risks losing rich results across the whole domain.
  const schemaRating = useMemo(() => {
    const gd = googleData as { rating?: number; totalRatings?: number } | null;
    if (gd?.rating && gd.rating > 0 && (gd.totalRatings ?? 0) > 0) {
      return { value: gd.rating, count: gd.totalRatings as number };
    }
    if (dbReviews && dbReviews.length > 0) {
      const sum = dbReviews.reduce((s, r) => s + (r.rating || 0), 0);
      return { value: sum / dbReviews.length, count: dbReviews.length };
    }
    return null;
  }, [googleData, dbReviews]);

  // Dynamic SEO per car — called unconditionally (hooks rule)
  useSEO(
    car
      ? {
          title: t("carDetail.seo.title", { brand: car.brand, model: car.model, year: car.year, price: effectivePricePerDay }),
          description: t("carDetail.seo.description", { brand: car.brand, model: car.model, year: car.year, price: effectivePricePerDay, category: car.category, transmission: car.transmission, fuel: car.fuel }),
          keywords: t("carDetail.seo.keywords", { brand: car.brand, model: car.model, category: car.category.toLowerCase() }),
          canonical: `/makina/${car.slug}`,
          ogImage: car.image,
          ogType: "product",
          structuredData: [
            buildCarProductSchema({ ...car, rating: schemaRating }),
            buildBreadcrumbSchema(
              [
                { name: t("carDetail.breadcrumb.home"), url: "/" },
                { name: t("carDetail.breadcrumb.fleet"), url: "/flota" },
                { name: `${car.brand} ${car.model}`, url: `/makina/${car.slug}` },
              ],
              `${SITE_URL}/makina/${car.slug}`,
            ),
          ],
        }
      : {
          title: t("carDetail.seo.fallbackTitle"),
          description: t("carDetail.seo.fallbackDesc"),
          canonical: "/flota",
        }
  );

  const relatedCars = useMemo(() => (allCars ?? [])
    .filter((c) => car ? c.category === car.category && c.id !== car.id : false)
    .slice(0, 3), [allCars, car?.category, car?.id]);

  const days = useMemo(() => {
    if (!startDateObj || !endDateObj || invalidDateRange) return 0;
    const diff = endDateObj.getTime() - startDateObj.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [startDateObj, endDateObj, invalidDateRange]);

  // Live availability check
  const dateConflict = useMemo(() => {
    if (!startDateObj || !endDateObj || !car || invalidDateRange) return false;
    const reqStart = buildLocalDateTime(startDate, "10:00");
    const reqEnd = buildLocalDateTime(endDate, "10:00");
    if (!reqStart || !reqEnd || reqEnd <= reqStart) return false;
    const activeReservations = (allReservations ?? []).filter(
      (r) => r.carId === car.id && r.status !== "Cancelled" && r.status !== "Completed"
    );
    const overlappingCount = activeReservations.filter((r) => {
      const rStart = buildLocalDateTime(r.startDate, r.startTime || "10:00");
      const rEnd = buildLocalDateTime(r.endDate, r.endTime || "10:00");
      return Boolean(rStart && rEnd && reqStart < rEnd && reqEnd > rStart);
    }).length;
    return overlappingCount >= (Number(car.quantity) || 1);
  }, [startDateObj, endDateObj, startDate, endDate, allReservations, car?.id, car?.quantity, invalidDateRange]);

  // Reviews — Google Places API (priority) → DB approved → i18n static fallback
  const googleReviewsList = useMemo(() => {
    const gd = googleData as { rating?: number; totalRatings?: number; reviews?: any[] } | null;
    return gd?.reviews ?? [];
  }, [googleData]);
  const googleMeta = useMemo(() => {
    const gd = googleData as { rating?: number; totalRatings?: number } | null;
    return { rating: gd?.rating ?? null, totalRatings: gd?.totalRatings ?? 0 };
  }, [googleData]);

  const reviews = useMemo(() => {
    if (googleReviewsList.length > 0) {
      return googleReviewsList.map((r: any, i: number) => ({
        id: `g${i}`,
        authorName: r.authorName,
        rating: r.rating,
        text: r.text,
        avatar: r.authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        photoUrl: r.profilePhotoUrl ?? null,
        date: r.relativeTime ?? "",
        fromGoogle: true as const,
      }));
    }
    if (dbReviews && dbReviews.length > 0) {
      return dbReviews.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        text: r.text,
        avatar: r.authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        photoUrl: null as null,
        date: new Date(r.createdAt).toLocaleDateString("sq-AL", { month: "long", year: "numeric" }),
        fromGoogle: false as const,
      }));
    }
    return (t("carDetail.staticReviews", { returnObjects: true }) as { authorName: string; rating: number; text: string; date: string }[]).map((r, i) => ({
      id: `r${i + 1}`,
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      avatar: r.authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      photoUrl: null as null,
      date: r.date,
      fromGoogle: false as const,
    }));
  }, [googleReviewsList, dbReviews, t]);

  // Aggregate rating: Google business rating if available, else average of shown reviews
  const displayRating = googleMeta.rating ?? (reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 4.9);
  const displayTotalRatings = googleMeta.totalRatings > 0 ? googleMeta.totalRatings : reviews.length;
  const isFromGoogle = googleReviewsList.length > 0;

  // Current season for hero display
  const currentSeason = useMemo(() => getSeasonForDate(new Date()), []);

  // (seasonalPricePerDay and effectivePricePerDay are computed above useSEO)

  // Visual price shown as the "current" price — promo (displayPrice) overrides
  // when set. The real seasonal price (effectivePricePerDay) still drives all
  // booking calculations below.
  const shownPrice = car?.displayPrice != null ? Math.round(car.displayPrice) : effectivePricePerDay;
  // "List price" — struck-through visual; always a bit higher than what's shown.
  const listPrice = useMemo(
    () => car ? Math.max(Math.round(car.pricePerDay * 1.2), Math.round(effectivePricePerDay * 1.01)) : 0,
    [car?.pricePerDay, effectivePricePerDay]
  );
  const discount = listPrice > shownPrice ? Math.round(((listPrice - shownPrice) / listPrice) * 100) : 0;

  // Is a monthly rate active for the selected start month?
  const monthlyRateActive = useMemo(() => {
    if (!car || !startDateObj) return false;
    const rates = (monthlyRatesPublic ?? []) as MonthlyRate[];
    if (rates.length === 0) return false;
    const ref = startDateObj;
    return resolveMonthlyRate(rates, car.id, car.category, ref.getMonth() + 1, ref.getFullYear()) !== null;
  }, [car?.id, car?.category, monthlyRatesPublic, startDateObj]);

  // Smart pricing: monthly rates (priority) or seasonal + discount rules only
  const smartPricing = useMemo<PricingResult | null>(() => {
    if (!car || !startDateObj || !endDateObj || invalidDateRange) return null;
    const rates = (monthlyRatesPublic ?? []) as MonthlyRate[];
    const rawBase = rates.length > 0
      ? calcMonthlyTotal(rates, car.id, car.category, car.pricePerDay, startDateObj, endDateObj)
      : calculateSeasonalTotal(car.pricePerDay, startDateObj, endDateObj).total;
    const ctx = {
      carId: car.id,
      carCategory: car.category,
      startDate: startDateObj,
      endDate: endDateObj,
      days,
      bookingDate: new Date(),
    };
    // Surcharge (e.g. short-rental price bump): fold the top-priority matching
    // surcharge into the base so the shown total matches what the backend charges.
    const allRules = (pricingRulesRaw ?? []) as PricingRule[];
    const topSurcharge = allRules
      .filter(r => r.direction === "surcharge" && r.type !== "promo_code" && doesRuleMatch(r, ctx))
      .sort((a, b) => b.priority - a.priority)[0];
    const surchargeAmount = topSurcharge
      ? (topSurcharge.discountType === "percent"
          ? Math.round(rawBase * (Number(topSurcharge.discountValue) || 0) / 100 * 100) / 100
          : (Number(topSurcharge.discountValue) || 0))
      : 0;
    const priceBase = rawBase + surchargeAmount;
    // Only discount rules (no surcharges) on top of the surcharged base
    const rules = allRules.filter(r => !r.direction || r.direction === "discount");
    return applyPricingRules(rules, priceBase, {
      carId: car.id,
      carCategory: car.category,
      startDate: startDateObj,
      endDate: endDateObj,
      days,
      bookingDate: new Date(),
    });
  }, [car?.id, car?.category, car?.pricePerDay, startDateObj, endDateObj, days, pricingRulesRaw, monthlyRatesPublic, invalidDateRange]);

  // Minimum days restriction
  const minDaysRequired = useMemo(() => {
    if (!car || !startDateObj || !endDateObj) return 0;
    return getMinDaysRequirement(
      (pricingRulesRaw ?? []) as PricingRule[],
      { carId: car.id, carCategory: car.category, startDate: startDateObj, endDate: endDateObj }
    );
  }, [pricingRulesRaw, car, startDateObj, endDateObj]);

  const minDaysViolation = days > 0 && minDaysRequired > 0 && days < minDaysRequired;

  // Seasonal breakdown for display
  const seasonalBreakdown = useMemo(() => {
    if (!car || !startDateObj || !endDateObj || invalidDateRange) return null;
    return calculateSeasonalTotal(car.pricePerDay, startDateObj, endDateObj);
  }, [car?.pricePerDay, startDateObj, endDateObj, invalidDateRange]);

  // Social share handler
  const handleShare = useCallback(async () => {
    if (!car) return;
    const url = window.location.href;
    const text = t("carDetail.share.text", { brand: car.brand, model: car.model, price: effectivePricePerDay });
    if (navigator.share) {
      try {
        await navigator.share({ title: `${car.brand} ${car.model}`, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      // Simple feedback — could be enhanced with toast
      alert(t("carDetail.share.copied"));
    }
  }, [car, t, seasonalPricePerDay]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton hero */}
        <div className="relative w-full bg-neutral-200 animate-pulse" style={{ height: "72vh", minHeight: 520 }}>
          <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-8 space-y-3">
            <div className="h-3 w-24 bg-neutral-300 rounded" />
            <div className="h-10 w-72 bg-neutral-300 rounded" />
            <div className="flex gap-2">
              {[1,2,3,4].map(i => <div key={i} className="h-7 w-20 bg-neutral-300 rounded-full" />)}
            </div>
            <div className="h-10 w-48 bg-neutral-300 rounded" />
          </div>
        </div>
        {/* Skeleton trust bar */}
        <div className="bg-white border-b border-border/60 py-3 px-6">
          <div className="flex gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />)}
          </div>
        </div>
        {/* Skeleton content */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-10 w-72 bg-neutral-200 rounded animate-pulse" />
            <div className="h-64 bg-neutral-200 rounded-xl animate-pulse" />
            <div className="h-40 bg-neutral-200 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-96 bg-neutral-200 rounded-2xl animate-pulse" />
            <div className="h-16 bg-neutral-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-neutral-900 mb-4">{t("carDetail.notFound")}</h1>
          <LLink to="/flota" className="text-primary no-underline hover:underline">
            {t("carDetail.backToFleet")}
          </LLink>
        </div>
      </div>
    );
  }

  const { pickupFee, dropoffFee, total: locationFee } = computeFee(pickupLocation, dropoffLocation);

  const total = (smartPricing ? smartPricing.finalPrice : days * effectivePricePerDay) + (days > 0 ? locationFee : 0);
  const baseTotal = smartPricing ? smartPricing.basePrice : days * effectivePricePerDay;
  const today = formatDateInputValue();

  const carIsUnavailable = car.status === "I rezervuar" || car.status === "Në mirëmbajtje";
  const available = !carIsUnavailable && !dateConflict && !invalidDateRange && Boolean(startDate && endDate);

  const availabilityLabel = carIsUnavailable
    ? (car.status === "I rezervuar" ? t("carDetail.availability.booked") : t("carDetail.availability.maintenance"))
    : invalidDateRange
    ? t("carDetail.availability.invalidRange")
    : dateConflict
    ? t("carDetail.availability.dateTaken")
    : t("carDetail.availability.available");

  const availableStatus = !carIsUnavailable && !dateConflict;

  const specs = [
    { icon: Gear, label: t("carDetail.specs.transmission"), value: transmissionLabel(t, car.transmission) },
    { icon: GasPump, label: t("carDetail.specs.fuel"), value: fuelLabel(t, car.fuel) },
    { icon: Users, label: t("carDetail.specs.seats"), value: t("carDetail.hero.seats", { count: car.seats }) },
    { icon: Briefcase, label: t("carDetail.specs.luggage"), value: t("carDetail.hero.luggage", { count: car.luggage }) },
    { icon: MapPin, label: t("carDetail.specs.category"), value: categoryLabel(t, car.category) },
    { icon: ShieldCheck, label: t("carDetail.specs.insurance"), value: t("carDetail.specs.insuranceValue") },
  ];

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── FLOATING RESERVE BUTTON (mobile/scroll) ────────── */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          showFloatingBtn ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        <button
          onClick={() =>
            navigate(localePath(`/rezervo?car=${car.id}${startDate ? `&start=${startDate}` : ""}${endDate ? `&end=${endDate}` : ""}&pickup=${encodeURIComponent(pickupLocation)}&dropoff=${encodeURIComponent(dropoffLocation)}`))
          }
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-primary text-white font-bold text-sm shadow-2xl shadow-primary/40 hover:opacity-90 active:scale-[0.97] transition-all duration-200 cursor-pointer"
        >
          <Lightning size={16} weight="fill" />
          {t("carDetail.floatingBtn", { brand: car.brand, model: car.model })}
          <ArrowRight size={15} weight="bold" />
        </button>
      </div>

      {/* ── GALLERY LIGHTBOX ─────────────────────────────────── */}
      {galleryOpen && (
        <div
          ref={galleryRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("carDetail.aria.openGallery")}
          tabIndex={-1}
          className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center outline-none"
          onClick={() => setGalleryOpen(false)}
        >
          {/* Close */}
          <button
            aria-label={t("carDetail.aria.closeGallery")}
            onClick={(e) => { e.stopPropagation(); setGalleryOpen(false); setGalleryZoom(1); }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center hover:bg-white/20 transition cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>

          {/* Zoom controls */}
          <div className="absolute top-4 left-4 flex gap-2">
            <button
              aria-label={t("carDetail.aria.zoomIn")}
              onClick={(e) => { e.stopPropagation(); setGalleryZoom((z) => Math.min(z + 0.5, 3)); }}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center hover:bg-white/20 transition cursor-pointer"
            >
              <MagnifyingGlassPlus size={16} weight="bold" />
            </button>
            <button
              aria-label={t("carDetail.aria.zoomOut")}
              onClick={(e) => { e.stopPropagation(); setGalleryZoom((z) => Math.max(z - 0.5, 1)); }}
              disabled={galleryZoom <= 1}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center hover:bg-white/20 transition cursor-pointer disabled:opacity-30"
            >
              <MagnifyingGlassMinus size={16} weight="bold" />
            </button>
            {galleryZoom > 1 && (
              <span className="h-9 flex items-center px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 text-white text-xs font-medium">
                {galleryZoom.toFixed(1)}x
              </span>
            )}
          </div>

          {/* Inner layout: [prev] [image] [next + thumbnails-column] */}
          <div
            className="flex items-center gap-3 max-w-[92vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev arrow */}
            <button
              aria-label={t("carDetail.aria.prevPhoto")}
              className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex - 1 + carImages.length) % carImages.length); setGalleryZoom(1); }}
            >
              <CaretLeft size={20} weight="bold" />
            </button>

            {/* Main image with zoom */}
            <div className="overflow-hidden rounded-xl flex-shrink-0 max-h-[80vh] max-w-[60vw]">
              <img
                src={carImages[galleryIndex]}
                alt={t("carDetail.hero.photoAlt", { brand: car.brand, model: car.model, index: galleryIndex + 1 })}
                className="max-h-[80vh] max-w-[60vw] object-contain transition-transform duration-300 ease-out"
                style={{ transform: `scale(${galleryZoom})`, cursor: galleryZoom > 1 ? "zoom-out" : "zoom-in" }}
                onClick={(e) => { e.stopPropagation(); setGalleryZoom((z) => z > 1 ? 1 : 2); }}
              />
            </div>

            {/* Right column: next arrow + thumbnail strip */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              {/* Next arrow */}
              <button
                aria-label={t("carDetail.aria.nextPhoto")}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex + 1) % carImages.length); setGalleryZoom(1); }}
              >
                <CaretRightIcon size={20} weight="bold" />
              </button>

              {/* Vertical thumbnail strip */}
              <div className="flex flex-col gap-2">
                {carImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); setGalleryZoom(1); }}
                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                      i === galleryIndex
                        ? "border-white scale-105 shadow-lg"
                        : "border-white/25 opacity-55 hover:opacity-100 hover:border-white/60"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Counter */}
              <p className="text-[11px] text-white/40 text-center">
                {galleryIndex + 1} / {carImages.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO FULLSCREEN ─────────────────────────────────── */}
      <div ref={heroRef} className="relative w-full overflow-hidden h-[55vh] min-h-[400px] md:h-[72vh] md:min-h-[520px]">
        {/* Background image — click to open gallery */}
        <button
          onClick={() => setGalleryOpen(true)}
          className="absolute inset-0 w-full h-full border-0 p-0 bg-transparent cursor-pointer focus:outline-none"
          aria-label={t("carDetail.aria.openGallery")}
        >
          <img
            src={carImages[galleryIndex]}
            alt={`${car.brand} ${car.model}`}
            className="absolute inset-0 w-full h-full object-contain md:object-cover object-center transition-all duration-700"
            style={{ transform: heroVisible ? "scale(1)" : "scale(1.05)" }}
          />
        </button>

        {/* Multi-layer gradient overlay (pointer-events-none so clicks pass through to button) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/95 via-[#0a1628]/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/60 via-transparent to-transparent pointer-events-none" />

        {/* Back nav */}
        <div
          className="absolute top-6 left-6 transition-all duration-500"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(-12px)" }}
        >
          <LLink
            to="/flota"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all duration-200 no-underline"
          >
            <ArrowLeft size={15} weight="bold" />
            {t("carDetail.back")}
          </LLink>
        </div>

        {/* Status pill top-right */}
        <div
          className="absolute top-6 right-6 transition-all duration-500 delay-100"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(-12px)" }}
        >
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border ${
            availableStatus
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
              : "bg-red-500/20 border-red-400/40 text-red-300"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${availableStatus ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
            {availabilityLabel}
          </span>
        </div>

        {/* Thumbnail strip — desktop: bottom-right above text; mobile: top-right badge only */}
        {/* Mobile: small gallery pill top-right (under status badge) */}
        <button
          onClick={() => setGalleryOpen(true)}
          className="md:hidden absolute top-[52px] right-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 text-white text-[11px] font-medium hover:bg-black/70 transition cursor-pointer"
          style={{ opacity: heroVisible ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }}
        >
          📷 {t("carDetail.hero.gallery")}
        </button>

        {/* Desktop: thumbnail strip fixed bottom-right, stays above text because text is bottom-left */}
        <div
          className="hidden md:flex absolute bottom-6 right-6 gap-2 transition-all duration-700 delay-300"
          style={{ opacity: heroVisible ? 1 : 0 }}
        >
          {carImages.slice(0, 3).map((img, i) => (
            <button
              key={i}
              onClick={() => { setGalleryIndex(i); setGalleryOpen(true); }}
              className={`w-16 h-11 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${i === galleryIndex ? "border-white scale-105 shadow-lg" : "border-white/30 opacity-70 hover:opacity-100 hover:border-white/60"}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          <button
            onClick={() => setGalleryOpen(true)}
            className="w-16 h-11 rounded-lg bg-black/50 backdrop-blur-sm border-2 border-white/30 text-white text-[11px] font-semibold flex items-center justify-center hover:bg-black/70 hover:border-white/60 transition-all cursor-pointer"
          >
            {t("carDetail.hero.morePhotos")}
          </button>
        </div>

        {/* Hero Content — bottom left */}
        <div
          className="absolute bottom-0 left-0 right-0 md:right-0 px-6 md:px-10 pb-8 transition-all duration-700"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(24px)" }}
        >
          {/* Breadcrumb navigation */}
          <nav className="flex items-center gap-1.5 mb-3" aria-label="Breadcrumb">
            <LLink to="/" className="text-xs font-medium text-white/50 hover:text-white/80 transition-colors no-underline">
              {t("carDetail.breadcrumb.home")}
            </LLink>
            <CaretRight size={10} className="text-white/30" />
            <LLink to="/flota" className="text-xs font-medium text-white/50 hover:text-white/80 transition-colors no-underline">
              {t("carDetail.breadcrumb.fleet")}
            </LLink>
            <CaretRight size={10} className="text-white/30" />
            <LLink to={`/flota?kategoria=${car.category}`} className="text-xs font-medium text-white/50 hover:text-white/80 transition-colors no-underline uppercase tracking-widest">
              {categoryLabel(t, car.category)}
            </LLink>
            <CaretRight size={10} className="text-white/30" />
            <span className="text-xs font-medium text-white/80 uppercase tracking-widest">{car.brand} {car.model}</span>
          </nav>

          {/* Car name */}
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-2 drop-shadow-lg">
            {car.brand} <span className="font-normal text-white">{car.model}</span>
          </h1>

          {/* Quick pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { icon: Gear, text: transmissionLabel(t, car.transmission) },
              { icon: GasPump, text: fuelLabel(t, car.fuel) },
              { icon: Users, text: t("carDetail.hero.seats", { count: car.seats }) },
              { icon: Briefcase, text: t("carDetail.hero.luggage", { count: car.luggage }) },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/85 text-xs font-medium">
                <Icon size={12} weight="fill" className="text-white/60" />
                {text}
              </span>
            ))}
          </div>

          {/* Price row + season badge + share */}
            <div className="flex items-end gap-4 flex-wrap">
            <div>
              <span className="text-xs text-white/50 uppercase tracking-wider block mb-0.5">{t("carDetail.from")}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">€{shownPrice}</span>
                <span className="text-white/50 text-sm">{t("carDetail.perDay")}</span>
                <span className="text-white/40 text-base line-through decoration-red-400/70">€{listPrice}</span>
                {discount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-bold">-{discount}%</span>
                )}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <span className="text-xs text-white/50 uppercase tracking-wider block mb-0.5">{t("carDetail.weekly")}</span>
              <span className="text-xl font-semibold text-white/80">€{Math.round(shownPrice * 7)}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <span className="text-xs text-white/50 uppercase tracking-wider block mb-0.5">{t("carDetail.monthly")}</span>
              <span className="text-xl font-semibold text-white/80">€{Math.round(shownPrice * 28)}</span>
            </div>
            {/* Share button */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-medium hover:bg-white/20 transition-all cursor-pointer"
              aria-label={t("carDetail.share.label")}
            >
              <ShareNetwork size={14} weight="bold" />
              <span className="hidden sm:inline">{t("carDetail.share.label")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ────────────────────────────────────────── */}
      <div className="bg-white border-b border-border/60">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between gap-4 py-3 overflow-x-auto no-scrollbar">
            {[
              { icon: SealCheck, label: t("carDetail.trust.verified"), color: "text-emerald-500" },
              { icon: Lightning, label: t("carDetail.trust.instant"), color: "text-amber-500" },
              { icon: Headset, label: t("carDetail.trust.support"), color: "text-blue-500" },
              { icon: ShieldCheck, label: t("carDetail.trust.insurance"), color: "text-primary" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 shrink-0">
                <Icon size={16} weight="fill" className={color} />
                <span className="text-xs font-medium text-neutral-600 whitespace-nowrap">{label}</span>
              </div>
            ))}
            <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto pl-4 border-l border-border">
              <Star size={14} weight="fill" className="text-amber-400" />
              <span className="text-xs font-semibold text-neutral-800">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-neutral-500">({t("carDetail.reviewsCount", { count: reviews.length })})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">

          {/* LEFT — details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab Navigation */}
            <div role="tablist" className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit">
              {(["specs", "features", "policy"] as Tab[]).map((tabKey) => {
                const count = tabKey === "specs" ? specs.length : undefined;
                return (
                  <button
                    key={tabKey}
                    role="tab"
                    aria-selected={tab === tabKey}
                    onClick={() => setTab(tabKey)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                      tab === tabKey
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    {t(`carDetail.tabs.${tabKey}`)}
                    {count != null && (
                      <span className={`text-[10px] font-bold w-4.5 h-4.5 rounded-full inline-flex items-center justify-center ${
                        tab === tabKey ? "bg-primary text-white" : "bg-neutral-300 text-neutral-600"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB: Specs — compact rows */}
            {tab === "specs" && (
              <div role="tabpanel" key="specs" className="space-y-3">
                {/* Unavailability banner with similar car suggestion */}
                {(carIsUnavailable || dateConflict) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <Info size={18} weight="fill" className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800 mb-0.5">
                          {carIsUnavailable
                            ? t("carDetail.availability.booked")
                            : t("carDetail.availability.dateTaken")}
                        </p>
                        <p className="text-xs text-amber-700 mb-3">
                          {t("carDetail.similarCar.suggestion", "Ky model nuk është i disponueshëm. Mund të gjeni diçka të ngjashme tek makina e mëposhtme:")}
                        </p>
                        {relatedCars.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {relatedCars.slice(0, 3).map((rc) => (
                              <LLink
                                key={rc.id}
                                to={`/makina/${rc.slug}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors no-underline"
                              >
                                <CarSimple size={12} />
                                {rc.brand} {rc.model} — €{rc.pricePerDay}/ditë
                                <ArrowRight size={11} weight="bold" />
                              </LLink>
                            ))}
                          </div>
                        ) : (
                          <LLink to="/flota" className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:underline no-underline">
                            {t("carDetail.backToFleet")} <ArrowRight size={12} weight="bold" />
                          </LLink>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-border/80 overflow-hidden divide-y divide-border/60">
                  {specs.map(({ icon: Icon, label, value }, i) => (
                    <div
                      key={label}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-azure/40 transition-colors duration-200"
                      style={{
                        animation: `slideIn 0.35s ease-out ${i * 50}ms both`,
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-azure flex items-center justify-center shrink-0">
                        <Icon size={18} weight="fill" className="text-primary" />
                      </div>
                      <span className="text-sm text-neutral-500 flex-1">{label}</span>
                      <span className="text-sm font-semibold text-neutral-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Features */}
            {tab === "features" && (
              <div
                role="tabpanel"
                key="features"
                className="bg-white rounded-xl border border-border/80 p-6"
                style={{ animation: "fadeIn 0.3s ease-out" }}
              >
                <p className="text-sm text-neutral-500 mb-5">
                  {t("carDetail.features.title", { brand: car.brand, model: car.model })}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...(t("carDetail.featuresList", { returnObjects: true }) as string[]), t("carDetail.luggageSize", { count: car.luggage })].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <CheckCircle size={16} weight="fill" className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-neutral-700">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-border/60">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{t("carDetail.features.extras")}</p>
                  <div className="flex flex-wrap gap-3">
                    {EXTRAS_ICONS.map(({ icon: Icon, key }) => (
                      <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-neutral-300 text-xs text-neutral-500">
                        <Icon size={13} weight="duotone" />
                        {t(`carDetail.extrasLabels.${key}`)}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1">
                    <Info size={13} />
                    {t("carDetail.features.extrasNote")}
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Policy */}
            {tab === "policy" && (
              <div
                role="tabpanel"
                key="policy"
                className="bg-white rounded-xl border border-border/80 p-6 space-y-5"
                style={{ animation: "fadeIn 0.3s ease-out" }}
              >
                {(["age", "license", "fuel", "mileage", "cancellation"] as const).map((key) => ({
                  title: t(`carDetail.policy.${key}.title`),
                  text: t(`carDetail.policy.${key}.text`),
                })).map(({ title, text }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-1 rounded-full bg-primary/30 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-800 mb-1">{title}</p>
                      <p className="text-sm text-neutral-500 leading-relaxed">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description Card */}
            <div className="bg-white rounded-xl border border-border/80 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-azure flex items-center justify-center">
                  <Info size={16} weight="fill" className="text-primary" />
                </div>
                <h2 className="text-base font-semibold text-neutral-800">
                  {t("carDetail.about.title")}
                </h2>
              </div>
              {car.description ? (
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{car.description}</p>
              ) : (
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {t("carDetail.about.text", { brand: car.brand, model: car.model, year: car.year, category: car.category, transmission: car.transmission, fuel: car.fuel, seats: car.seats, luggage: car.luggage })}
                </p>
              )}
            </div>

            {/* ── GOOGLE REVIEWS ─────────────────────────────────── */}
            <div ref={reviewsRef} className="bg-white rounded-2xl border border-border/80 overflow-hidden">

              {/* Widget header — mimics Google reviews embed */}
              <div
                className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60"
                style={{
                  opacity: reviewsInView ? 1 : 0,
                  transform: reviewsInView ? "translateY(0)" : "translateY(12px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center shrink-0">
                    <GoogleLogo size={22} weight="bold" className="text-[#4285F4]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 leading-tight">Rent Ride</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-bold text-neutral-800">{displayRating.toFixed(1)}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} weight={s <= Math.round(displayRating) ? "fill" : "regular"} className="text-amber-400" />
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {displayTotalRatings > 0 ? `(${displayTotalRatings}+)` : ""}
                        {isFromGoogle && <span className="ml-1 text-[#4285F4]">Google</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review cards */}
              <div className="divide-y divide-border/50">
                {reviews.slice(0, 5).map((review, i) => (
                  <div
                    key={review.id}
                    className="flex gap-3 px-5 py-4 hover:bg-neutral-50/80 transition-colors duration-200"
                    style={{
                      opacity: reviewsInView ? 1 : 0,
                      transform: reviewsInView ? "translateY(0)" : "translateY(14px)",
                      transition: `opacity 0.45s ease ${i * 80 + 80}ms, transform 0.45s ease ${i * 80 + 80}ms`,
                    }}
                  >
                    {review.photoUrl ? (
                      <img
                        src={review.photoUrl}
                        alt={review.authorName}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-border/60"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/10">
                        {review.avatar}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs font-semibold text-neutral-800 leading-tight">{review.authorName}</p>
                          <p className="text-[10px] text-neutral-400">{review.date}</p>
                        </div>
                        <GoogleLogo size={13} weight="bold" className="text-[#4285F4]/50 shrink-0 mt-0.5" />
                      </div>
                      <div className="flex gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} weight={s <= review.rating ? "fill" : "regular"} className="text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">{review.text}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Support CTA */}
            <div className="bg-neutral-900 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white mb-1">{t("carDetail.support.question")}</p>
                <p className="text-xs text-white/50">{t("carDetail.support.available")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="tel:+355698145803"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-xs font-medium hover:bg-white/20 transition-all duration-200 no-underline"
                >
                  <Phone size={14} weight="fill" />
                  {t("carDetail.support.phone")}
                </a>
                <a
                  href="https://wa.me/355698145803"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-all duration-200 no-underline"
                >
                  <WhatsappLogo size={14} weight="fill" />
                  {t("carDetail.support.whatsapp")}
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT — Booking Card */}
          <div className="lg:col-span-1">
            <div
              ref={bookingCardRef}
              className="sticky top-24 transition-all duration-700"
              style={{ opacity: cardVisible ? 1 : 0, transform: cardVisible ? "translateY(0)" : "translateY(20px)" }}
            >
              {/* Main booking card */}
              <div className="bg-white rounded-2xl border border-border shadow-xl overflow-hidden mb-4">

                {/* Card header */}
                <div className="bg-gradient-primary p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-xs mb-1 uppercase tracking-wider">{t("carDetail.booking.bookNow")}</p>
                      <h2 className="text-white text-xl font-bold">
                        {car.brand} {car.model}
                      </h2>
                      <p className="text-white/60 text-xs mt-0.5">{categoryLabel(t, car.category)} · {car.year}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 text-xs line-through decoration-red-400/70 block">€{listPrice}/{t("carDetail.bookingCard.perDayShort")}</span>
                      <span className="text-3xl font-bold text-white">€{shownPrice}</span>
                      <span className="text-white/60 text-xs">{t("carDetail.bookingCard.perDayShort")}</span>
                      {discount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-bold">-{discount}%</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {/* Date pickers */}
                  <div className="space-y-3 mb-3">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                        {t("carDetail.booking.departure")}
                      </label>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="date"
                          value={startDate}
                          min={today}
                          onChange={(e) => { const newStart = e.target.value; setStartDate(newStart); if (endDate && endDate < newStart) setEndDate(""); }}
                          className="w-full px-4 py-3 rounded-xl border border-border text-sm text-neutral-800 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all duration-200"
                        />
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="px-3 py-3 rounded-xl border border-border text-sm text-neutral-800 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                        {t("carDetail.booking.return")}
                      </label>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          type="date"
                          value={endDate}
                          min={startDate || today}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-800 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all duration-200 ${minDaysViolation ? "border-amber-400" : "border-border"}`}
                        />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="px-3 py-3 rounded-xl border border-border text-sm text-neutral-800 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all duration-200"
                        />
                      </div>
                      {minDaysViolation && (
                        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                          <span>⚠️</span> {t("booking.validation.minDays", { count: minDaysRequired })}
                        </p>
                      )}
                    </div>

                    {/* Pickup Location Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                        <MapPin size={11} weight="fill" className="inline mr-1" />
                        {t("carDetail.booking.pickupLocation")}
                      </label>
                      <div className="relative">
                        <select
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border text-sm text-neutral-800 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all duration-200 appearance-none cursor-pointer pr-8"
                        >
                          {pickupOptions.map((loc) => (
                            <option key={loc.value} value={loc.value}>
                              {formatLocationOption(loc)}
                            </option>
                          ))}
                        </select>
                        <CaretRightIcon size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 rotate-90 pointer-events-none" />
                      </div>
                      {pickupFee > 0 && (
                        <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                          <MapPin size={11} weight="fill" />
                          Tarifë dërgese: +€{pickupFee}
                        </p>
                      )}
                    </div>

                    {/* Dropoff Location Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                        <MapPin size={11} weight="fill" className="inline mr-1" />
                        {t("carDetail.booking.dropoffLocation", "Ktheje në")}
                      </label>
                      <div className="relative">
                        <select
                          value={dropoffLocation}
                          onChange={(e) => setDropoffLocation(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border text-sm text-neutral-800 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all duration-200 appearance-none cursor-pointer pr-8"
                        >
                          {dropoffOptions.map((loc) => (
                            <option key={loc.value} value={loc.value}>
                              {formatLocationOption(loc)}
                            </option>
                          ))}
                        </select>
                        <CaretRightIcon size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 rotate-90 pointer-events-none" />
                      </div>
                      {dropoffFee > 0 && (
                        <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                          <MapPin size={11} weight="fill" />
                          Tarifë kthimi: +€{dropoffFee}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live availability indicator when dates selected */}
                  {startDate && endDate && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-3 ${
                      dateConflict
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full animate-pulse ${dateConflict ? "bg-red-500" : "bg-emerald-500"}`} />
                      {dateConflict
                        ? t("carDetail.booking.dateTaken")
                        : t("carDetail.booking.freeDays", { days })}
                    </div>
                  )}

                  {/* Price breakdown — animated */}
                  <div
                    className="overflow-hidden transition-all duration-400"
                    style={{ maxHeight: days > 0 ? "400px" : "0px", opacity: days > 0 ? 1 : 0 }}
                  >
                    <div className="bg-azure/40 rounded-xl p-4 mb-4 border border-secondary">
                      <div className="space-y-2 text-sm">
                        {/* Price breakdown: monthly rate or seasonal */}
                        {!monthlyRateActive && seasonalBreakdown && seasonalBreakdown.breakdown.length > 1 ? (
                          seasonalBreakdown.breakdown.map((seg, i) => (
                            <div key={i} className="flex justify-between text-neutral-600">
                              <span className="flex items-center gap-1">
                                <span>{seg.season.emoji}</span>
                                <span>{seg.days} {t("carDetail.pricing.daysAt")} €{seg.pricePerDay}</span>
                              </span>
                              <span className="font-medium">€{seg.subtotal}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between text-neutral-600">
                            <span>{t("carDetail.booking.basePrice", { price: days > 0 ? Math.round(baseTotal / days) : effectivePricePerDay, days })}</span>
                            <span className="font-medium">€{baseTotal}</span>
                          </div>
                        )}

                        {/* Applied discounts from pricing rules */}
                        {smartPricing && smartPricing.appliedDiscounts.length > 0 && (
                          <>
                            {smartPricing.appliedDiscounts.map((d, i) => (
                              <div key={i} className="flex justify-between text-emerald-600">
                                <span className="flex items-center gap-1">
                                  <Tag size={12} weight="fill" />
                                  {d.label}
                                </span>
                                <span className="font-medium">-€{d.discountAmount.toFixed(2)}</span>
                              </div>
                            ))}
                          </>
                        )}

                        {locationFee > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} weight="fill" />
                              Tarifë lokacioni
                            </span>
                            <span className="font-medium">+€{locationFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-neutral-600">
                          <span>{t("carDetail.booking.insurance")}</span>
                          <span className="text-emerald-600 font-medium">{t("carDetail.booking.insuranceFree")}</span>
                        </div>
                        <div className="flex justify-between text-neutral-600">
                          <span>{t("carDetail.booking.serviceFee")}</span>
                          <span className="text-emerald-600 font-medium">{t("carDetail.booking.serviceFree")}</span>
                        </div>
                        <div className="pt-2 border-t border-secondary flex justify-between font-bold text-neutral-900 text-base">
                          <span>{t("carDetail.booking.totalLabel")}</span>
                          <span className="text-primary">€{total.toFixed(2)}</span>
                        </div>
                        {smartPricing && smartPricing.savings > 0 && (
                          <div className="flex justify-between text-emerald-600 text-xs font-semibold pt-1">
                            <span>{t("carDetail.pricing.youSave")}</span>
                            <span>-€{smartPricing.savings.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Urgency / social proof */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60 text-xs text-amber-700 mb-3">
                    <Eye size={14} weight="fill" className="text-amber-500 shrink-0" />
                    <span className="font-medium">{t("carDetail.booking.urgency")}</span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() =>
                      navigate(
                        localePath(`/rezervo?car=${car.id}${startDate ? `&start=${startDate}` : ""}${endDate ? `&end=${endDate}` : ""}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&pickup=${encodeURIComponent(pickupLocation)}&dropoff=${encodeURIComponent(dropoffLocation)}`),
                      )
                    }
                    disabled={!available || (!!startDate && !!endDate && dateConflict) || minDaysViolation}
                    className="w-full py-4 rounded-xl text-sm font-bold bg-gradient-primary text-white hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-btn-primary text-base"
                  >
                    {carIsUnavailable ? (
                      <span>{t("carDetail.booking.unavailable")}</span>
                    ) : dateConflict ? (
                      <span>{t("carDetail.booking.chooseDates")}</span>
                    ) : (
                      <>
                        <Lightning size={16} weight="fill" />
                        <span>{t("carDetail.booking.reserve")}</span>
                        <ArrowRight size={16} weight="bold" />
                      </>
                    )}
                  </button>

                  {available && (
                    <p className="text-center text-xs text-neutral-400 mt-2 flex items-center justify-center gap-1">
                      <Lightning size={12} weight="fill" className="text-amber-400" />
                      {t("carDetail.booking.instant")}
                    </p>
                  )}
                </div>
              </div>

              {/* Support mini card */}
              <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-azure flex items-center justify-center shrink-0">
                  <Headset size={18} weight="fill" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-800">{t("carDetail.support2.title")}</p>
                  <p className="text-xs text-neutral-400 truncate">+355 69 81 45 803</p>
                </div>
                <a
                  href="tel:+355698145803"
                  className="text-xs text-primary font-semibold hover:underline no-underline flex items-center gap-0.5 shrink-0"
                >
                  <Phone size={13} weight="fill" />
                  {t("carDetail.support2.call")}
                </a>
              </div>

              {/* Price breakdown cards */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { period: t("carDetail.pricing.daily"), amount: effectivePricePerDay, list: listPrice, unit: t("carDetail.perDay") },
                  { period: t("carDetail.pricing.weekly"), amount: Math.round(effectivePricePerDay * 7), list: listPrice * 7, unit: `/${t("carDetail.weekly").split(" ")[0].toLowerCase()}` },
                  { period: t("carDetail.pricing.monthly"), amount: Math.round(effectivePricePerDay * 28), list: listPrice * 28, unit: `/${t("carDetail.monthly").split(" ")[0].toLowerCase()}` },
                ].map(({ period, amount, list, unit }) => (
                  <div key={period} className="bg-white rounded-xl border border-border p-3 text-center">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">{period}</p>
                    <p className="text-[10px] text-neutral-400 line-through decoration-red-400/60">€{list}</p>
                    <p className="text-base font-bold text-emerald-600">€{amount}</p>
                    <p className="text-[10px] text-neutral-400">{unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RELATED CARS ─────────────────────────────────────── */}
        {relatedCars.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">{t("carDetail.related.title")}</h2>
                <p className="text-sm text-neutral-500 mt-1">{t("carDetail.related.subtitle", { category: car.category })}</p>
              </div>
              <LLink
                to="/flota"
                className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:gap-2.5 transition-all duration-200"
              >
                {t("carDetail.related.viewAll")}
                <ArrowRight size={15} weight="bold" />
              </LLink>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedCars.map((c, i) => (
                <div
                  key={c.id}
                  style={{ animation: `fadeIn 0.4s ease-out ${i * 100}ms both` }}
                >
                  <CarCard car={c} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAQ */}
      <FAQAccordion
        items={(t("carDetail.faqItems", { returnObjects: true }) as { question: string; answer: string }[])}
        title={t("carDetail.faqTitle")}
      />
      <Footer />
    </div>
  );
}
