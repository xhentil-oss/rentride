import React from "react";
import LLink from "../../components/LLink";
import { AirplaneTilt, MapPin, Clock, CheckCircle, ArrowRight, Phone } from "@phosphor-icons/react";
import Footer from "../../components/Footer";
import { useSEO, buildFAQSchema, buildBreadcrumbSchema } from "../../hooks/useSEO";

const AIRPORT_FAQ = [
  { question: "A jeni në shërbim gjatë gjithë kohës te Aeroporti i Tiranës?", answer: "Sigurisht — marrjen dhe dorëzimin e automjetit e mbulojmë pa ndërprerje, 24 orë në ditë, te Aeroporti Ndërkombëtar Nënë Tereza. Kudo që të jetë ora e mbërritjes, ekipi ynë të pret menjëherë sapo kalon terminalin." },
  { question: "A paguaj diçka më shumë kur e marr makinën te aeroporti?", answer: "Aspak. Dorëzimi i automjetit te Aeroporti Nënë Tereza nuk kushton asgjë — çmimi që rezervon mbetet i njëjtë, pa shtesa të fshehura." },
  { question: "Në cilin pikë të aeroportit takohem me përfaqësuesin tuaj?", answer: "Do të gjesh kolegun tonë pikërisht te dalja e Terminalit Ndërkombëtar (P1), duke mbajtur një tabelë me emrin tënd. Kështu nuk humbet kohë duke kërkuar." },
  { question: "A është e mundur ta lë makinën në orët e vona të natës?", answer: "Pa problem. Dorëzimin e pranojmë edhe jashtë orareve të zakonshme — thjesht na e lajmëro paraprakisht dhe ekipi ynë që punon 24/7 e organizon." },
];

const STEPS = [
  { n: "1", title: "Bëj rezervimin online", desc: "Plotëso kërkesën dhe na trego kodin e fluturimit bashkë me kohën kur mbërrin." },
  { n: "2", title: "Prit konfirmimin", desc: "Konfirmimi të mbërrin menjëherë me email — pa detyrim për parapagesë." },
  { n: "3", title: "Mbërri në Rinas", desc: "Kolegu ynë të pret te dalja e terminalit me një tabelë që mban emrin tënd." },
  { n: "4", title: "Vër dorë në timon", desc: "Nënshkruan kontratën, merr çelësat dhe rruga të qoftë e mbarë!" },
];

export default function MakineAeroport() {
  useSEO({
    title: "Makina me qira te Aeroporti Nënë Tereza — pa tarifë, 24/7",
    description: "Rezervo makinën me qira dhe merre pikërisht te Aeroporti Ndërkombëtar Nënë Tereza. Ekipi ynë të pret te terminali me emrin tënd, në çdo orë të ditës e pa kosto shtesë. Kryeje rezervimin online sot.",
    keywords: "makinë me qira aeroport tirana, rent a car tirana airport, car hire tirana airport, makine aeroport nene tereza, car rental tirana international airport albania",
    canonical: "/makine-me-qira-aeroport",
    structuredData: [
      buildFAQSchema(AIRPORT_FAQ),
      buildBreadcrumbSchema([
        { name: "Kryefaqja", url: "/" },
        { name: "Makina me qira te aeroporti", url: "/makine-me-qira-aeroport" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-neutral-900 to-primary text-white overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm">
            <AirplaneTilt size={16} /> Aeroporti Ndërkombëtar Nënë Tereza
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Makina me qira te Aeroporti i Tiranës
          </h1>
          <p className="text-lg text-neutral-200 mb-8 max-w-2xl mx-auto">
            Merre dhe ktheje automjetin pa ndërprerje, gjatë gjithë ditës e natës, pikërisht te Aeroporti Ndërkombëtar Nënë Tereza. Asnjë rresht pritjeje, asnjë siklet — thjesht rrëmbe çelësat dhe vazhdo udhëtimin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LLink to="/rezervo?pickup=Aeroporti" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
              Rezervo te Aeroporti <ArrowRight size={18} />
            </LLink>
            <a href="tel:+355698145803" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white hover:bg-white/10 no-underline">
              <Phone size={16} /> Kontakto me telefon
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">Përparësitë e tërheqjes së makinës te aeroporti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Përfaqësuesi ynë të pret personalisht te dalja e terminalit",
              "Në dispozicion 24/7, në çdo ditë të kalendarit",
              "Dorëzim te aeroporti pa asnjë kosto ekstra",
              "Orar dorëzimi i përshtatshëm edhe në orët e vona",
              "Automjete të pajisura me GPS dhe klimë automatike",
              "Sigurimi bazë i llogaritur gjithnjë në çmim",
              "Monitorojmë fluturimin tënd sipas kodit të tij",
              "Konfirmim i menjëhershëm me email",
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
          <h2 className="text-2xl font-semibold text-center mb-10">Procesi, hap pas hapi</h2>
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
                Rruga e Aeroportit, Nd. 8, Rinas 1054. Vendi i takimit është dalja e Terminalit Ndërkombëtar (P1) — përfaqësuesi ynë të pret me një tabelë ku shkruhet emri yt, prandaj na dallon me një sy.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Clock size={14} className="text-neutral-400" />
                <span className="text-xs text-neutral-500">Në shërbim: 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-gradient-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Udhëtimi yt të sjell në Tiranë?</h2>
        <p className="text-white/85 mb-6">Rezervoje makinën që tani dhe çelësat do të jenë gati pikërisht kur të zbresësh nga avioni</p>
        <LLink to="/rezervo?pickup=Aeroporti" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-semibold hover:bg-azure no-underline">
          Rezervo tani <ArrowRight size={18} />
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
