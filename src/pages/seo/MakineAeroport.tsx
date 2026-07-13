import React from "react";
import LLink from "../../components/LLink";
import { AirplaneTilt, MapPin, Clock, CheckCircle, ArrowRight, Phone } from "@phosphor-icons/react";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const AIRPORT_FAQ = [
  { question: "A punoni 24 orë te Aeroporti i Tiranës?", answer: "Po — dorëzimi dhe kthimi i makinës bëhet 24/7 te Aeroporti Ndërkombëtar Nënë Tereza. Stafi ynë të pret sapo del nga terminali, në çfarëdo ore." },
  { question: "A ka tarifë marrja e makinës te aeroporti?", answer: "Jo. Marrja te Aeroporti Nënë Tereza është krejt falas — pa asnjë kosto shtesë mbi çmimin e qirasë." },
  { question: "Ku takohem me stafin brenda aeroportit?", answer: "Të presim te dalja e Terminalit Ndërkombëtar (P1), me një tabelë që mban emrin tënd. S'ke pse të kërkosh gjatë." },
  { question: "A mund ta dorëzoj makinën natën vonë?", answer: "Patjetër. Kthimi është fleksibël edhe jashtë orarit standard — mjafton ta koordinojmë paraprakisht me ekipin tonë 24/7." },
];

const STEPS = [
  { n: "1", title: "Rezervo online", desc: "Plotëso formularin dhe shëno numrin e fluturimit me orën e mbërritjes." },
  { n: "2", title: "Merr konfirmimin", desc: "Të vjen konfirmimi me email — pa pagesë paradhënie të detyrueshme." },
  { n: "3", title: "Zbrit në Rinas", desc: "Stafi ynë të pret te dalja e terminalit me emrin tënd." },
  { n: "4", title: "Nis rrugën", desc: "Firmos kontratën, merr çelësat dhe udhëtim të mbarë!" },
];

export default function MakineAeroport() {
  useSEO({
    title: "Makinë me Qira nga Aeroporti Nënë Tereza — 24/7, Falas | Rent Ride",
    description: "Merr makinën direkt te Aeroporti Ndërkombëtar Nënë Tereza. Stafi të pret te terminali me emrin tënd, 24/7 dhe pa tarifë shtesë. Rezervo online sot.",
    keywords: "makinë me qira aeroport tirana, rent a car tirana airport, car hire tirana airport, makine aeroport nene tereza, car rental tirana international airport albania",
    canonical: "/makine-me-qira-aeroport",
    structuredData: [
      buildFAQSchema(AIRPORT_FAQ),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Makinë nga Aeroporti", url: "/makine-me-qira-aeroport" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-neutral-900 to-primary text-white overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm">
            <AirplaneTilt size={16} /> Aeroporti Nënë Tereza
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Makinë me Qira nga Aeroporti
          </h1>
          <p className="text-lg text-neutral-200 mb-8 max-w-2xl mx-auto">
            Dorëzim dhe kthim 24 orë në 24, direkt te Aeroporti Ndërkombëtar Nënë Tereza. Pa radhë e pa stres — vetëm merr çelësat dhe nise rrugën.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/rezervo?pickup=Aeroporti" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
              Rezervo nga Aeroporti <ArrowRight size={18} />
            </LLink>
            <a href="tel:+355698145803" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white hover:bg-white/10 no-underline">
              <Phone size={16} /> Na telefono
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">Çfarë fiton me marrjen te aeroporti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Pritje personale te dalja e terminalit",
              "Hapur 24/7, çdo ditë të vitit",
              "Marrja te aeroporti pa pagesë shtesë",
              "Kthim fleksibël edhe natën vonë",
              "Makina me GPS dhe kondicioner automatik",
              "Sigurimi bazë gjithmonë i përfshirë",
              "Ndjekje sipas numrit të fluturimit",
              "Konfirmim me email në çast",
            ].map((b) => (
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
          <h2 className="text-2xl font-semibold text-center mb-10">Si funksionon, hap pas hapi</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">{s.n}</div>
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
              <h3 className="font-semibold text-neutral-900 mb-2">Aeroporti Ndërkombëtar Nënë Tereza</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Rinas, Tiranë 1504. Takohemi te dalja e Terminalit Ndërkombëtar (P1) — stafi ynë mban një tabelë me emrin tënd, kështu që na gjen menjëherë.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Clock size={14} className="text-neutral-400" />
                <span className="text-xs text-neutral-500">I disponueshëm: 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-gradient-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Po vjen drejt Tiranës?</h2>
        <p className="text-white/85 mb-6">Rezervo që tani dhe çelësat të presin sapo zbret nga avioni</p>
        <LLink to="/rezervo?pickup=Aeroporti" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          Rezervo tani <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
