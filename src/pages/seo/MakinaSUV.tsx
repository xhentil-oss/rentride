import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Mountains, Users, Briefcase } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useTranslation } from "react-i18next";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

type FAQ = { question: string; answer: string };

const asList = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const WHY = [
  { icon: Mountains, key: "terrain" },
  { icon: Users, key: "space" },
  { icon: Briefcase, key: "luggage" },
] as const;

export default function MakinaSUV() {
  const { t } = useTranslation("landing");
  const { data: allCars } = useQuery("Car", { where: { category: "SUV" } });
  const cars = allCars ?? [];
  const faq = asList<FAQ>(t("suv.faq", { returnObjects: true }));
  const features = asList<string>(t("suv.features", { returnObjects: true }));

  useSEO({
    title: t("suv.seo.title"),
    description: t("suv.seo.description"),
    keywords: t("suv.seo.keywords"),
    canonical: "/makina-suv-me-qira",
    structuredData: [
      buildFAQSchema(faq),
      buildBreadcrumbSchema([
        { name: t("suv.breadcrumb.home"), url: "/" },
        { name: t("suv.breadcrumb.fleet"), url: "/flota" },
        { name: t("suv.breadcrumb.current"), url: "/makina-suv-me-qira" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-neutral-900 via-primary/80 to-primary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[url('https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1400&q=80')] bg-cover bg-center" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm font-medium">
            <Mountains size={16} weight="fill" /> {t("suv.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t("suv.hero.title")}
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t("suv.hero.intro")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?kategoria=SUV" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              {t("suv.hero.ctaBrowse")} <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              {t("suv.hero.ctaBook")}
            </LLink>
          </div>
        </div>
      </section>

      {/* Why SUV */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-3">{t("suv.why.title")}</h2>
          <p className="text-center text-neutral-500 mb-10">{t("suv.why.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY.map((f) => (
              <div key={f.key} className="text-center p-6 rounded-xl bg-azure/40 border border-border">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon size={28} weight="fill" className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">{t(`suv.why.items.${f.key}.title`)}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{t(`suv.why.items.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature list */}
      <section className="py-10 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
                <CheckCircle size={16} weight="fill" className="text-success shrink-0" />
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{t("suv.cars.title")}</h2>
            <p className="text-neutral-500 mb-8">{t("suv.cars.subtitle")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">{t("suv.faqTitle")}</h2>
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
      <section className="py-12 px-6 bg-gradient-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">{t("suv.cta.title")}</h2>
        <p className="text-white/85 mb-6">{t("suv.cta.text")}</p>
        <LLink to="/flota?kategoria=SUV" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          {t("suv.cta.button")} <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
