import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Gear, Path, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Pse të zgjedh një makinë automatike?", answer: "Automatiku është më i thjeshtë në drejtim, sidomos në trafikun e qytetit — pa levë marshi për të menduar. Ideal nëse nuk je mësuar me manual ose bën shumë kilometra." },
  { question: "A është më i shtrenjtë automatiku me qira?", answer: "Zakonisht kushton pak më shumë (rreth +5–10%), por rehatia në drejtim ia vlen. Çmimet nisin nga €35/ditë." },
  { question: "Çfarë modelesh automatike keni?", answer: "Disponojmë Toyota Corolla Hybrid, BMW Seria 3, Mercedes C-Class, Volkswagen Passat e shumë të tjera me kuti DSG ose CVT." },
  { question: "A merret automatiku direkt te aeroporti?", answer: "Po! Marrja te Aeroporti Nënë Tereza është falas, 24/7. Mjafton të zgjedhësh 'Automatike' gjatë rezervimit online." },
];

export default function MakinaAutomatike() {
  const { data: allCars } = useQuery("Car", { where: { transmission: "Automatike" } });
  const cars = allCars ?? [];

  useSEO({
    title: "Makina Automatike me Qira Tiranë — nga €35/ditë | Rent Ride",
    description: "Merr makinë automatike me qira në Tiranë nga €35/ditë. Kuti DSG, CVT dhe hibride — të lehta në trafik dhe ideale për vizitorë të huaj. Rezervo online.",
    keywords: "makina automatike me qira tirane, automatic car rental tirana, car hire tirana automatic, makinë DSG qira shqiperi, hibrid me qira tirana",
    canonical: "/makina-automatike-me-qira",
    structuredData: [
      buildFAQSchema(FAQ_ITEMS),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Flota", url: "/flota" },
        { name: "Automatike me Qira", url: "/makina-automatike-me-qira" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-neutral-900 via-primary to-accent text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=1400&q=80')] bg-cover bg-center" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm font-medium">
            <Gear size={16} weight="fill" /> Transmision Automatik
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Makina Automatike me Qira
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            Drejto pa stres në Tiranë e gjithë Shqipërinë. Me kuti automatike DSG dhe CVT, çdo udhëtim bëhet i qetë — qoftë në trafik qyteti apo në autostradë.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?transmision=Automatike" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              Shiko të gjitha automatike <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Rezervo tani
            </LLink>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-10">Pse automatiku?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Path, title: "Lehtësi në trafik", desc: "Pa levë marshi për të menduar — vëmendja jote rri vetëm te rruga, edhe në trafik të dendur." },
              { icon: Star, title: "Komoditet superior", desc: "Udhëtim pa lodhje: kutitë DSG/CVT bëjnë kalime marshi krejt të buta." },
              { icon: Gear, title: "Teknologji moderne", desc: "Automatikët e sotëm shpesh janë po aq ekonomikë — ose më shumë — se manualët." },
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
              "Kuti automatike DSG / CVT / Torque Converter",
              "Ideale për drejtues ndërkombëtarë",
              "Kondicioner automatik me dy zona",
              "Të përshtatshme për qytet dhe autostradë",
              "Bluetooth dhe integrim me smartphone",
              "Sigurimi bazë i përfshirë",
              "Marrje falas nga Aeroporti Nënë Tereza",
              "Të disponueshme 24/7 online",
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Automatike të gatshme tani</h2>
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
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetjet e shpeshta</h2>
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
        <h2 className="text-2xl font-bold mb-3">Drejto pa stres që sot</h2>
        <p className="text-white/85 mb-6">Rezervo makinën tënde automatike online, brenda pak minutash</p>
        <LLink to="/flota?transmision=Automatike" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          Shiko Automatike <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
