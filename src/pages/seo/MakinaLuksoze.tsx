import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Crown, Diamond, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Cilat modele luksoze keni në dispozicion?", answer: "Në gamën tonë premium gjen BMW Serinë 7, Mercedes-Benz E-Class dhe S-Class, Audi A6, Porsche Cayenne si dhe automjete të tjera ekskluzive — një koleksion që e freskojmë vazhdimisht." },
  { question: "Cila është tarifa për të marrë me qira një makinë luksoze?", answer: "Çmimet fillojnë në €80/ditë dhe varen nga modeli i zgjedhur, periudha e vitit dhe numri i ditëve. Kur qiraja kalon 7 ditë, aplikojmë tarifa më të ulëta." },
  { question: "A mund t'i përdor makinat luksoze për dasma apo evente?", answer: "Patjetër — ofrojmë paketa të veçanta për dasma, takime biznesi dhe seanca fotografike. Kontaktona dhe të përgatisim një propozim sipas nevojave të tua." },
  { question: "A vjen makina bashkë me shofer?", answer: "Po. Te automjetet luksoze mund të shtosh një shofer profesionist me një kosto shtesë — zgjidhja ideale për transferta nga aeroporti apo për evente." },
];

export default function MakinaLuksoze() {
  const { data: allCars } = useQuery("Car", { where: { category: "Luksoze" } });
  const cars = allCars ?? [];

  useSEO({
    title: "Qira Makinash Luksoze në Tiranë — BMW, Mercedes, Audi nga €80/ditë | Rent Ride",
    description: "Merr me qira në Tiranë automjete premium: BMW, Mercedes-Benz, Audi dhe Porsche duke nisur nga €80/ditë. Perfekte për dasma, evente dhe transferta VIP, me konfirmim të shpejtë.",
    keywords: "makina luksoze me qira tirane, qira BMW Mercedes tirana, luxury car rental albania, car hire tirana luxury, VIP car rental tirana",
    canonical: "/makina-luksoze-me-qira",
    structuredData: [
      buildFAQSchema(FAQ_ITEMS),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Flota", url: "/flota" },
        { name: "Qira Makinash Luksoze", url: "/makina-luksoze-me-qira" },
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
            <Crown size={16} weight="fill" /> Premium &amp; Luxury Fleet
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Qira Makinash Luksoze<br />
            <span className="text-primary">BMW · Mercedes · Audi</span>
          </h1>
          <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Ndjesia e vërtetë e drejtimit premium, pikërisht ashtu si e ke ëndërruar. Automjetet tona luksoze e shndërrojnë çdo rrugëtim në një kujtim të paharruar — qoftë dasmë, takim biznesi apo thjesht kënaqësi udhëtimi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?kategoria=Luksoze" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition-colors no-underline text-base">
              Eksploro Flotën Luksoze <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Bëj rezervimin
            </LLink>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-3">Përjetimi premium</h2>
          <p className="text-center text-neutral-500 mb-10">Çdo detaj i punuar me kujdes për rehatinë tënde më të lartë</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Crown, title: "Nivel elitar", desc: "BMW, Mercedes, Audi — markat më prestigjioze në planet. Tapiceri lëkure dhe pajisje të gjeneratës më të re." },
              { icon: Diamond, title: "Garanci çmimi", desc: "E has të njëjtin automjet me kosto më të ulët gjetkë? Ne e përputhim ofertën menjëherë, pa asnjë pengesë." },
              { icon: Star, title: "Shërbim VIP", desc: "Nisu drejt destinacionit me elegancë — me marrje te aeroporti dhe shofer sipas dëshirës." },
            ].map((f) => (
              <div key={f.title} className="text-center p-6 rounded-xl border-2 border-border bg-azure/30">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon size={28} weight="fill" className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inclusion list */}
      <section className="py-10 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-neutral-900 text-center mb-6">Çfarë ke të përfshirë</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Sedilje lëkure me ngrohje dhe ventilim",
              "Ekran panoramik me Head-Up Display",
              "Audio i klasit të lartë (Bang & Olufsen / Harman)",
              "Kondicioner automatik në 4 zona",
              "Mbulim i plotë me sigurim gjithëpërfshirës",
              "Kamera 360° me Park Assist",
              "Adaptive Cruise Control me Lane Assist",
              "Karikues pa kabllo dhe 4 dalje USB",
              "Marrje pa pagesë te aeroporti, në çdo orë",
              "Shofer sipas kërkesës, me tarifë shtesë",
            ].map((f) => (
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Automjetet luksoze në dispozicion</h2>
            <p className="text-neutral-500 mb-8">Rezervimi bëhet online, me konfirmim të shpejtë</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetje &amp; përgjigje — Luksoze</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
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
          <h2 className="text-2xl font-bold mb-3">Sigurohu përjetimin tënd premium</h2>
          <p className="text-neutral-400 mb-6">Automjetet tona luksoze janë gati për ty në çdo orë, për secilin moment të veçantë</p>
          <LLink to="/flota?kategoria=Luksoze" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover no-underline">
            Shfleto Luksoze <ArrowRight size={18} />
          </LLink>
        </div>
      </section>

      <Footer />
    </div>
  );
}
