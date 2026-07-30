import React from "react";
import LLink from "../../components/LLink";
import { MapPin, CheckCircle, ArrowRight, Clock, ShieldCheck, CurrencyDollar, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildLocalBusinessSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Çfarë çmimi ka një makinë me qira në Tiranë?", answer: "Për një makinë me qira në Tiranë tarifat fillojnë me €25/ditë te klasa ekonomike dhe arrijnë rreth €120/ditë te modelet luksoze. Vlera finale varet nga kategoria që zgjidhni dhe sa ditë e mbani automjetin." },
  { question: "A mund ta tërheq makinën te aeroporti i Tiranës?", answer: "Patjetër. Ju presim pikërisht te Aeroporti Ndërkombëtar Nënë Tereza dhe ua kalojmë makinën shpejt e pa vonesa, në çdo orar të ditës ose të natës." },
  { question: "Cilat dokumente kërkohen për të marrë një makinë me qira?", answer: "Ju nevojitet vetëm leja e drejtimit (me së paku 1 vit eksperiencë), një letërnjoftim ose pasaportë, si dhe një kartë krediti a debiti." },
  { question: "A hyn sigurimi brenda çmimit të qirasë?", answer: "Po — çdo tarifë e ka të përfshirë mbulimin bazë të sigurimit. Nëse doni siguri të plotë, gjatë rezervimit mund të zgjidhni një paketë mbulimi më të gjerë ose premium." },
];

export default function MakinaQeraTirana() {
  const { data: cars } = useQuery("Car", { limit: 6 });

  useSEO({
    title: "Makina me qira në Tiranë — nga €25/ditë",
    description: "Rezervo makina me qira në Tiranë me çmime transparente që nisin nga €25/ditë. Prenotim online pa ndërprerje, dorëzim te Aeroporti Nënë Tereza apo brenda qytetit, flotë e freskët 2020–2024.",
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
            Makina me qira në Tiranë
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            Përzgjidh automjetin, kryeje rezervimin për pak minuta dhe tërhiqe atje ku të leverdis më shumë — te aeroporti ose në zemër të Tiranës. Çmime pa kosto të fshehura dhe asistencë në çdo orë, 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              Rezervo Menjëherë <ArrowRight size={18} />
            </LLink>
            <LLink to="/flota" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Eksploro Flotën
            </LLink>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-10">Përse të zgjidhni Rent Ride?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: CurrencyDollar, title: "Nisje nga €25/ditë", desc: "Tarifa të favorshme në treg, të shpallura hapur që në krye — pa asnjë surprizë kur mbyllni rezervimin." },
              { icon: MapPin, title: "Dorëzim në Aeroport", desc: "Ju presim pikërisht te Aeroporti Nënë Tereza dhe ua japim makinën pa vonesa e pa asnjë pagesë ekstra." },
              { icon: Clock, title: "Prenotim Online 24/7", desc: "Rezervoni në çfarëdo ore; konfirmimi ju mbërrin sakaq në postën elektronike." },
              { icon: ShieldCheck, title: "Sigurimi i Përfshirë", desc: "Çdo makinë vjen me mbulim bazë sigurimi; kaloni në premium sa herë kërkoni qetësi të plotë." },
              { icon: CheckCircle, title: "Flotë e Re", desc: "Modele nga viti 2020 deri 2024, të mirëmbajtura vazhdimisht dhe të pajisura të gjitha me kondicioner." },
              { icon: Star, title: "Mbi 500 Klientë", desc: "Më shumë se 500 klientë na kanë zgjedhur, me një vlerësim mesatar prej 4.8 nga 5 yjesh." },
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
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Makina të disponueshme në Tiranë</h2>
          <p className="text-neutral-500 mb-8">Një përzgjedhje nga flota jonë e mirëmbajtur, e gatshme t'ju çojë kudo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(cars ?? []).map((car) => <CarCard key={car.id} car={car} />)}
          </div>
          <div className="text-center mt-8">
            <LLink to="/flota" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-medium hover:opacity-90 transition-opacity no-underline">
              Shfaq të gjitha automjetet <ArrowRight size={16} />
            </LLink>
          </div>
        </div>
      </section>

      {/* FAQ SEO */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetje që bëhen shpesh</h2>
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
        <h2 className="text-2xl font-bold mb-3">Gati t'i hipni rrugës?</h2>
        <p className="text-white/85 mb-6">Kryeni rezervimin online për pak minuta dhe pjesën tjetër e marrim ne përsipër</p>
        <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline">
          Rezervo Online Falas <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
