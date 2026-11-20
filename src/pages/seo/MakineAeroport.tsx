import React from "react";
import LLink from "../../components/LLink";
import { AirplaneTilt, MapPin, Clock, CheckCircle, ArrowRight, Phone } from "@phosphor-icons/react";
import Footer from "../../components/Footer";
import { useTranslation } from "react-i18next";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

type FAQ = { question: string; answer: string };
type Step = { title: string; desc: string };

/** Physical address of the meeting point — a proper name, not translated. */
const AIRPORT_ADDRESS = "Rruga e Aeroportit, Nd. 8, Rinas 1054";

const asList = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export default function MakineAeroport() {
  const { t } = useTranslation("landing");
  const faq = asList<FAQ>(t("airport.faq", { returnObjects: true }));
  const benefits = asList<string>(t("airport.benefits.items", { returnObjects: true }));
  const steps = asList<Step>(t("airport.steps.items", { returnObjects: true }));

  useSEO({
    title: t("airport.seo.title"),
    description: t("airport.seo.description"),
    keywords: t("airport.seo.keywords"),
    canonical: "/makine-me-qira-aeroport",
    structuredData: [
      buildFAQSchema(faq),
      buildBreadcrumbSchema([
        { name: t("airport.breadcrumb.home"), url: "/" },
        { name: t("airport.breadcrumb.current"), url: "/makine-me-qira-aeroport" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-neutral-900 to-primary text-white overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm">
            <AirplaneTilt size={16} /> {t("airport.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("airport.hero.title")}
          </h1>
          <p className="text-lg text-neutral-200 mb-8 max-w-2xl mx-auto">
            {t("airport.hero.intro")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/rezervo?pickup=Aeroporti" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
              {t("airport.hero.ctaBook")} <ArrowRight size={18} />
            </LLink>
            <a href="tel:+355698145803" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white hover:bg-white/10 no-underline">
              <Phone size={16} /> {t("airport.hero.ctaCall")}
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">{t("airport.benefits.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3 p-4 bg-azure/30 rounded-lg">
                <CheckCircle size={18} weight="fill" className="text-success shrink-0" />
                <span className="text-sm text-neutral-700">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">{t("airport.steps.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">{i + 1}</div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="py-10 px-6 bg-white">
        <div className="max-w-3xl mx-auto bg-primary/5 rounded-2xl border border-primary/20 p-8">
          <div className="flex items-start gap-4">
            <MapPin size={24} weight="fill" className="text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">{t("airport.info.title")}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {t("airport.info.text", { address: AIRPORT_ADDRESS })}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Clock size={14} className="text-neutral-400" />
                <span className="text-xs text-neutral-500">{t("airport.info.hours")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-gradient-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">{t("airport.cta.title")}</h2>
        <p className="text-white/85 mb-6">{t("airport.cta.text")}</p>
        <LLink to="/rezervo?pickup=Aeroporti" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          {t("airport.cta.button")} <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
