import LLink from "../components/LLink";
import { ArrowLeft, Lock, Eye, Database, Bell, Trash } from "@phosphor-icons/react";
import { useSEO } from "../hooks/useSEO";
import { ADDRESS_LINE } from "../lib/seo";

export default function PrivacyPage() {
  useSEO({
    title: "Politika e privatësisë",
    description: "Si Rent Ride mbledh, përdor dhe mbron të dhënat tuaja personale. Sipas GDPR dhe ligjit shqiptar për mbrojtjen e të dhënave.",
    keywords: "politika privatesi, mbrojtja te dhenave, GDPR, rent car tirana",
    canonical: "/privatesie",
  });

  const highlights = [
    { icon: Database, title: "Çfarë mbledhim", text: "Emrin, emailin, telefonin dhe patentën për procesin e rezervimit." },
    { icon: Eye, title: "Si e përdorim", text: "Vetëm për konfirmimin e rezervimit, komunikimin dhe raportimin ligjor." },
    { icon: Lock, title: "Si e mbrojmë", text: "Enkriptim SSL 256-bit, access i kufizuar, auditim i rregullt." },
    { icon: Trash, title: "E drejta e fshirjes", text: "Mund të kërkoni fshirjen e të dhënave tuaja në çdo kohë." },
  ];

  const sections = [
    {
      title: "1. Kontrolluesi i të Dhënave",
      content: `Rent Ride, me adresë ${ADDRESS_LINE}, Shqipëri, është kontrollues i të dhënave personale sipas Ligjit Nr. 9887 "Për Mbrojtjen e të Dhënave Personale" dhe Rregullores (BE) 2016/679 (GDPR).

Mund të na kontaktoni për çdo pyetje mbi privatësinë në: info@rentride.al`,
    },
    {
      title: "2. Të Dhënat që Mbledhim",
      content: `Mbledhim katëgorite e mëposhtme të dhënash:

Të dhëna identifikimi:
• Emri dhe mbiemri i plotë
• Numri i kartës së identitetit ose pasaportës
• Data e lindjes dhe shtetësia
• Numri i patentës shoferi

Të dhëna kontakti:
• Adresa email
• Numri i telefonit (celular dhe fiks)
• Adresa e banimit (opsionale)

Të dhëna transaksionale:
• Historiku i rezervimeve
• Të dhënat e pagesës (ruhen nga procesori, jo direkt prej nesh)
• Depozitat e sigurisë

Të dhëna teknike (mbledhur automatikisht):
• Adresa IP dhe vendndodhja e përafërt (shteti) e nxjerrë prej saj
• Lloji i pajisjes, shfletuesit dhe sistemit operativ
• Koha dhe data e vizitës
• Faqet e vizituara (cookie analytics)

Kur bëni një rezervim, ruajmë gjithashtu shtetin që zgjidhni në formular dhe të dhënat teknike të mësipërme (IP, shtet, pajisje) bashkë me rezervimin. Këto përdoren vetëm për siguri, parandalim mashtrimi dhe verifikim të rezervimit — jo për qëllime marketingu.`,
    },
    {
      title: "3. Baza Ligjore e Procesimit",
      content: `I procesojmë të dhënat tuaja në bazë të:

• Ekzekutimit të kontratës: procesimi është i nevojshëm për konfirmimin dhe menaxhimin e rezervimit tuaj
• Detyrimi ligjor: detyrimeve tatimore dhe rregullative sipas ligjit shqiptar
• Interesi legjitim: parandalimi i mashtrimit, siguria e flotës
• Pëlqimit: marketingu me email (vetëm nëse keni dhënë konsentin)`,
    },
    {
      title: "4. Si i Përdorim të Dhënat",
      content: `Të dhënat tuaja përdoren vetëm për:

✓ Konfirmimin dhe menaxhimin e rezervimit
✓ Komunikimin para, gjatë dhe pas qirasë
✓ Lëshimin e faturave dhe dokumentacionit ligjor
✓ Raportimin tatimor te autoritetet shqiptare
✓ Parandalimin e mashtrimit dhe verifikimin e identitetit
✓ Përmirësimin e shërbimeve tona (vetëm të dhëna anonime/agregate)
✓ Dërgimin e ofertave speciale (vetëm me pëlqimin tuaj)

Të dhënat NUK shiten, nuk jepen me qira dhe nuk ndahen me palë të treta për qëllime marketingu.`,
    },
    {
      title: "5. Ndarja e të Dhënave me Palë të Treta",
      content: `Mund të ndajmë të dhënat tuaja vetëm me:

Ofruesit e shërbimit (kontraktues të ligjëzuar):
• Kompanitë e sigurimit (për raportimin e aksidenteve)
• Sistemi i pagesave / banka jonë (për transaksionet financiare)
• Platforma email (EmailJS) për dërgimin e konfirmimeve
• Shërbimi hosting i serverit (të dhëna enkriptuar)

Autoritetet ligjore:
• Autoriteti Tatimor (detyrim ligjor)
• Organe ligjzbatuese (vetëm me urdhër gjykate)

Të gjithë kontraktuesit tanë kanë marrëveshje mbrojtjeje të të dhënave dhe nuk mund t'i përdorin ato për qëllime të tjera.`,
    },
    {
      title: "6. Periudha e Ruajtjes",
      content: `I ruajmë të dhënat tuaja për periudhat e mëposhtme:

• Të dhënat e rezervimit dhe kontratës: 7 vjet (detyrim tatimor)
• Të dhënat e kontaktit të klientëve aktivë: gjatë gjithë marrëdhënies tregtare + 3 vjet
• Komunikime dhe email: 2 vjet
• Të dhënat teknike (IP, cookie): 13 muaj
• Fotot e dokumenteve: fshihen 30 ditë pas kthimit të mjetit

Pas skadimit të periudhës, të dhënat fshihen ose anonim izohen automatikisht.`,
    },
    {
      title: "7. Të Drejtat Tuaja (GDPR)",
      content: `Sipas GDPR, keni të drejtë të:

🔍 Aksesit: Të kërkoni një kopje të të dhënave tuaja personale
✏️ Korrigjimit: Të korrigjoni informacion të pasaktë
🗑️ Fshirjes ("right to be forgotten"): Të kërkoni fshirjen e të dhënave tuaja
🔒 Kufizimit: Të kufizoni procesimin e të dhënave tuaja
📦 Portabilitetit: Të merrni të dhënat tuaja në format të lexueshëm mashinë
❌ Kundërshtimit: Të kundërshtoni procesimin për marketing direkt

Për të ushtruar këto të drejta, dërgoni email tek: info@rentride.al

Do t'ju përgjigjemi brenda 30 ditëve. Nëse jeni të pakënaqur me përgjigjen, mund të ankoheni tek Komisioneri për të Drejtën e Informimit dhe Mbrojtjen e të Dhënave (KDIM): www.idp.al`,
    },
    {
      title: "8. Cookies dhe Teknologjitë e Gjurmimit",
      content: `Faqja jonë përdor cookie-t e mëposhtme:

Cookie-t e nevojshme (nuk mund të çaktivizohen):
• Sesioni i autentikimit
• Preferencat e gjuhës (i18next)
• Funksionimi i shportës së rezervimit

Cookie-t analytike (me pëlqimin tuaj):
• Google Analytics 4 — statistika anonime të vizitorëve
• Heatmap — analiza e navigimit (të dhëna agregate)

Mund të menaxhoni preferencat e cookie-ve nga shfletuesi juaj ose duke na kontaktuar direkt.`,
    },
    {
      title: "9. Siguria e të Dhënave",
      content: `Zbatojmë masa teknike dhe organizative të nivelit të lartë:

• Enkriptim SSL/TLS 256-bit për të gjithë komunikimin
• Autentifikim me dy faktorë (2FA) për stafin admin
• Access i bazuar në role — stafi ka akses vetëm tek të dhënat e nevojshme
• Monitorim i aksesit dhe log-e auditimi
• Bëkap i enkriptuar i bazës së të dhënave
• Trajnim i rregullt i stafit mbi privatësinë

Nëse zbulojmë një shkelje të sigurisë që rrezikon të drejtat tuaja, do t'ju njoftojmë brenda 72 orëve.`,
    },
    {
      title: "10. Ndryshimet e Politikës",
      content: `Mund ta përditësojmë këtë politikë herë pas here për të reflektuar ndryshimet ligjore ose operacionale. Data e "Hyrjes në fuqi" do të përditësohet. Për ndryshime substanciale, do t'ju njoftojmë me email.

Vazhdimi i përdorimit të shërbimeve tona pas ndryshimeve nënkupton pranimin e politikës së re të privatësisë.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <LLink to="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white no-underline mb-6 transition-colors">
            <ArrowLeft size={16} /> Kthehu në faqen kryesore
          </LLink>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Lock size={22} className="text-blue-400" weight="fill" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Dokumenti ligjor</p>
              <h1 className="text-2xl font-bold text-white mt-0.5">Politika e Privatësisë</h1>
            </div>
          </div>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Mbrojtja e privatësisë tuaj është prioritet i Rent Ride. Kjo politikë shpjegon si mbledhim, përdorim dhe mbrojmë të dhënat tuaja personale.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-neutral-500">
            <span>Hyrja në fuqi: 1 Janar 2024</span>
            <span>•</span>
            <span>Versioni: 2.0</span>
            <span>•</span>
            <span>Konforme me GDPR & Ligjin Nr.9887</span>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-blue-50 border-b border-blue-100 py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-600 mb-5">Rezymeja e privatësisë</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {highlights.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-blue-600" weight="fill" />
                </div>
                <p className="text-xs font-semibold text-neutral-800 mb-1">{title}</p>
                <p className="text-xs text-neutral-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Quick nav */}
        <div className="bg-neutral-50 border border-border rounded-xl p-5 mb-10">
          <p className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
            <Bell size={16} className="text-blue-600" /> Tabela e Përmbajtjes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sections.map((s, i) => (
              <a
                key={i}
                href={`#priv-${i}`}
                className="text-sm text-primary hover:underline no-underline py-0.5"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <div key={i} id={`priv-${i}`} className="scroll-mt-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3 flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {section.title.replace(/^\d+\. /, "")}
              </h2>
              <div className="text-sm text-neutral-700 leading-7 whitespace-pre-line pl-8">
                {section.content}
              </div>
              {i < sections.length - 1 && <hr className="mt-10 border-border" />}
            </div>
          ))}
        </div>

        <div className="mt-12 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-neutral-700">
            <strong>Kontakt DPO (Data Protection Officer):</strong>{" "}
            <a href="mailto:info@rentride.al" className="text-primary hover:underline no-underline">
              info@rentride.al
            </a>
            {" "}— Ankesa tek KDIM:{" "}
            <a href="https://www.idp.al" target="_blank" rel="noreferrer" className="text-primary hover:underline no-underline">
              www.idp.al
            </a>
          </p>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <LLink to="/termat-e-sherbimit" className="text-sm text-neutral-500 hover:text-primary no-underline transition-colors">
            → Kushtet e Shërbimit
          </LLink>
          <LLink to="/kontakt" className="text-sm text-neutral-500 hover:text-primary no-underline transition-colors">
            → Na Kontaktoni
          </LLink>
        </div>
      </div>
    </div>
  );
}
