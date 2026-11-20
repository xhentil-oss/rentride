import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Crown, Diamond, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useTranslation } from "react-i18next";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

type FAQ = { question: string; answer: string };

const asList = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const WHY = [
  { icon: Crown, key: "elite" },
  { icon: Diamond, key: "priceMatch" },
  { icon: Star, key: "vip" },
] as const;

export default function MakinaLuksoze() {
  const { t } = useTranslation("landing");
  const { data: allCars } = useQuery("Car", { where: { category: "Luksoze" } });
  const cars = allCars ?? [];
  const faq = asList<FAQ>(t("luxury.faq", { returnObjects: true }));
  const features = asList<string>(t("luxury.included.items", { returnObjects: true }));

  useSEO({
    title: t("luxury.seo.title"),
    description: t("luxury.seo.description"),
    keywords: t("luxury.seo.keywords"),
    canonical: "/makina-luksoze-me-qira",
    structuredData: [
      buildFAQSchema(faq),
      buildBreadcrumbSchema([
        { name: t("luxury.breadcrumb.home"), url: "/" },
        { name: t("luxury.breadcrumb.fleet"), url: "/flota" },
        { name: t("luxury.breadcrumb.current"), url: "/makina-luksoze-me-qira" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-neutral-950 via-neutral-800 to-neutral-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542362567-b07e54358753?w=1400&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-1.5 mb-5 text-sm font-medium text-white">
            <Crown size={16} weight="fill" /> {t("luxury.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t("luxury.hero.title")}<br />
            <span className="text-primary">{t("luxury.hero.titleBrands")}</span>
          </h1>
          <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t("luxury.hero.intro")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?kategoria=Luksoze" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition-colors no-underline text-base">
              {t("luxury.hero.ctaBrowse")} <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              {t("luxury.hero.ctaBook")}
            </LLink>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-3">{t("luxury.experience.title")}</h2>
          <p className="text-center text-neutral-500 mb-10">{t("luxury.experience.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY.map((f) => (
              <div key={f.key} className="text-center p-6 rounded-xl border-2 border-border bg-azure/30">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon size={28} weight="fill" className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">{t(`luxury.experience.items.${f.key}.title`)}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{t(`luxury.experience.items.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inclusion list */}
      <section className="py-10 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-neutral-900 text-center mb-6">{t("luxury.included.title")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
                <CheckCircle size={16} weight="fill" className="text-primary shrink-0" />
                <span className="text-sm text-neutral-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cars */}
      {cars.length > 0 && (
        <section className="py-14 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{t("luxury.cars.title")}</h2>
            <p className="text-neutral-500 mb-8">{t("luxury.cars.subtitle")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">{t("luxury.faqTitle")}</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="bg-white rounded-xl border border-border group">
                <summary className="px-5 py-4 text-sm font-semibold text-neutral-900 cursor-pointer list-none flex items-center justify-between">
                  {item.question}
                  <ArrowRight size={16} className="text-neutral-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="px-5 pb-4 text-sm text-neutral-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-neutral-950 text-white text-center">
        <div className="max-w-xl mx-auto">
          <Crown size={36} weight="fill" className="text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">{t("luxury.cta.title")}</h2>
          <p className="text-neutral-400 mb-6">{t("luxury.cta.text")}</p>
          <LLink to="/flota?kategoria=Luksoze" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover no-underline">
            {t("luxury.cta.button")} <ArrowRight size={18} />
          </LLink>
        </div>
      </section>

      <Footer />
    </div>
  );
}
