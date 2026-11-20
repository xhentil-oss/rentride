import React from "react";
import LLink from "../components/LLink";
import {
  MapPin,
  Phone,
  EnvelopeSimple,
  Clock,
  WhatsappLogo,
  NavigationArrow,
  Buildings,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useSEO, buildLocalBusinessSchema, buildBreadcrumbSchema } from "../hooks/useSEO";
import { ADDRESS_LINE, NAP, CONTACT } from "../lib/seo";

type Office = {
  /** Translation keys (namespace "landing") for the office's visible texts. */
  badgeKey: string;
  nameKey: string;
  hoursKey: string;
  address: string;
  lat: number;
  lng: number;
  zoom: number;
  query: string;
  phone?: string;
  /** Exact Google Maps "pb" embed URL (no API key needed). Preferred when set. */
  embedSrc?: string;
};

const OFFICES: Office[] = [
  {
    badgeKey: "offices.office.badge",
    nameKey: "offices.office.name",
    hoursKey: "offices.office.hours",
    address: ADDRESS_LINE,
    lat: Number(NAP.latitude),
    lng: Number(NAP.longitude),
    zoom: 15,
    query: `Rent Ride, ${ADDRESS_LINE}`,
    phone: CONTACT.phone,
    // Built from the address instead of a baked-in Google place ID: the previous
    // hardcoded embed pinned a *different* company's listing, which both misled
    // visitors and tied this page's local signals to another brand's entity.
    embedSrc: `https://www.google.com/maps?q=${encodeURIComponent(`Rent Ride, ${ADDRESS_LINE}`)}&z=15&output=embed`,
  },
];

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

function getEmbedSrc(office: Office): string {
  if (office.embedSrc) return office.embedSrc;
  if (GOOGLE_MAPS_KEY) {
    const q = encodeURIComponent(office.query);
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${q}&center=${office.lat},${office.lng}&zoom=${office.zoom}`;
  }
  // Fallback: OpenStreetMap (no API key, no embed restrictions).
  const delta = 0.015;
  const bbox = [office.lng - delta, office.lat - delta, office.lng + delta, office.lat + delta].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${office.lat}%2C${office.lng}`;
}

function getDirectionsUrl(office: Office): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}`;
}

export default function OfficesPage() {
  const { t } = useTranslation("landing");

  useSEO({
    title: t("offices.seo.title"),
    description: t("offices.seo.description", { address: ADDRESS_LINE }),
    keywords: t("offices.seo.keywords"),
    canonical: "/zyrat",
    structuredData: [
      buildLocalBusinessSchema(),
      buildBreadcrumbSchema([
        { name: t("offices.breadcrumb.home"), url: "/" },
        { name: t("offices.breadcrumb.current"), url: "/zyrat" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold mb-5">
            <Buildings size={14} weight="fill" />
            {t("offices.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t("offices.hero.title")}
          </h1>
          <p className="text-neutral-300 text-lg max-w-xl mx-auto">
            {t("offices.hero.intro")}
          </p>
        </div>
      </div>

      {/* Office cards with maps */}
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto">
          {OFFICES.map((office) => (
            <article
              key={office.address}
              className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-neutral-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
                    <MapPin size={12} weight="fill" />
                    {t(office.badgeKey)}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-neutral-800 mb-1">{t(office.nameKey)}</h2>
                <p className="text-sm text-neutral-600">{office.address}</p>
              </div>

              {/* Map */}
              <div className="h-72 bg-neutral-100">
                <iframe
                  title={t(office.nameKey)}
                  src={getEmbedSrc(office)}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Info */}
              <div className="px-6 py-5 space-y-3 border-t border-neutral-100">
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} weight="fill" className="text-primary shrink-0" />
                  <span className="text-neutral-700">{t(office.hoursKey)}</span>
                </div>
                {office.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} weight="fill" className="text-primary shrink-0" />
                    <a
                      href={`tel:${office.phone}`}
                      className="text-neutral-700 hover:text-primary no-underline"
                    >
                      {office.phone.replace("+355", "+355 ").replace(/(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3")}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                <a
                  href={getDirectionsUrl(office)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors no-underline"
                >
                  <NavigationArrow size={14} weight="fill" />
                  {t("offices.actions.directions")}
                </a>
                {office.phone && (
                  <a
                    href={`https://wa.me/${office.phone.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors no-underline"
                    aria-label={t("offices.actions.whatsappAriaLabel")}
                  >
                    <WhatsappLogo size={16} weight="fill" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h3 className="text-lg font-bold text-neutral-800 mb-1.5">{t("offices.contactCta.title")}</h3>
            <p className="text-sm text-neutral-500">
              {t("offices.contactCta.text")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LLink
              to="/kontakt"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors no-underline"
            >
              <EnvelopeSimple size={15} weight="fill" />
              {t("offices.contactCta.button")}
            </LLink>
            <a
              href="tel:+355698145803"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors no-underline"
            >
              <Phone size={15} weight="fill" />
              +355 69 81 45 803
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
