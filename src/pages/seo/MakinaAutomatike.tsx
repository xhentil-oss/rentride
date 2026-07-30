import React from "react";
import LLink from "../../components/LLink";
import { ArrowRight, CheckCircle, Gear, Path, Star } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import CarCard from "../../components/CarCard";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const FAQ_ITEMS = [
  { question: "Cilat janë përparësitë e një makine automatike?", answer: "Me një automatik nuk ju duhet të merreni fare me levën e marshit, ndaj drejtimi bëhet shumë më i lehtë, veçanërisht kur qyteti është plot me trafik. Është zgjidhja e duhur për këdo që s'e ka zakon manualin ose kalon orë të tëra në timon." },
  { question: "A kanë çmim më të lartë makinat automatike me qira?", answer: "Tarifa është zakonisht paksa më e lartë (afërsisht +5–10%), megjithatë rehatia që ofron drejtimi e justifikon plotësisht diferencën. Rezervimet fillojnë nga €35 në ditë." },
  { question: "Çfarë modelesh automatike ofroni në flotë?", answer: "Në dispozicion keni Toyota Corolla Hybrid, BMW Seria 3, Mercedes C-Class, Volkswagen Passat dhe shumë alternativa të tjera të pajisura me kuti DSG apo CVT." },
  { question: "A mund ta tërheq automatikun drejtpërdrejt në aeroport?", answer: "Sigurisht! Dorëzimi pranë Aeroportit Nënë Tereza ofrohet pa pagesë dhe në çdo orar, 24/7. Thjesht përzgjidhni opsionin 'Automatike' kur bëni rezervimin online." },
];

export default function MakinaAutomatike() {
  const { data: allCars } = useQuery("Car", { where: { transmission: "Automatike" } });
  const cars = allCars ?? [];

  useSEO({
    title: "Makina automatike me qira në Tiranë — nga €35/ditë",
    description: "Makina automatike me qira në Tiranë nga €35/ditë. Zgjidh mes kutive DSG, CVT dhe versioneve hibride — komode në trafik dhe perfekte për vizitorët nga jashtë. Bëje rezervimin online.",
    keywords: "makina automatike me qira tirane, automatic car rental tirana, car hire tirana automatic, makinë DSG qira shqiperi, hibrid me qira tirana",
    canonical: "/makina-automatike-me-qira",
    structuredData: [
      buildFAQSchema(FAQ_ITEMS),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Flota", url: "/flota" },
        { name: "Makina automatike me qira", url: "/makina-automatike-me-qira" },
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
            <Gear size={16} weight="fill" /> Kuti Marshi Automatike
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Makina automatike me qira
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">
            Ngasje pa tension në Tiranë dhe në çdo cep të Shqipërisë. Falë kutive automatike DSG e CVT, çdo rrugëtim rrjedh butësisht — si në trafikun e qytetit, ashtu edhe në autostradë.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/flota?transmision=Automatike" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure transition-colors no-underline text-base">
              Eksploro të gjitha automatike <ArrowRight size={18} />
            </LLink>
            <LLink to="/rezervo" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors no-underline text-base">
              Rezervo menjëherë
            </LLink>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-neutral-900 mb-10">Përse t'i zgjedhësh automatikët?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Path, title: "Rehati në trafik", desc: "Askush s'mendon më për levën e marshit — i gjithë fokusi mbetet te rruga, madje edhe kur trafiku është i rënduar." },
              { icon: Star, title: "Ngasje pa mundim", desc: "Rrugëtim që s'të lodh: kutitë DSG dhe CVT ndërrojnë marshet me një butësi të plotë." },
              { icon: Gear, title: "Teknologji e përparuar", desc: "Automatikët e brezit të ri shpesh harxhojnë njësoj — ndonjëherë edhe më pak — se variantet manuale." },
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
              "Kuti marshi DSG / CVT / Torque Converter",
              "Perfekte për shoferët nga jashtë vendit",
              "Klimatizim automatik me dy zona të pavarura",
              "Njësoj të lehta për qytetin dhe autostradën",
              "Lidhje Bluetooth dhe integrim me telefonin",
              "Mbulimi bazë i sigurimit i përfshirë në çmim",
              "Dorëzim pa pagesë te Aeroporti Nënë Tereza",
              "Gati për rezervim online në çdo orar, 24/7",
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
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Automatike të disponueshme këtë çast</h2>
            <p className="text-neutral-500 mb-8">Bëje rezervimin online — merr konfirmimin në çast</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map((car) => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">Pyetje që na bëhen shpesh</h2>
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
        <h2 className="text-2xl font-bold mb-3">Nis ngasjen pa tension që sot</h2>
        <p className="text-white/85 mb-6">Siguro makinën tënde automatike online, brenda pak minutash</p>
        <LLink to="/flota?transmision=Automatike" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          Shfleto automatiket <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
