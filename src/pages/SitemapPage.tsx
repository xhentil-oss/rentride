import React, { useMemo } from "react";
import LLink from "../components/LLink";
import { useQuery } from "../hooks/useApi";
import { useSEO } from "../hooks/useSEO";
import {
  SitemapLogo,
  DownloadSimple,
  Globe,
  Car,
  CalendarBlank,
  ArrowSquareOut,
  CheckCircle,
  Spinner,
} from "@phosphor-icons/react";
import Footer from "../components/Footer";

const BASE_URL = "https://rentride.al";
const TODAY = new Date().toISOString().split("T")[0];

const STATIC_PAGES = [
  { path: "/", label: "Kryefaqja", priority: "1.0", changefreq: "weekly", section: "Kryesore" },
  { path: "/flota", label: "Flota jonë", priority: "0.9", changefreq: "weekly", section: "Kryesore" },
  { path: "/rezervo", label: "Rezervo tani", priority: "0.8", changefreq: "monthly", section: "Kryesore" },
  { path: "/vleresime", label: "Vlerësimet", priority: "0.7", changefreq: "weekly", section: "Kryesore" },
  { path: "/llogaria", label: "Llogaria ime", priority: "0.4", changefreq: "monthly", section: "Kryesore" },
  { path: "/blog", label: "Blog", priority: "0.8", changefreq: "weekly", section: "Kryesore" },
  { path: "/kontakt", label: "Kontakt", priority: "0.6", changefreq: "monthly", section: "Kryesore" },
  { path: "/makina-me-qira-tirane", label: "Makina me qira Tiranë", priority: "0.95", changefreq: "weekly", section: "SEO" },
  { path: "/makine-me-qira-aeroport", label: "Makinë me qira Aeroport", priority: "0.9", changefreq: "monthly", section: "SEO" },
  { path: "/makina-suv-me-qira", label: "Makina SUV me qira", priority: "0.85", changefreq: "monthly", section: "SEO" },
  { path: "/makina-automatike-me-qira", label: "Makina Automatike me qira", priority: "0.85", changefreq: "monthly", section: "SEO" },
  { path: "/makina-luksoze-me-qira", label: "Makina Luksoze me qira", priority: "0.85", changefreq: "monthly", section: "SEO" },
  { path: "/sitemap", label: "Harta e faqes", priority: "0.3", changefreq: "monthly", section: "Kryesore" },
  { path: "/termat-e-sherbimit", label: "Termat e Shërbimit", priority: "0.3", changefreq: "yearly", section: "Legal" },
  { path: "/privatesie", label: "Politika e Privatësisë", priority: "0.3", changefreq: "yearly", section: "Legal" },
];

function priorityColor(p: string) {
  const v = parseFloat(p);
  if (v >= 0.9) return "bg-green-100 text-green-700";
  if (v >= 0.7) return "bg-blue-100 text-blue-700";
  if (v >= 0.5) return "bg-yellow-100 text-yellow-700";
  return "bg-neutral-100 text-neutral-500";
}

export default function SitemapPage() {
  useSEO({
    title: "Harta e Faqes (Sitemap) — Rent Ride",
    description: "Lista e plotë e të gjitha faqeve të Rent Ride. Sitemap dinamik me të gjitha makinat dhe faqet SEO.",
    canonical: "/sitemap",
  });

  const { data: allCars, isPending } = useQuery("Car");

  // Deduplicate cars by slug (DB has duplicates)
  const uniqueCars = useMemo(() => {
    if (!allCars) return [];
    const seen = new Set<string>();
    return allCars.filter((car) => {
      if (seen.has(car.slug)) return false;
      seen.add(car.slug);
      return true;
    });
  }, [allCars]);

  const carPages = useMemo(() =>
    uniqueCars.map((car) => ({
      path: `/makina/${car.slug}`,
      label: `${car.brand} ${car.model} ${car.year}`,
      priority: "0.8",
      changefreq: "weekly",
      section: "Makinat",
      lastmod: new Date(car.updatedAt).toISOString().split("T")[0],
    })),
  [uniqueCars]);

  const allPages = useMemo(() => [
    ...STATIC_PAGES.map((p) => ({ ...p, lastmod: TODAY })),
    ...carPages,
  ], [carPages]);

  // XML download generator
  const handleDownloadXML = () => {
    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      "",
      "  <!-- Faqet statike -->",
      ...STATIC_PAGES.map((p) => `  <url>\n    <loc>${BASE_URL}${p.path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`),
      "",
      "  <!-- Makinat (gjeneruar dinamikisht) -->",
      ...carPages.map((p) => `  <url>\n    <loc>${BASE_URL}${p.path}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.80</priority>\n  </url>`),
      "",
      "</urlset>",
    ];

    const blob = new Blob([xmlLines.join("\n")], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sections = ["Kryesore", "SEO", "Legal", "Makinat"];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <section className="bg-gradient-to-br from-neutral-900 to-neutral-800 py-14 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
                  <Globe size={18} weight="regular" className="text-primary" />
                </div>
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                  Sitemap Dinamik
                </span>
              </div>
              <h1 className="text-3xl font-semibold text-white mb-2">
                Harta e Faqes
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-lg">
                Lista e plotë e të gjitha URL-ve të <strong className="text-white">rentride.al</strong>.
                Makinat ngarkohen automatikisht nga databaza — çdo makinë e re shfaqet këtu menjëherë.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-white">{allPages.length}</p>
                <p className="text-xs text-neutral-400 mt-0.5">URL total</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-primary">{uniqueCars.length}</p>
                <p className="text-xs text-neutral-400 mt-0.5">Makina</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-accent">5</p>
                <p className="text-xs text-neutral-400 mt-0.5">Faqe SEO</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleDownloadXML}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <DownloadSimple size={16} weight="bold" />
              Shkarko sitemap.xml
            </button>
            <a
              href={`${BASE_URL}/sitemap.xml`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors no-underline"
            >
              <ArrowSquareOut size={16} weight="regular" />
              sitemap.xml live
            </a>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6">
        <div className="max-w-[1000px] mx-auto space-y-10">

          {isPending && (
            <div className="flex items-center gap-3 text-sm text-neutral-500 bg-neutral-50 border border-border rounded-lg px-4 py-3">
              <Spinner size={16} className="animate-spin text-primary" />
              Duke ngarkuar makinat nga databaza...
            </div>
          )}

          {sections.map((section) => {
            const pages = allPages.filter((p) => p.section === section);
            if (pages.length === 0) return null;
            return (
              <div key={section}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-md bg-azure flex items-center justify-center">
                    {section === "Makinat" ? (
                      <Car size={14} weight="regular" className="text-primary" />
                    ) : (
                      <Globe size={14} weight="regular" className="text-primary" />
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    {section === "Kryesore" && "Faqet kryesore"}
                    {section === "SEO" && "Landing pages SEO"}
                    {section === "Makinat" && `Makinat (${pages.length} URL)`}
                  </h2>
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {pages.length} URL
                  </span>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-azure border-b border-border">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Faqja</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden md:table-cell">URL</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Prioriteti</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden sm:table-cell">Freq</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden lg:table-cell">Lastmod</th>
                        <th className="px-3 py-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((page, i) => (
                        <tr
                          key={page.path}
                          className={`border-b border-border last:border-0 hover:bg-neutral-50 transition-colors ${i % 2 === 0 ? "" : "bg-neutral-50/50"}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={14} weight="fill" className="text-green-500 shrink-0" />
                              <LLink
                                to={page.path}
                                className="text-sm font-medium text-neutral-800 hover:text-primary transition-colors no-underline"
                              >
                                {page.label}
                              </LLink>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-neutral-400 font-mono">
                              {BASE_URL}{page.path}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColor(page.priority)}`}>
                              {page.priority}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            <span className="text-xs text-neutral-500 capitalize">{page.changefreq}</span>
                          </td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell">
                            <span className="text-xs text-neutral-400 flex items-center justify-end gap-1">
                              <CalendarBlank size={12} weight="regular" />
                              {(page as any).lastmod ?? TODAY}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <LLink
                              to={page.path}
                              className="text-neutral-300 hover:text-primary transition-colors"
                              title="Hap faqen"
                            >
                              <ArrowSquareOut size={14} weight="regular" />
                            </LLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">ℹ️ Si funksionon sitemap-i dinamik?</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Seksioni <strong>"Makinat"</strong> gjenerohet automatikisht nga databaza e live — çdo here që shtoni një makinë të re në admin, ajo shfaqet automatikisht këtu.
              Butoni <strong>"Shkarko sitemap.xml"</strong> gjeneron XML-in me të gjitha URL-të aktuale dhe e shkarkon në kompjuterin tuaj, gati për t'u ngarkuar te Google Search Console.
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
