import React from "react";
import LLink from "./LLink";
import { useTranslation } from "react-i18next";
import { Car, FacebookLogo, InstagramLogo, MapPin, Phone, EnvelopeSimple } from "@phosphor-icons/react";
import { useSiteLogo } from "../hooks/useSiteLogo";

function Footer() {
  const { t } = useTranslation();
  const logoUrl = useSiteLogo();
  const addresses = (t("footer.addresses", { returnObjects: true }) as string[] | string);
  const addressList = Array.isArray(addresses)
    ? addresses
    : String(addresses).split("|").map((s) => s.trim()).filter(Boolean);

  return (
    <footer className="bg-navy text-white py-14 px-6">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <LLink to="/" className="flex items-center gap-2 no-underline mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Rent Ride" className="h-10 w-auto max-w-[200px] object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 rounded-md bg-gradient-primary flex items-center justify-center shrink-0">
                    <Car size={20} weight="fill" className="text-white" />
                  </div>
                  <span className="font-semibold text-lg text-white">Rent <span className="text-accent">Ride</span></span>
                </>
              )}
            </LLink>
            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors no-underline">
                <FacebookLogo size={16} className="text-white" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors no-underline">
                <InstagramLogo size={16} className="text-white" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">{t("footer.navigation")}</h3>
            <ul className="space-y-2.5">
              {[
                { label: t("footer.nav.fleet"), to: "/flota" },
                { label: t("footer.nav.book"), to: "/rezervo" },
                { label: t("footer.nav.reviews"), to: "/vleresime" },
                { label: t("footer.nav.account"), to: "/llogaria" },
                { label: "Blog", to: "/blog" },
                { label: t("footer.nav.sitemap"), to: "/sitemap" },
                { label: "Zyrat tona", to: "/zyrat" },
                { label: "Kontakt", to: "/kontakt" },
              ].map((l) => (
                <li key={l.to}>
                  <LLink to={l.to} className="text-sm text-neutral-400 hover:text-white transition-colors no-underline">{l.label}</LLink>
                </li>
              ))}
            </ul>
          </div>

          {/* SEO pages */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">{t("footer.services")}</h3>
            <ul className="space-y-2.5">
              {[
                { label: t("footer.seo.tirana"), to: "/makina-me-qira-tirane" },
                { label: t("footer.seo.airport"), to: "/makine-me-qira-aeroport" },
                { label: t("footer.seo.suv"), to: "/flota?kategoria=SUV" },
                { label: t("footer.seo.luxury"), to: "/flota?kategoria=Luksoze" },
                { label: t("footer.seo.automatic"), to: "/flota?transmetimi=Automatike" },
              ].map((l) => (
                <li key={l.to}>
                  <LLink to={l.to} className="text-sm text-neutral-400 hover:text-white transition-colors no-underline">{l.label}</LLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">{t("footer.contactTitle")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                {/* min-w-0 lets the address wrap instead of overflowing the
                    column — it is a flex item, which defaults to min-width:auto. */}
                <div className="text-sm text-neutral-400 space-y-1 min-w-0">
                  {addressList.map((addr, i) => (
                    <p key={i} className="leading-snug">{addr}</p>
                  ))}
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-neutral-400 shrink-0" />
                <a href="tel:+355698145803" className="text-sm text-neutral-400 hover:text-white no-underline">+355 69 81 45 803</a>
              </li>
              <li className="flex items-center gap-3">
                <EnvelopeSimple size={16} className="text-neutral-400 shrink-0" />
                <a href="mailto:info@rentride.al" className="text-sm text-neutral-400 hover:text-white no-underline">{t("footer.email")}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust + Payment strip */}
        <div className="border-t border-white/10 pt-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Google Reviews badge */}
              <a href="https://g.co/kgs/rentride" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 no-underline group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill="#FBBF24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
                  <span className="font-semibold text-neutral-200">4.9</span> Google Reviews
                </span>
              </a>
              {/* Trustpilot-style badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <div key={s} className="w-4 h-4 bg-[#00b67a] flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-200">Excellent</span> {t("footer.trustRating")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 mr-1">{t("footer.accepts")}</span>
              {["VISA", "MC", "Cash", "Bank"].map((m) => (
                <span key={m} className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-semibold text-neutral-200">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">© {new Date().getFullYear()} Rent Ride. {t("footer.rights")}</p>
          <div className="flex gap-4">
            <LLink to="/privatesie" className="text-xs text-neutral-500 hover:text-neutral-300 no-underline">{t("footer.privacy")}</LLink>
            <LLink to="/termat-e-sherbimit" className="text-xs text-neutral-500 hover:text-neutral-300 no-underline">{t("footer.terms")}</LLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default React.memo(Footer);
