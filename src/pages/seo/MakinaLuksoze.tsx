import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Crown, Diamond, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Çfarë makinash luksoze ofroni?", answer: "Flota premium përfshin BMW Serinë 7, Mercedes-Benz E-Class e S-Class, Audi A6, Porsche Cayenne dhe modele të tjera ekskluzive, që i përditësojmë rregullisht." },
  { question: "Sa kushton një makinë luksoze me qira?", answer: "Tarifat nisin nga €80/ditë dhe ndryshojnë sipas modelit, sezonit e kohëzgjatjes. Për rezervime mbi 7 ditë ofrojmë çmime të favorshme." },
  { question: "A jepni makina luksoze për dasma e evente?", answer: "Sigurisht — kemi paketa të dedikuara për dasma, evente korporative dhe fotosesione. Na shkruaj për një ofertë të personalizuar." },
  { question: "A ofroni edhe shofer?", answer: "Po, për makinat luksoze mund të shtosh shërbimin me shofer kundrejt një tarife. Perfekt për transferta nga aeroporti ose evente." },
];

export default function MakinaLuksoze() {
  const { data: allCars } = useQuery("Car", { where: { category: "Luksoze" } });
  const cars = allCars ?? [];

  useSEO({
    title: "Makina Luksoze me Qira Tiranë — BMW Mercedes Audi nga €80/ditë | Rent Ride",
    description: "Makina premium me qira në Tiranë: BMW, Mercedes-Benz, Audi e Porsche nga €80/ditë. Ideale për dasma, evente dhe transferta VIP — me konfirmim të menjëhershëm.",
    keywords: "makina luksoze me qira tirane, BMW Mercedes qira tirana, luxury car rental albania, car hire tirana luxury, VIP car rental tirana",
    canonical: "/makina-luksoze-me-qira",
    structuredData: [
      buildFAQSchema(FAQ_ITEMS),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Flota", url: "/flota" },
        { name: "Luksoze me Qira", url: "/makina-luksoze-me-qira" },
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
            Makina Luksoze me Qira<br />
            <span className="text-primary">BMW · Mercedes · Audi</span>
          </h1>
          <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Drejtimi premium, ashtu siç e meriton. Makinat tona luksoze e kthejnë çdo udhëtim në diçka të paharrueshme — dasmë, event korporativ apo thjesht qejf udhëtimi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?kategoria=Luksoze" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition-colors no-underline text-base">
              Shiko Flotën Luksoze <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Rezervo tani
            </LLink>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-3">Eksperienca premium</h2>
          <p className="text-center text-neutral-500 mb-10">Çdo hollësi e menduar për rehati maksimale</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Crown, title: "Klasa e parë", desc: "BMW, Mercedes, Audi — emrat më të mëdhenj në botë. Interier lëkure dhe teknologji e fundit." },
              { icon: Diamond, title: "Çmimi më i mirë", desc: "E gjen të njëjtin model më lirë diku tjetër? Ne ta barazojmë çmimin pa pyetje." },
              { icon: Star, title: "Trajtim VIP", desc: "Mbërri me stil — me marrje nga aeroporti dhe shofer, nëse e dëshiron." },
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
          <h3 className="text-lg font-semibold text-neutral-900 text-center mb-6">Çfarë përfshihet</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Interier lëkure me ngrohje dhe freskim",
              "Ekran panoramik dhe Head-Up Display",
              "Sistem audio premium (Bang & Olufsen / Harman)",
              "Klimë automatike me 4 zona",
              "Sigurim gjithëpërfshirës i plotë",
              "Kamera 360° dhe Park Assist",
              "Adaptive Cruise Control dhe Lane Assist",
              "Karikim wireless dhe 4 porte USB",
              "Marrje falas nga aeroporti, 24/7",
              "Shofer me kërkesë, kundrejt tarife",
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Flota luksoze e disponueshme</h2>
            <p className="text-neutral-500 mb-8">Rezervo online — konfirmim i menjëhershëm</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetjet e shpeshta — Luksoze</h2>
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
          <h2 className="text-2xl font-bold mb-3">Rezervo eksperiencën tënde premium</h2>
          <p className="text-neutral-400 mb-6">Makinat tona luksoze të presin 24/7, për çdo rast të veçantë</p>
          <LLink to="/flota?kategoria=Luksoze" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover no-underline">
            Shiko Luksoze <ArrowRight size={18} />
          </LLink>
        </div>
      </section>

      <Footer />
    </div>
  );
}
