export const LANGS = ["sq", "en", "fr", "es", "it", "de", "pl", "cs", "he"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "sq";

// Localized slugs per Albanian path. Albanian is the canonical/default.
// Non-SQ languages live under `/<lang>/...` prefix with translated slugs.
type LangSlugs = Record<Lang, string>;

const SLUGS: Record<string, LangSlugs> = {
  "/":                          { sq: "/",                          en: "/en",                       fr: "/fr",                       es: "/es",                       it: "/it", de: "/de", pl: "/pl", cs: "/cs", he: "/he" },
  "/flota":                     { sq: "/flota",                     en: "/en/fleet",                 fr: "/fr/flotte",                es: "/es/flota",                 it: "/it/flotta", de: "/de/flotte", pl: "/pl/flota", cs: "/cs/vozovy-park", he: "/he/fleet" },
  "/rezervo":                   { sq: "/rezervo",                   en: "/en/book",                  fr: "/fr/reserver",              es: "/es/reservar",              it: "/it/prenota", de: "/de/buchen", pl: "/pl/rezerwacja", cs: "/cs/rezervace", he: "/he/book" },
  "/faleminderit":              { sq: "/faleminderit",              en: "/en/thank-you",             fr: "/fr/merci",                 es: "/es/gracias",               it: "/it/grazie", de: "/de/danke", pl: "/pl/dziekujemy", cs: "/cs/dekujeme", he: "/he/thank-you" },
  "/llogaria":                  { sq: "/llogaria",                  en: "/en/my-account",            fr: "/fr/mon-compte",            es: "/es/mi-cuenta",             it: "/it/account", de: "/de/mein-konto", pl: "/pl/moje-konto", cs: "/cs/muj-ucet", he: "/he/my-account" },
  "/vleresime":                 { sq: "/vleresime",                 en: "/en/reviews",               fr: "/fr/avis",                  es: "/es/opiniones",             it: "/it/recensioni", de: "/de/bewertungen", pl: "/pl/opinie", cs: "/cs/recenze", he: "/he/reviews" },
  "/makina-me-qira-tirane":     { sq: "/makina-me-qira-tirane",     en: "/en/car-rental-tirana",     fr: "/fr/location-voiture-tirana", es: "/es/alquiler-coches-tirana", it: "/it/noleggio-auto-tirana", de: "/de/mietwagen-tirana", pl: "/pl/wynajem-samochodow-tirana", cs: "/cs/pujcovna-aut-tirana", he: "/he/car-rental-tirana" },
  "/makine-me-qira-aeroport":   { sq: "/makine-me-qira-aeroport",   en: "/en/airport-car-rental",    fr: "/fr/location-aeroport",     es: "/es/alquiler-aeropuerto",   it: "/it/noleggio-aeroporto", de: "/de/mietwagen-flughafen", pl: "/pl/wynajem-samochodow-lotnisko", cs: "/cs/pujcovna-aut-letiste", he: "/he/airport-car-rental" },
  "/makina-suv-me-qira":        { sq: "/makina-suv-me-qira",        en: "/en/suv-car-rental",        fr: "/fr/location-suv",          es: "/es/alquiler-suv",          it: "/it/noleggio-suv", de: "/de/suv-mieten", pl: "/pl/wynajem-suv", cs: "/cs/pronajem-suv", he: "/he/suv-car-rental" },
  "/makina-automatike-me-qira": { sq: "/makina-automatike-me-qira", en: "/en/automatic-car-rental",  fr: "/fr/location-automatique",  es: "/es/alquiler-automatico",   it: "/it/noleggio-automatico", de: "/de/automatik-mietwagen", pl: "/pl/wynajem-automat", cs: "/cs/pronajem-automat", he: "/he/automatic-car-rental" },
  "/makina-luksoze-me-qira":    { sq: "/makina-luksoze-me-qira",    en: "/en/luxury-car-rental",     fr: "/fr/location-luxe",         es: "/es/alquiler-lujo",         it: "/it/noleggio-lusso", de: "/de/luxus-mietwagen", pl: "/pl/wynajem-luksusowych-samochodow", cs: "/cs/pronajem-luxusnich-aut", he: "/he/luxury-car-rental" },
  "/sitemap":                   { sq: "/sitemap",                   en: "/en/sitemap",               fr: "/fr/sitemap",               es: "/es/sitemap",               it: "/it/sitemap", de: "/de/sitemap", pl: "/pl/sitemap", cs: "/cs/sitemap", he: "/he/sitemap" },
  "/kontakt":                   { sq: "/kontakt",                   en: "/en/contact",               fr: "/fr/contact",               es: "/es/contacto",              it: "/it/contatti", de: "/de/kontakt", pl: "/pl/kontakt", cs: "/cs/kontakt", he: "/he/contact" },
  "/zyrat":                     { sq: "/zyrat",                     en: "/en/offices",               fr: "/fr/bureaux",               es: "/es/oficinas",              it: "/it/uffici", de: "/de/standorte", pl: "/pl/biura", cs: "/cs/pobocky", he: "/he/offices" },
  "/termat-e-sherbimit":        { sq: "/termat-e-sherbimit",        en: "/en/terms",                 fr: "/fr/conditions",            es: "/es/terminos",              it: "/it/termini", de: "/de/agb", pl: "/pl/regulamin", cs: "/cs/obchodni-podminky", he: "/he/terms" },
  "/privatesie":                { sq: "/privatesie",                en: "/en/privacy",               fr: "/fr/confidentialite",       es: "/es/privacidad",            it: "/it/privacy", de: "/de/datenschutz", pl: "/pl/polityka-prywatnosci", cs: "/cs/ochrana-osobnich-udaju", he: "/he/privacy" },
  "/blog":                      { sq: "/blog",                      en: "/en/blog",                  fr: "/fr/blog",                  es: "/es/blog",                  it: "/it/blog", de: "/de/blog", pl: "/pl/blog", cs: "/cs/blog", he: "/he/blog" },
};

// Reverse lookup: any localized path → canonical SQ path
const PATH_TO_SQ: Record<string, string> = {};
for (const [sq, langs] of Object.entries(SLUGS)) {
  for (const path of Object.values(langs)) {
    PATH_TO_SQ[path] = sq;
  }
}

// Dynamic prefix pairs: [sqPrefix, { lang: prefix }]
const DYNAMIC_PREFIXES: { sq: string; langs: Record<Lang, string> }[] = [
  {
    sq: "/makina/",
    langs: { sq: "/makina/", en: "/en/car/", fr: "/fr/voiture/", es: "/es/coche/", it: "/it/auto/", de: "/de/auto/", pl: "/pl/samochod/", cs: "/cs/auto/", he: "/he/car/" },
  },
  {
    sq: "/blog/",
    langs: { sq: "/blog/", en: "/en/blog/", fr: "/fr/blog/", es: "/es/blog/", it: "/it/blog/", de: "/de/blog/", pl: "/pl/blog/", cs: "/cs/blog/", he: "/he/blog/" },
  },
];

/** Detect language from pathname */
export function detectLang(pathname: string): Lang {
  for (const lang of LANGS) {
    if (lang === "sq") continue;
    if (pathname === `/${lang}` || pathname.startsWith(`/${lang}/`)) return lang;
  }
  return "sq";
}

/** Right-to-left languages (drives <html dir> and printed documents). */
export const RTL_LANGS: readonly Lang[] = ["he"];
export const isRtl = (lang: string): boolean => (RTL_LANGS as readonly string[]).includes(lang);

/** Translate an Albanian (canonical) path to the target language. Admin paths pass through. */
export function localePath(sqPath: string, lang: Lang): string {
  if (lang === "sq") return sqPath;
  if (sqPath.startsWith("/admin")) return sqPath;

  const [pathname, ...rest] = sqPath.split("?");
  const qs = rest.length ? "?" + rest.join("?") : "";

  // Exact match
  if (SLUGS[pathname]) return SLUGS[pathname][lang] + qs;

  // Dynamic prefix match
  for (const { sq: sqPfx, langs } of DYNAMIC_PREFIXES) {
    if (pathname.startsWith(sqPfx)) {
      return langs[lang] + pathname.slice(sqPfx.length) + qs;
    }
  }

  // Fallback: prepend /<lang>
  return `/${lang}` + sqPath;
}

/** Convert any path (any lang) to the target language */
export function switchPath(currentPath: string, fromLang: Lang, toLang: Lang): string {
  if (fromLang === toLang) return currentPath;

  const [pathname, ...rest] = currentPath.split("?");
  const qs = rest.length ? "?" + rest.join("?") : "";

  // First convert to canonical SQ path
  let sqPath = pathname;
  if (fromLang !== "sq") {
    if (PATH_TO_SQ[pathname]) {
      sqPath = PATH_TO_SQ[pathname];
    } else {
      // Try dynamic prefixes
      let matched = false;
      for (const { sq: sqPfx, langs } of DYNAMIC_PREFIXES) {
        const pfx = langs[fromLang];
        if (pfx && pathname.startsWith(pfx)) {
          sqPath = sqPfx + pathname.slice(pfx.length);
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Unknown route — strip /<lang> prefix
        sqPath = pathname.replace(new RegExp(`^/${fromLang}`), "") || "/";
      }
    }
  }

  if (toLang === "sq") return sqPath + qs;
  return localePath(sqPath + qs, toLang);
}

/** Get all language alternates for hreflang */
export function getAllAlternates(pathname: string, lang: Lang): Record<Lang, string> {
  const sqPath = lang === "sq" ? pathname : switchPath(pathname, lang, "sq");
  const out: Record<Lang, string> = {} as Record<Lang, string>;
  for (const l of LANGS) {
    out[l] = l === "sq" ? sqPath : localePath(sqPath, l);
  }
  return out;
}

/** Backward-compatible: only SQ + EN. Prefer getAllAlternates. */
export function getAlternatePath(pathname: string, lang: Lang): { sq: string; en: string } {
  const all = getAllAlternates(pathname, lang);
  return { sq: all.sq, en: all.en };
}
