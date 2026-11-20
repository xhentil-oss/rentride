import React from "react";
import LLink from "../../components/LLink";
import { MapPin, CheckCircle, ArrowRight, Clock, ShieldCheck, CurrencyDollar, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useTranslation } from "react-i18next";
import { useSEO, buildFAQSchema, buildLocalBusinessSchema } from "../../hooks/useSEO";

type FAQ = { question: string; answer: string };

const asList = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const FEATURES = [
  { icon: CurrencyDollar, key: "price" },
  { icon: MapPin, key: "airport" },
  { icon: Clock, key: "online" },
  { icon: ShieldCheck, key: "insurance" },
  { icon: CheckCircle, key: "fleet" },
  { icon: Star, key: "customers" },
] as const;

export default function MakinaQeraTirana() {
  const { t } = useTranslation("landing");
  const { data: cars } = useQuery("Car", { limit: 6 });
  const faq = asList<FAQ>(t("tirana.faq", { returnObjects: true }));

  useSEO({
    title: t("tirana.seo.title"),
    description: t("tirana.seo.description"),
    keywords: t("tirana.seo.keywords"),
    canonical: "/makina-me-qira-tirane",
    structuredData: [
      buildLocalBusinessSchema(),
      buildFAQSchema(faq),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-primary to-accent text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80')] bg-cover bg-center" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4 text-sm">
            <MapPin size={14} /> {t("tirana.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t("tirana.hero.title")}
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t("tirana.hero.intro")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              {t("tirana.hero.ctaBook")} <ArrowRight size={18} />
            </LLink>
            <LLink to="/flota" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              {t("tirana.hero.ctaFleet")}
            </LLink>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-10">{t("tirana.features.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.key} className="flex items-start gap-4 p-5 rounded-xl bg-azure/40 border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1">{t(`tirana.features.items.${f.key}.title`)}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{t(`tirana.features.items.${f.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cars */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{t("tirana.cars.title")}</h2>
          <p className="text-neutral-500 mb-8">{t("tirana.cars.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(cars ?? []).map((car) => <CarCard key={car.id} car={car} />)}
          </div>
          <div className="text-center mt-8">
            <LLink to="/flota" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-medium hover:opacity-90 transition-opacity no-underline">
              {t("tirana.cars.viewAll")} <ArrowRight size={16} />
            </LLink>
          </div>
        </div>
      </section>

      {/* FAQ SEO */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">{t("tirana.faqTitle")}</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="bg-neutral-50 rounded-xl border border-border group">
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
      <section className="py-12 px-6 bg-gradient-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">{t("tirana.cta.title")}</h2>
        <p className="text-white/85 mb-6">{t("tirana.cta.text")}</p>
        <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline">
          {t("tirana.cta.button")} <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
