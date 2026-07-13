import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Mountains, Users, Briefcase } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Çfarë SUV-sh mund të marr me qira në Tiranë?", answer: "Flota jonë përfshin modele si Toyota RAV4, BMW X5, Hyundai Tucson, Kia Sportage e të tjera — të gjitha me kondicioner dhe GPS standard." },
  { question: "Sa është çmimi i një SUV-i në ditë?", answer: "Çmimet nisin nga €45/ditë dhe arrijnë rreth €120/ditë për modelet premium. Tarifa varet nga modeli i zgjedhur dhe sezoni." },
  { question: "A lejohet të dal jashtë Shqipërisë me SUV?", answer: "Po — me autorizimin përkatës mund të udhëtosh në Kosovë, Maqedoni të Veriut apo Greqi. Na kontakto paraprakisht për dokumentacionin." },
  { question: "A i keni SUV-t me sistem 4x4?", answer: "Disa nga modelet tona kanë trakcion të plotë 4x4, perfekt për terren malor dhe rrugë të vështira. Shëno preferencën gjatë rezervimit." },
];

export default function MakinaSUV() {
  const { data: allCars } = useQuery("Car", { where: { category: "SUV" } });
  const cars = allCars ?? [];

  useSEO({
    title: "SUV me Qira Tiranë — 4x4 dhe Crossover nga €45/ditë | Rent Ride",
    description: "Merr SUV ose crossover me qira në Tiranë nga €45/ditë. Modele të reja me kondicioner, GPS dhe sigurim të përfshirë — ideale për mal, bregdet e familje. Rezervo online.",
    keywords: "SUV me qira tirane, 4x4 me qira shqiperi, crossover rent tirana, car hire tirana suv, BMW X5 RAV4 Tucson me qira",
    canonical: "/makina-suv-me-qira",
    structuredData: [
      buildFAQSchema(FAQ_ITEMS),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Flota", url: "/flota" },
        { name: "SUV me Qira", url: "/makina-suv-me-qira" },
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
            <Mountains size={16} weight="fill" /> SUV &amp; 4x4 — Tiranë
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            SUV me Qira në Tiranë
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            Përshko Shqipërinë me SUV-t tanë të fuqishëm — nga rrugicat e qytetit te malet dhe bregdeti. Fuqi, qëndrueshmëri dhe komoditet në çdo kthesë.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?kategoria=SUV" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              Shiko SUV-t disponueshëm <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Rezervo tani
            </LLink>
          </div>
        </div>
      </section>

      {/* Why SUV */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-3">Kur ia vlen një SUV?</h2>
          <p className="text-center text-neutral-500 mb-10">Zgjidhja e duhur për familje, grupe dhe udhëtime aventureske</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Mountains, title: "Përballon çdo terren", desc: "Trakcion 4x4 dhe distancë e lartë nga toka — i sigurt në male e rrugë pa asfalt." },
              { icon: Users, title: "Vend për të gjithë", desc: "5–7 ulëse dhe kabinë e gjerë: komoditet i plotë për familjen apo grupin." },
              { icon: Briefcase, title: "Bagazh i bollshëm", desc: "Deri në 500L hapësirë — mjafton edhe për valixhet e një udhëtimi të gjatë." },
            ].map((f) => (
              <div key={f.title} className="text-center p-6 rounded-xl bg-azure/40 border border-border">
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

      {/* Feature list */}
      <section className="py-10 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Kondicioner automatik me dy zona",
              "Navigim GPS i integruar",
              "Sigurim i plotë i përfshirë",
              "Kamera parkimi 360°",
              "Bluetooth dhe Apple CarPlay",
              "Ulëse të ngrohura para e prapa",
              "Sensorë parkimi para e prapa",
              "Deri në 8 airbag mbrojtës",
              "ABS, ESP dhe traction control",
              "Marrje falas nga aeroporti",
            ].map((f) => (
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">SUV të gatshëm tani</h2>
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
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetjet e shpeshta — SUV me Qira</h2>
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
      <section className="py-12 px-6 bg-gradient-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Gati për aventurën tjetër?</h2>
        <p className="text-white/85 mb-6">Rezervo SUV-n tënd online — i disponueshëm 24/7</p>
        <LLink to="/flota?kategoria=SUV" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          Shiko SUV-t <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
