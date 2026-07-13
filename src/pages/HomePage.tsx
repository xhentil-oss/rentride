import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LLink from "../components/LLink";
import { useLocale } from "../hooks/useLocale";
import { useTranslation } from "react-i18next";
import { useSEO, buildLocalBusinessSchema, buildFAQSchema } from "../hooks/useSEO";
import {
  MapPin,
  CalendarBlank,
  Car,
  ShieldCheck,
  Clock,
  CurrencyDollar,
  Star,
  Phone,
  WhatsappLogo,
  ArrowRight,
  CheckCircle,
  Users,
  Airplane,
  Headset,
  Tag,
  CreditCard,
  Key,
  SealCheck,
  Lightning,
  X,
} from "@phosphor-icons/react";
import { useQuery } from "../hooks/useApi";
import { trackEvent } from "../lib/track";
import CarCard from "../components/CarCard";
import FAQAccordion from "../components/FAQAccordion";
import Footer from "../components/Footer";
import { getMinDaysRequirement } from "../lib/pricingRules";
import type { PricingRule } from "../lib/pricingRules";
import { useLocations } from "../hooks/useLocations";
import { formatLocationName } from "../lib/locations";
import DOMPurify from "dompurify";

const whyUsIcons = [CurrencyDollar, Clock, ShieldCheck, MapPin];
const howItWorksIcons = [Car, CalendarBlank, Key];
const trustStatsValues = [
  { value: "500+", icon: Users, key: "clients" },
  { value: "4.9★", icon: Star, key: "rating" },
  { value: "24/7", icon: Headset, key: "support" },
  { value: "2", icon: Airplane, key: "locations" },
];

export default function HomePage() {
  const { t, i18n } = useTranslation();

  const faqItems = (t("home.faq.items", { returnObjects: true }) as { question: string; answer: string }[]);
  const categories = [
    { key: "ekonomike", icon: Car, dbName: "Ekonomike" },
    { key: "suv", icon: Car, dbName: "SUV" },
    { key: "luksoze", icon: Car, dbName: "Luksoze" },
    { key: "familjare", icon: Car, dbName: "Familjare" },
    { key: "automatike", icon: Car, dbName: "Automatike" },
  ];
  const whyUsItems = (t("home.whyUs.items", { returnObjects: true }) as { title: string; desc: string }[]);
  const howItWorksSteps = (t("home.howItWorks.steps", { returnObjects: true }) as { title: string; desc: string }[]);
  const guarantees = (t("home.guarantees", { returnObjects: true }) as { title: string; desc: string }[]);
  const airportFeatures = t("home.airportSection.features", { returnObjects: true }) as string[];
  const destinations = t("home.destinations.places", { returnObjects: true }) as { name: string; desc: string }[];
  const rentalGuideItems = t("home.rentalGuide.items", { returnObjects: true }) as { title: string; desc: string }[];
  const guaranteeIcons = [SealCheck, CreditCard, ShieldCheck];
  const guaranteeColors = [
    { color: "text-primary", bg: "bg-primary/10" },
    { color: "text-success", bg: "bg-success/10" },
    { color: "text-accent", bg: "bg-accent/10" },
  ];

  const isEN = i18n.language === 'en';
  useSEO({
    title: t("home.seo.title"),
    description: t("home.seo.description"),
    keywords: t("home.seo.keywords"),
    canonical: "/",
    structuredData: [
      buildLocalBusinessSchema(),
      buildFAQSchema(faqItems),
    ],
  });

  const navigate = useNavigate();
  const { localePath } = useLocale();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const [promoDismissed, setPromoDismissed] = useState(false);
  // Promo banner (discount code) can be toggled off from admin Settings.
  const [discountCodeEnabled, setDiscountCodeEnabled] = useState(true);

  const { data: allCars } = useQuery("Car");
  const { data: pricingRules } = useQuery("PricingRule");
  const { options: locationOptions } = useLocations(
    (i18n?.language === "en" ? "en" : "sq") as "sq" | "en",
  );
  const [featuredCarIds, setFeaturedCarIds] = useState<string[]>([]);

  const selectedDays = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate]);

  const globalMinDays = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    return getMinDaysRequirement(
      (pricingRules ?? []) as PricingRule[],
      { carId: "", carCategory: "", startDate: new Date(startDate), endDate: new Date(endDate) }
    );
  }, [pricingRules, startDate, endDate]);

  const minDaysViolation = selectedDays > 0 && globalMinDays > 0 && selectedDays < globalMinDays;
  const [bannerAbout, setBannerAbout] = useState("https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80");
  const [heroSlides, setHeroSlides] = useState([
    { src: "https://images.unsplash.com/photo-1614414826781-b4911a00298f?w=1600&q=80", alt: "Makina me qira në rrugë bregdetare buzë detit — Rent Ride Shqipëri, qira makine Tiranë & Aeroport" },
    { src: "https://images.unsplash.com/photo-1678410843387-4f52cecd0dca?w=1600&q=80", alt: "Makinë me qira në rrugën bregdetare buzë detit — rent a car tirana airport Albania" },
    { src: "https://images.unsplash.com/photo-1646960706799-d178b8c5604f?w=1600&q=80", alt: "Makinë me qira në rrugë përgjatë detit — Albania car rental coastal road" },
  ]);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide((s) => (s + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.homepage_featured_cars || "")
          .split(",")
          .filter(Boolean);
        setFeaturedCarIds(ids);
        if (data.banner_hero) {
          setHeroSlides((prev) => {
            const updated = [...prev];
            updated[1] = { ...updated[1], src: data.banner_hero };
            return updated;
          });
        }
        if (data.banner_about) setBannerAbout(data.banner_about);
        setDiscountCodeEnabled(data.booking_discount_code_enabled !== "false");
      })
      .catch(() => {});
  }, []);

  const featuredCars = allCars
    ? (featuredCarIds.length > 0
        ? allCars.filter((c: any) => featuredCarIds.includes(String(c.id)))
        : allCars
      )
        .slice()
        .sort((a: any, b: any) => Number(a.pricePerDay) - Number(b.pricePerDay))
    : [];

  const { data: dbReviews } = useQuery("Review", {
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    limit: 3,
  });

  const testimonials = (t("home.testimonialsFallback", { returnObjects: true }) as { name: string; text: string; location: string }[]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (minDaysViolation) return;
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (dropoff) params.set("dropoff", dropoff);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    navigate(localePath(`/flota?${params.toString()}`));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Promo Banner ─────────────────────────────────────────── */}
      {discountCodeEnabled && !promoDismissed && (
        <div className="bg-gradient-to-r from-accent/90 to-primary text-white py-2.5 px-4 text-center relative">
          <p className="text-sm font-medium">
            <Tag size={14} weight="fill" className="inline mr-1.5 -mt-0.5" />
            <span
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(t("home.promoBanner"), {
                  ALLOWED_TAGS: ["strong", "b", "em", "i", "br"],
                  ALLOWED_ATTR: [],
                }),
              }}
            />{" "}
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-xs tracking-wide">TIRANA10</span>
          </p>
          <button
            onClick={() => setPromoDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
            aria-label="Mbyll"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section
        className="relative min-h-[600px] flex items-center overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0">
          {heroSlides.map((slide, i) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              width={1400}
              height={600}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === heroSlide ? "opacity-100" : "opacity-0"}`}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding={i === 0 ? "sync" : "async"}
            />
          ))}
          <div className="absolute inset-0 bg-neutral-900/70" />
          {/* Slide dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer border-0 ${i === heroSlide ? "bg-white w-5" : "bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-20 w-full">
          <div className="max-w-2xl mb-10">
            <h1
              id="hero-heading"
              className="text-4xl md:text-5xl font-medium text-white mb-4 leading-tight"
            >
              {t("home.hero.title")}
              <br />
              <span className="text-accent">{t("home.hero.titleHighlight")}</span>
            </h1>
            <p className="text-lg text-neutral-200 leading-relaxed">
              {t("home.hero.subtitle")}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 max-w-4xl">
            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              <div className="lg:col-span-1">
                <label htmlFor="pickup" className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t("home.hero.pickupFrom")}
                </label>
                <div className="relative">
                  <MapPin size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <select
                    id="pickup"
                    value={pickup}
                    onChange={(e) => { setPickup(e.target.value); if (e.target.value) trackEvent("select_pickup", { location: e.target.value }); }}
                    className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none"
                  >
                    <option value="">{t("home.hero.selectPlace")}</option>
                    {locationOptions.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {formatLocationName(loc)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-1">
                <label htmlFor="dropoff" className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t("home.hero.returnTo")}
                </label>
                <div className="relative">
                  <MapPin size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <select
                    id="dropoff"
                    value={dropoff}
                    onChange={(e) => { setDropoff(e.target.value); if (e.target.value) trackEvent("select_dropoff", { location: e.target.value }); }}
                    className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none"
                  >
                    <option value="">{t("home.hero.selectPlace")}</option>
                    {locationOptions.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {formatLocationName(loc)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-1">
                <label htmlFor="startDate" className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t("home.hero.departureDate")}
                </label>
                <div className="relative">
                  <CalendarBlank size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => { const newStart = e.target.value; setStartDate(newStart); if (endDate && endDate < newStart) setEndDate(""); }}
                    className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>

              <div className="lg:col-span-1">
                <label htmlFor="endDate" className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t("home.hero.returnDate")}
                </label>
                <div className="relative">
                  <CalendarBlank size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || todayStr}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 rounded-full border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>

              <div className="lg:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={minDaysViolation}
                  className="w-full py-3 px-4 rounded-md text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Car size={16} weight="regular" />
                  {t("home.hero.searchBtn")}
                </button>
              </div>

              {minDaysViolation && (
                <div className="lg:col-span-5 -mt-2">
                  <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <span className="font-medium">⏱️ Minimum {globalMinDays} ditë rezervimi.</span>
                    <span>Ke zgjedhur vetëm {selectedDays} {selectedDays === 1 ? "ditë" : "ditë"} — zgjat datën e kthimit.</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ── Trust Stats Bar (à la Hertz/Sixt) ───────────────────── */}
      <section className="bg-white border-b border-border py-5 px-6">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {trustStatsValues.map((stat) => (
              <div key={stat.key} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-azure flex items-center justify-center shrink-0">
                  <stat.icon size={20} weight="regular" className="text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-900 leading-none">{stat.value}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{t(`home.trustStats.${stat.key}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Airport Car Rental Section ───────────────────────────── */}
      <section className="py-14 px-6 bg-white border-b border-border" aria-labelledby="airport-heading">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Airplane size={16} weight="fill" className="text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {t("home.airportSection.badge")}
                </span>
              </div>
              <h2 id="airport-heading" className="text-2xl md:text-3xl font-medium text-neutral-900 mb-4">
                {t("home.airportSection.title")}
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-6 text-sm md:text-base">
                {t("home.airportSection.body")}
              </p>
              <ul className="space-y-2.5 mb-7">
                {airportFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <CheckCircle size={17} weight="fill" className="text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <LLink
                to={isEN ? "/en/airport-car-rental" : "/makine-me-qira-aeroport"}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity no-underline"
              >
                <Airplane size={16} weight="fill" />
                {t("home.airportSection.cta")}
              </LLink>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(t("home.airportBadges", { returnObjects: true }) as { label: string; sub: string }[])
                .map((b, i) => ({ icon: [Airplane, Clock, SealCheck, ShieldCheck][i], label: b.label, sub: b.sub }))
                .map(({ icon: Icon, label, sub }, i) => (
                <div key={i} className="bg-azure rounded-xl border border-border p-5 flex flex-col gap-2">
                  <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center">
                    <Icon size={18} weight="fill" className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-900 leading-tight">{label}</p>
                  <p className="text-xs text-neutral-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cars */}
      <section
        className="py-16 px-6 bg-background"
        aria-labelledby="featured-heading"
      >
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 id="featured-heading" className="text-3xl font-medium text-neutral-900">
                {t("home.featuredCars.title")}
              </h2>
              <p className="text-neutral-500 mt-1">{t("home.featuredCars.subtitle")}</p>
            </div>
            <LLink to="/flota" className="hidden md:flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors duration-200 no-underline">
              {t("home.featuredCars.viewAll")}
              <ArrowRight size={16} weight="regular" />
            </LLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {!allCars ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-white overflow-hidden animate-pulse">
                  <div className="h-44 bg-neutral-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-1/3 bg-neutral-200 rounded" />
                    <div className="h-5 w-2/3 bg-neutral-200 rounded" />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="h-3 bg-neutral-100 rounded" />
                      <div className="h-3 bg-neutral-100 rounded" />
                      <div className="h-3 bg-neutral-100 rounded" />
                      <div className="h-3 bg-neutral-100 rounded" />
                    </div>
                    <div className="h-9 w-full bg-neutral-100 rounded-md mt-2" />
                  </div>
                </div>
              ))
            ) : (
              featuredCars.map((car, i) => (
                <div key={car.id} className={`animate-fade-in stagger-${Math.min(i + 1, 4)}`}>
                  <CarCard car={car} />
                </div>
              ))
            )}
          </div>

          <div className="mt-10 text-center">
            <LLink
              to="/flota"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity no-underline"
            >
              {t("home.featuredCars.viewAll")}
              <ArrowRight size={16} weight="regular" />
            </LLink>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        className="py-16 px-6 bg-azure"
        aria-labelledby="categories-heading"
      >
        <div className="max-w-[1440px] mx-auto">
          <h2 id="categories-heading" className="text-3xl font-medium text-neutral-900 mb-2 text-center">
            {t("home.categories.title")}
          </h2>
          <p className="text-neutral-500 text-center mb-10">{t("home.categories.subtitle")}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <LLink
                key={cat.key}
                to={`/flota?kategoria=${cat.dbName}`}
                className="bg-white rounded-lg p-6 text-center border border-border hover:-translate-y-1 transition-all duration-300 no-underline group"
              >
                <div className="w-12 h-12 rounded-lg bg-azure flex items-center justify-center mx-auto mb-3 group-hover:bg-primary transition-colors duration-200">
                  <Car size={24} weight="regular" className="text-primary group-hover:text-white transition-colors duration-200" />
                </div>
                <h3 className="text-sm font-medium text-neutral-900 mb-1">
                  {t(`home.categories.${cat.key}.name`)}
                </h3>
                <p className="text-xs text-neutral-500">{t(`home.categories.${cat.key}.desc`)}</p>
              </LLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works (Enterprise 3-step) ─────────────────────── */}
      <section className="py-16 px-6 bg-white" aria-labelledby="how-heading">
        <div className="max-w-[1440px] mx-auto">
          <h2 id="how-heading" className="text-3xl font-medium text-neutral-900 mb-2 text-center">
            {t("home.howItWorks.title")}
          </h2>
          <p className="text-neutral-500 text-center mb-12">{t("home.howItWorks.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.7%+2rem)] right-[calc(16.7%+2rem)] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 z-0" />
            {howItWorksSteps.map((step, i) => {
              const StepIcon = howItWorksIcons[i];
              return (
                <div key={i} className="relative z-10 flex flex-col items-center text-center bg-background rounded-xl border border-border p-8 hover:border-primary/40 hover:shadow-md transition-all duration-300">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
                      <StepIcon size={28} weight="regular" className="text-white" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-primary text-primary text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <LLink to="/flota" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity no-underline">
              <Lightning size={16} weight="fill" />
              {t("home.howItWorks.cta")}
            </LLink>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section
        className="py-16 px-6 bg-white"
        id="rreth-nesh"
        aria-labelledby="why-heading"
      >
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 id="why-heading" className="text-3xl font-medium text-neutral-900 mb-4">
                {t("home.whyUs.title")}
              </h2>
              <p className="text-neutral-500 mb-8 leading-relaxed">{t("home.whyUs.subtitle")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {whyUsItems.map((item, i) => {
                  const Icon = whyUsIcons[i];
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-azure flex items-center justify-center shrink-0">
                        <Icon size={20} weight="regular" className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-neutral-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-neutral-500">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{ height: "400px" }}
            >
              <img
                src={bannerAbout}
                alt="Happy customer standing by rented car"
                loading="lazy"
                width={800}
                height={400}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Price Guarantee + No Hidden Fees Banner (à la Rentalcars) */}
      <section className="py-12 px-6 bg-gradient-to-br from-azure to-info/5 border-y border-azure-dark/40">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guarantees.map((item, i) => {
              const Icon = guaranteeIcons[i];
              const colors = guaranteeColors[i];
              return (
                <div key={i} className="flex items-start gap-4 bg-white rounded-xl border border-border p-6 shadow-sm">
                  <div className={`w-11 h-11 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={22} weight="regular" className={colors.color} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">{item.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        className="py-16 px-6 bg-background"
        aria-labelledby="testimonials-heading"
      >
        <div className="max-w-[1440px] mx-auto">
          <h2 id="testimonials-heading" className="text-3xl font-medium text-neutral-900 mb-2 text-center">
            {t("home.reviews.title")}
          </h2>
          <p className="text-neutral-500 text-center mb-10">{t("home.reviews.subtitle")}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(dbReviews && dbReviews.length > 0
              ? dbReviews
              : testimonials.map((item) => ({
                  id: item.name,
                  rating: 5,
                  text: item.text,
                  authorName: item.name,
                  aspects: item.location,
                  approved: true,
                }))
            ).map((review: any, i: number) => (
              <div
                key={review.id ?? i}
                className="bg-white rounded-lg border border-border p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_: any, j: number) => (
                    <Star key={j} size={16} weight="fill" className="text-accent" />
                  ))}
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  &#34;{review.text}&#34;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-azure flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {(review.authorName ?? review.name ?? "?").charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {review.authorName ?? review.name}
                    </p>
                    <p className="text-xs text-neutral-500">{review.aspects ?? review.location ?? ""}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEO Text ─────────────────────────────────────────── */}
      <section className="py-8 px-6 bg-azure border-b border-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="text-sm text-neutral-500 leading-relaxed text-center max-w-4xl mx-auto">
            {t("home.seoText")}
          </p>
        </div>
      </section>

      {/* ── Register CTA for Customers ──────────────────────── */}
      <section className="py-14 px-6 bg-white border-b border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users size={28} weight="duotone" className="text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
            {t("home.registerCta.title", "Krijo llogarinë falas")}
          </h2>
          <p className="text-neutral-500 text-sm mb-6 max-w-lg mx-auto">
            {t("home.registerCta.subtitle", "Regjistrohu për të menaxhuar rezervimet, kontratat dhe historinë e qirave të tua — gjithçka në një vend.")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <LLink
              to="/llogaria"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-gradient-primary text-white hover:opacity-90 transition-opacity no-underline shadow-sm"
            >
              <Users size={16} weight="bold" />
              {t("home.registerCta.btn", "Regjistrohu tani")}
            </LLink>
            <LLink
              to="/flota"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-border text-neutral-700 hover:bg-azure transition-colors no-underline"
            >
              <Car size={16} weight="regular" />
              {t("home.registerCta.fleet", "Shiko flotën")}
            </LLink>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-success" /> {t("home.registerCta.f1", "Pa pagesë")}</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-success" /> {t("home.registerCta.f2", "Menaxho rezervimet")}</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-success" /> {t("home.registerCta.f3", "Histori e plotë")}</span>
          </div>
        </div>
      </section>

      {/* ── Explore Albania Destinations ──────────────────────── */}
      <section className="py-16 px-6 bg-white border-b border-border" aria-labelledby="destinations-heading">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-10">
            <h2 id="destinations-heading" className="text-3xl font-medium text-neutral-900 mb-2">
              {t("home.destinations.title")}
            </h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">{t("home.destinations.subtitle")}</p>
            <p className="text-sm text-neutral-600 mt-4 max-w-3xl mx-auto leading-relaxed">{t("home.destinations.intro")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {destinations.map((place, i) => (
              <div key={i} className={`bg-azure rounded-xl border border-border p-6 ${i === 4 ? "lg:col-span-1 md:col-span-2 lg:col-span-1" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={15} weight="fill" className="text-primary shrink-0" />
                  <span className="text-sm font-semibold text-primary">{place.name}</span>
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">{place.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rental Guide ──────────────────────────────────────── */}
      <section className="py-16 px-6 bg-background" aria-labelledby="guide-heading">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-10">
            <h2 id="guide-heading" className="text-3xl font-medium text-neutral-900 mb-2">
              {t("home.rentalGuide.title")}
            </h2>
            <p className="text-neutral-500">{t("home.rentalGuide.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rentalGuideItems.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQAccordion items={faqItems} />

      {/* Contact CTA */}
      <section
        className="py-16 px-6 bg-gradient-primary"
        id="kontakti"
        aria-labelledby="contact-heading"
      >
        <div className="max-w-[1440px] mx-auto text-center">
          <h2 id="contact-heading" className="text-3xl font-medium text-white mb-3">
            {t("home.cta.title")}
          </h2>
          <p className="text-white/85 mb-8">{t("home.cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`https://wa.me/355698145803?text=${encodeURIComponent(t("home.cta.whatsappMsg"))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("whatsapp_click")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-success text-success-foreground hover:opacity-90 transition-opacity duration-200 no-underline"
            >
              <Phone size={18} weight="regular" />
              {t("home.cta.whatsapp")}
            </a>
            <a
              href="tel:+355698145803"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white text-primary hover:bg-azure transition-colors duration-200 no-underline"
            >
              <Phone size={18} weight="regular" />
              {t("header.phone")}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
