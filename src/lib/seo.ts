/**
 * Rent Ride — single source of truth for brand identity + structured data.
 *
 * ⚠️  READ BEFORE EDITING
 * Several rental brands run on this same codebase. Every value in this file is a
 * signal Google uses to tell those brands apart as *separate business entities*.
 * If two of them share the same address, geo coordinates, phone, OG image or
 * schema `@id`, Google clusters them into one entity and suppresses all but one
 * in local + organic results. Never copy values across brands.
 *
 * The structured data below is emitted as a single connected `@graph` (see
 * `buildSiteGraph`) with stable `@id` URIs, rather than as a pile of
 * disconnected LocalBusiness blobs. That is what lets Google resolve
 * Organization → WebSite → AutoRental → WebPage → Product as one knowledge
 * subgraph for this domain only.
 */

export const SITE_URL = "https://rentride.al";
export const SITE_NAME = "Rent Ride";
export const SITE_LEGAL_NAME = "Rent Ride";

/** Contact channels — keep in sync with admin Settings → company_* keys. */
export const CONTACT = {
  email: "info@rentride.al",
  phone: "+355698145803",
  /** E.164, digits only — used for wa.me links. */
  whatsapp: "355698145803",
} as const;

/**
 * NAP (Name / Address / Phone) — the local-SEO fingerprint of this brand.
 * Must match the Google Business Profile character for character.
 *
 * ⚠️  The coordinates below are still the generic Rinas/airport point that a
 * sibling brand on this codebase also uses. The street address now differs,
 * which removes most of the duplicate-entity risk, but identical lat/lng across
 * two rental businesses still weakens both in the local pack. Replace with the
 * exact pin of the Rent Ride counter (Google Maps → right-click the pin).
 */
export const NAP = {
  streetAddress: "Rruga e Aeroportit, Nd. 8",
  addressLocality: "Rinas",
  addressRegion: "Tiranë",
  postalCode: "1054",
  addressCountry: "AL",
  latitude: "41.4162848",
  longitude: "19.709965",
} as const;

/** Human-readable one-line address for UI copy. Derived so it can't drift. */
export const ADDRESS_LINE = `${NAP.streetAddress}, ${NAP.addressLocality} ${NAP.postalCode}, ${NAP.addressRegion}`;

/**
 * Public brand profiles. Only list profiles that actually exist and are live.
 *
 * The `kgmid` entry is Rent Ride's Google Knowledge Graph entity — it lets
 * Google reconcile this domain with the right Business Profile instead of
 * guessing between the brands that share this codebase.
 */
export const SOCIAL_PROFILES: string[] = [
  `https://wa.me/${CONTACT.whatsapp}`,
  "https://www.google.com/search?kgmid=/g/11s33pp4rs",
];

/**
 * Default social share image, 1200×630.
 *
 * ⚠️  Deliberately NOT the stock photo the sibling brands use — an identical
 * og:image across domains is a near-duplicate signal and makes every share
 * look like the same company. Replace with a branded 1200×630 asset (logo +
 * value proposition baked in) served from this domain as soon as one exists,
 * e.g. `${SITE_URL}/og/rent-ride-1200x630.jpg`.
 */
export const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&h=630&fit=crop&q=80";
export const DEFAULT_OG_IMAGE_ALT =
  "Makina me qira Rent Ride — flotë moderne në Tiranë dhe Aeroportin Nënë Tereza";

/** Brand logo used by Organization schema (must be on-domain and reachable). */
export const LOGO_URL = `${SITE_URL}/logo-rent-ride.svg`;

export const OG_LOCALE: Record<string, string> = {
  sq: "sq_AL",
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
  it: "it_IT",
};

/** Stable schema entity identifiers — the backbone of the @graph. */
export const ID = {
  organization: `${SITE_URL}/#organization`,
  website: `${SITE_URL}/#website`,
  business: `${SITE_URL}/#autorental`,
  logo: `${SITE_URL}/#logo`,
  place: `${SITE_URL}/#place`,
} as const;

export type Rating = { value: number; count: number };

/** Only emit aggregateRating when it is backed by real review data. */
function ratingNode(rating?: Rating | null) {
  if (!rating || !(rating.count > 0) || !(rating.value > 0)) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: Number(rating.value).toFixed(1),
    reviewCount: rating.count,
    bestRating: "5",
    worstRating: "1",
  };
}

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: NAP.streetAddress,
  addressLocality: NAP.addressLocality,
  addressRegion: NAP.addressRegion,
  postalCode: NAP.postalCode,
  addressCountry: NAP.addressCountry,
};

/**
 * The rental service catalogue. `AutoRental` + `hasOfferCatalog` is what makes
 * Google understand *what* is rented, not just that a business exists here.
 */
const offerCatalog = {
  "@type": "OfferCatalog",
  name: "Kategoritë e makinave me qira — Rent Ride",
  itemListElement: [
    { name: "Makina ekonomike me qira", url: `${SITE_URL}/flota` },
    { name: "SUV me qira", url: `${SITE_URL}/makina-suv-me-qira` },
    { name: "Makina automatike me qira", url: `${SITE_URL}/makina-automatike-me-qira` },
    { name: "Makina luksoze me qira", url: `${SITE_URL}/makina-luksoze-me-qira` },
    { name: "Makinë me qira në aeroport", url: `${SITE_URL}/makine-me-qira-aeroport` },
  ].map((c) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: c.name, serviceType: "Car rental" },
    url: c.url,
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
  })),
};

export const buildOrganizationSchema = () => ({
  "@type": "Organization",
  "@id": ID.organization,
  name: SITE_NAME,
  legalName: SITE_LEGAL_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", "@id": ID.logo, url: LOGO_URL, contentUrl: LOGO_URL },
  image: { "@id": ID.logo },
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: postalAddress,
  sameAs: SOCIAL_PROFILES,
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: CONTACT.phone,
      email: CONTACT.email,
      contactType: "customer service",
      areaServed: "AL",
      availableLanguage: ["sq", "en", "it", "fr", "es"],
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    },
  ],
});

export const buildWebSiteSchema = () => ({
  "@type": "WebSite",
  "@id": ID.website,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { "@id": ID.organization },
  inLanguage: ["sq", "en", "fr", "es", "it"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/flota?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

/**
 * `AutoRental` is a first-class schema.org type for car-rental businesses and a
 * far stronger signal than the generic `LocalBusiness` the sibling brands emit.
 */
export const buildAutoRentalSchema = (opts: { rating?: Rating | null } = {}) => {
  const node: Record<string, any> = {
    "@type": "AutoRental",
    "@id": ID.business,
    name: SITE_NAME,
    description:
      "Rent Ride jep makina me qira në Tiranë dhe Aeroportin Ndërkombëtar Nënë Tereza, me dorëzim pa pagesë, çmime të deklaruara paraprakisht dhe asistencë 24/7.",
    url: SITE_URL,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    address: postalAddress,
    geo: {
      "@type": "GeoCoordinates",
      latitude: NAP.latitude,
      longitude: NAP.longitude,
    },
    parentOrganization: { "@id": ID.organization },
    image: { "@id": ID.logo },
    priceRange: "€€",
    currenciesAccepted: "EUR, ALL",
    paymentAccepted: "Cash, Credit Card, Debit Card",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    ],
    areaServed: [
      { "@type": "City", name: "Tiranë" },
      { "@type": "City", name: "Durrës" },
      { "@type": "City", name: "Vlorë" },
      { "@type": "City", name: "Sarandë" },
      { "@type": "City", name: "Shkodër" },
      { "@type": "Country", name: "Shqipëri" },
    ],
    availableLanguage: ["sq", "en", "it", "fr", "es"],
    hasOfferCatalog: offerCatalog,
    hasMap: `https://www.google.com/maps/search/?api=1&query=${NAP.latitude},${NAP.longitude}`,
    sameAs: SOCIAL_PROFILES,
  };
  const ar = ratingNode(opts.rating);
  if (ar) node.aggregateRating = ar;
  return node;
};

/**
 * Site-wide entity graph. Emitted once, statically, in index.html — page-level
 * nodes reference these by `@id` instead of repeating them.
 */
export const buildSiteGraph = (opts: { rating?: Rating | null } = {}) => ({
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationSchema(),
    buildWebSiteSchema(),
    buildAutoRentalSchema(opts),
  ],
});

/** WebPage node tying a URL back to the site graph. */
export const buildWebPageSchema = ({
  url,
  name,
  description,
  lang,
  primaryImage,
  breadcrumbId,
}: {
  url: string;
  name: string;
  description: string;
  lang: string;
  primaryImage?: string;
  breadcrumbId?: string;
}) => {
  const node: Record<string, any> = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: lang,
    isPartOf: { "@id": ID.website },
    about: { "@id": ID.business },
    publisher: { "@id": ID.organization },
  };
  if (primaryImage) {
    node.primaryImageOfPage = { "@type": "ImageObject", url: primaryImage };
  }
  if (breadcrumbId) node.breadcrumb = { "@id": breadcrumbId };
  return node;
};

export const buildBreadcrumbSchema = (
  crumbs: { name: string; url: string }[],
  pageUrl?: string,
) => ({
  "@type": "BreadcrumbList",
  "@id": `${pageUrl ?? SITE_URL}#breadcrumb`,
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: c.url.startsWith("http") ? c.url : `${SITE_URL}${c.url}`,
  })),
});

export const buildFAQSchema = (items: { question: string; answer: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

/** Car listing → `ItemList`, eligible for Google's carousel rich result. */
export const buildItemListSchema = ({
  name,
  items,
}: {
  name: string;
  items: { name: string; url: string; image?: string; price?: number }[];
}) => ({
  "@type": "ItemList",
  name,
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Product",
      name: it.name,
      url: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
      ...(it.image ? { image: it.image } : {}),
      ...(it.price
        ? {
            offers: {
              "@type": "Offer",
              price: it.price,
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
            },
          }
        : {}),
    },
  })),
});

export const buildCarProductSchema = (car: {
  brand: string;
  model: string;
  year: number;
  category: string;
  pricePerDay: number;
  image: string;
  slug: string;
  fuel: string;
  transmission: string;
  seats: number;
  /** Real review data only — omit rather than inventing a rating. */
  rating?: Rating | null;
}) => {
  const url = `${SITE_URL}/makina/${car.slug}`;
  const schema: Record<string, any> = {
    "@type": ["Product", "Car"],
    "@id": `${url}#product`,
    name: `${car.brand} ${car.model} (${car.year})`,
    description: `Makinë me qira ${car.brand} ${car.model} ${car.year}, kategoria ${car.category}. ${car.transmission}, ${car.fuel}, ${car.seats} vende — e disponueshme në Tiranë dhe Aeroportin Nënë Tereza.`,
    url,
    image: [
      {
        "@type": "ImageObject",
        url: car.image,
        name: `${car.brand} ${car.model} ${car.year} — makinë me qira në Tiranë`,
        description: `Foto e ${car.brand} ${car.model} ${car.year}, kategoria ${car.category}, me qira në Tiranë`,
        width: "1200",
        height: "800",
        representativeOfPage: true,
      },
    ],
    brand: { "@type": "Brand", name: car.brand },
    model: car.model,
    vehicleModelDate: String(car.year),
    fuelType: car.fuel,
    vehicleTransmission: car.transmission,
    seatingCapacity: car.seats,
    vehicleConfiguration: car.category,
    offers: {
      "@type": "Offer",
      "@id": `${url}#offer`,
      price: car.pricePerDay,
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: car.pricePerDay,
        priceCurrency: "EUR",
        unitCode: "DAY",
        unitText: "ditë",
      },
      availability: "https://schema.org/InStock",
      url,
      seller: { "@id": ID.business },
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      areaServed: { "@type": "Country", name: "Shqipëri" },
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Transmisioni", value: car.transmission },
      { "@type": "PropertyValue", name: "Karburanti", value: car.fuel },
      { "@type": "PropertyValue", name: "Vendesh", value: String(car.seats) },
      { "@type": "PropertyValue", name: "Kategoria", value: car.category },
    ],
  };
  const ar = ratingNode(car.rating);
  if (ar) schema.aggregateRating = ar;
  return schema;
};

export const buildArticleSchema = ({
  url,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  lang,
}: {
  url: string;
  headline: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  lang: string;
}) => ({
  "@type": "BlogPosting",
  "@id": `${url}#article`,
  headline: headline.slice(0, 110),
  description,
  ...(image ? { image: { "@type": "ImageObject", url: image } } : {}),
  ...(datePublished ? { datePublished } : {}),
  dateModified: dateModified || datePublished,
  inLanguage: lang,
  author: { "@id": ID.organization },
  publisher: { "@id": ID.organization },
  isPartOf: { "@id": ID.website },
  mainEntityOfPage: { "@id": `${url}#webpage` },
});

export const buildImageObjectSchema = ({
  url,
  name,
  description,
  width = 1200,
  height = 800,
}: {
  url: string;
  name: string;
  description?: string;
  width?: number;
  height?: number;
}) => ({
  "@type": "ImageObject",
  url,
  name,
  description: description ?? name,
  width: String(width),
  height: String(height),
  encodingFormat: "image/jpeg",
  license: `${SITE_URL}/termat-e-sherbimit`,
  creator: { "@id": ID.organization },
});
