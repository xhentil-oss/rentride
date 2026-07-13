import React from "react";
import LLink from "../../components/LLink";
import { MapPin, CheckCircle, ArrowRight, Clock, ShieldCheck, CurrencyDollar, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildLocalBusinessSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Sa kushton një makinë me qira në Tiranë?", answer: "Tarifat nisin nga €25/ditë për klasën ekonomike dhe shkojnë deri rreth €120/ditë për modelet luksoze. Çmimi përcaktohet nga kategoria e automjetit dhe numri i ditëve të qirasë." },
  { question: "A bëhet marrja e makinës direkt te aeroporti?", answer: "Sigurisht. Të presim te Aeroporti Ndërkombëtar Nënë Tereza dhe ta dorëzojmë makinën pa pritje, çdo orë të ditës apo natës." },
  { question: "Çfarë dokumentesh më duhen për të marrë makinën?", answer: "Mjafton patenta e shoferit (të paktën 1 vit përvojë), një dokument identiteti ose pasaportë, dhe një kartë krediti apo debiti." },
  { question: "A përfshihet sigurimi në çmim?", answer: "Po — mbulimi bazë i sigurimit është gjithmonë i përfshirë. Gjatë rezervimit mund të kalosh në mbulim të plotë ose premium nëse dëshiron qetësi maksimale." },
];

export default function MakinaQeraTirana() {
  const { data: cars } = useQuery("Car", { limit: 6 });

  useSEO({
    title: "Makina me Qira Tiranë — Çmime nga €25/ditë | Rent Ride",
    description: "Merr makinë me qira në Tiranë me tarifa të qarta nga €25/ditë. Rezervim online 24/7, dorëzim te Aeroporti Nënë Tereza ose në qytet, flotë e re 2020–2024.",
    keywords: "makina me qira tirane, rent a car tirana, car hire tirana, makinë me qira çmim, makinë me qira online shqiperi",
    canonical: "/makina-me-qira-tirane",
    structuredData: [
      buildLocalBusinessSchema(),
      buildFAQSchema(FAQ_ITEMS),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-primary to-accent text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80')] bg-cover bg-center" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4 text-sm">
            <MapPin size={14} /> Tiranë · Shqipëri
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Makina me Qira në Tiranë
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            Zgjidh makinën, rezervo brenda pak minutash dhe merre aty ku të vjen më për dore — te aeroporti ose në qendër të Tiranës. Pa kosto të fshehura, me mbështetje 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              Rezervo Tani <ArrowRight size={18} />
            </LLink>
            <LLink to="/flota" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Shiko Flotën
            </LLink>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-10">Pse Rent Ride?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: CurrencyDollar, title: "Çmime nga €25/ditë", desc: "Tarifa konkurruese në treg, të deklaruara qartë që në fillim — asnjë surprizë në fund." },
              { icon: MapPin, title: "Dorëzim te Aeroporti", desc: "Të presim direkt te Aeroporti Nënë Tereza dhe ta japim makinën pa pritje e pa tarifë shtesë." },
              { icon: Clock, title: "Rezervim 24/7 Online", desc: "Rezervo në çdo orë; konfirmimin e merr menjëherë në email." },
              { icon: ShieldCheck, title: "Sigurim i Përfshirë", desc: "Çdo automjet vjen me mbulim bazë sigurimi; shtoje në premium nëse do qetësi të plotë." },
              { icon: CheckCircle, title: "Flotë Moderne", desc: "Modele 2020–2024, të servisuara rregullisht dhe me kondicioner në çdo makinë." },
              { icon: Star, title: "+500 Klientë", desc: "Mbi 500 klientë na kanë besuar, me vlerësim mesatar 4.8 nga 5 yje." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl bg-azure/40 border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1">{f.title}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cars */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Makina të gatshme në Tiranë</h2>
          <p className="text-neutral-500 mb-8">Përzgjedhje nga flota jonë e mirëmbajtur, gati për rrugë</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(cars ?? []).map((car) => <CarCard key={car.id} car={car} />)}
          </div>
          <div className="text-center mt-8">
            <LLink to="/flota" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-medium hover:opacity-90 transition-opacity no-underline">
              Shiko të gjitha makinat <ArrowRight size={16} />
            </LLink>
          </div>
        </div>
      </section>

      {/* FAQ SEO */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetjet e shpeshta</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
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
        <h2 className="text-2xl font-bold mb-3">Gati për të nisur udhëtimin?</h2>
        <p className="text-white/85 mb-6">Rezervo online brenda pak minutash dhe ne kujdesemi për pjesën tjetër</p>
        <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline">
          Rezervo Pa Pagesë Online <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
