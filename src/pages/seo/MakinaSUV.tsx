import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Mountains, Users, Briefcase } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Cilat modele SUV janë në dispozicion për qira në Tiranë?", answer: "Në flotën tonë gjeni Toyota RAV4, BMW X5, Hyundai Tucson, Kia Sportage dhe modele të tjera të ngjashme — secili i pajisur si standard me kondicioner dhe navigator GPS." },
  { question: "Me sa fillon tarifa ditore për një SUV?", answer: "Fillimi është nga €45/ditë, ndërsa modelet premium shkojnë deri në rreth €120/ditë. Vlera përfundimtare përcaktohet nga modeli që zgjidhni dhe periudha e vitit." },
  { question: "A mund të kaloj kufirin e Shqipërisë me një SUV?", answer: "Sigurisht — pasi të merrni autorizimin e nevojshëm, udhëtimi drejt Kosovës, Maqedonisë së Veriut ose Greqisë është i mundur. Njoftona më parë që të përgatisim dokumentet." },
  { question: "A ka mes tyre SUV me tërheqje 4x4?", answer: "Po, një pjesë e modeleve vijnë me sistem 4x4 me katër rrota lëvizëse, ideal për rrugë malore dhe terrene sfiduese. Mjafton ta specifikoni kur bëni rezervimin." },
];

export default function MakinaSUV() {
  const { data: allCars } = useQuery("Car", { where: { category: "SUV" } });
  const cars = allCars ?? [];

  useSEO({
    title: "SUV me Qira Tiranë — 4x4 e Crossover nga €45/ditë | Rent Ride",
    description: "Zgjidh një SUV apo crossover me qira në Tiranë duke nisur nga €45/ditë. Automjete moderne me kondicioner, GPS dhe sigurim brenda çmimit — perfekte për male, plazh dhe udhëtime familjare. Bëj rezervimin online.",
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
            Zbulo çdo cep të Shqipërisë me SUV-t tanë të gjindshëm — nga trafiku i qendrës e deri lart në male e buzë detit. Forcë, siguri dhe rehati që të shoqërojnë në çdo rrugë.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?kategoria=SUV" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              Eksploro SUV-t e lira <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Rezervo menjëherë
            </LLink>
          </div>
        </div>
      </section>

      {/* Why SUV */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-3">Përse të zgjedhësh një SUV?</h2>
          <p className="text-center text-neutral-500 mb-10">Opsioni ideal për familje, shoqëri dhe udhëtime plot aventurë</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Mountains, title: "I gatshëm për çdo rrugë", desc: "Me tërheqje 4x4 dhe pozicion të ngritur nga toka — i besueshëm në male dhe në shtigje pa asfalt." },
              { icon: Users, title: "Hapësirë për të gjithë", desc: "Nga 5 deri në 7 vende dhe një kabinë e gjerë që ofron rehati për familjen ose grupin." },
              { icon: Briefcase, title: "Portobagazh i madh", desc: "Deri në 500L kapacitet — hapësirë e mjaftueshme edhe për valixhet e një pushimi të gjatë." },
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
              "Klimë automatike me dy zona",
              "Sistem navigimi GPS i inkorporuar",
              "Mbulim i plotë sigurimi në çmim",
              "Kamerë parkimi me pamje 360°",
              "Lidhje Bluetooth dhe Apple CarPlay",
              "Ndenjëse me ngrohje para dhe pas",
              "Sensorë parkimi ballor dhe të pasëm",
              "Deri në 8 jastëkë ajri mbrojtës",
              "Sisteme ABS, ESP dhe kontroll tërheqjeje",
              "Marrje pa pagesë te aeroporti",
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">SUV të disponueshëm në këtë moment</h2>
            <p className="text-neutral-500 mb-8">Bëj rezervimin online — konfirmohesh në çast</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetje që bëhen shpesh — SUV me Qira</h2>
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
        <h2 className="text-2xl font-bold mb-3">Të presin aventura të reja?</h2>
        <p className="text-white/85 mb-6">Rezervo SUV-n tënd online — shërbim i hapur 24/7</p>
        <LLink to="/flota?kategoria=SUV" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          Eksploro SUV-t <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
