import { useEffect } from "react";
import { getAllAlternates, detectLang, LANGS, localePath } from "../lib/routes";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  OG_LOCALE,
  buildWebPageSchema,
} from "../lib/seo";

// Re-exported so pages can keep importing schema builders from this hook.
export {
  buildFAQSchema,
  buildBreadcrumbSchema,
  buildCarProductSchema,
  buildImageObjectSchema,
  buildItemListSchema,
  buildArticleSchema,
  buildWebPageSchema,
  buildOrganizationSchema,
  buildAutoRentalSchema,
  buildSiteGraph,
  SITE_URL,
  SITE_NAME,
} from "../lib/seo";

/** Back-compat alias — `AutoRental` is the correct type for a car-rental brand. */
export { buildAutoRentalSchema as buildLocalBusinessSchema } from "../lib/seo";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  /** Canonical Albanian path; automatically localized to the active language. */
  canonical?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: "website" | "article" | "product";
  /**
   * Keep the URL out of the index. Use on checkout, account, transactional and
   * utility pages — thin/duplicate pages dilute crawl budget and site quality
   * signals across the whole domain, not just their own ranking.
   */
  noindex?: boolean;
  /** Indexable but not link-equity-passing (rare; e.g. paginated deep tails). */
  nofollow?: boolean;
  /** Paginated listings: absolute or site-relative prev/next URLs. */
  prevPage?: string;
  nextPage?: string;
  /** Article-only Open Graph metadata. */
  publishedTime?: string;
  modifiedTime?: string;
  /**
   * Page-level JSON-LD nodes. Emitted inside a single `@graph` alongside an
   * auto-generated `WebPage` node so everything resolves as one subgraph.
   */
  structuredData?: object | object[];
  /** Set false to skip the automatic WebPage node (e.g. noindex utility pages). */
  includeWebPage?: boolean;
}

const MANAGED_ATTR = "data-seo-managed";

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(name: string, property = false) {
  const attr = property ? "property" : "name";
  document.querySelectorAll(`meta[${attr}="${name}"]`).forEach((el) => el.remove());
}

/**
 * Repeatable meta tags (og:locale:alternate, article:tag, …). A plain setMeta
 * loop overwrites one element, so only the last value ever survives.
 */
function setMetaList(property: string, values: string[]) {
  document.querySelectorAll(`meta[property="${property}"]`).forEach((el) => el.remove());
  for (const value of values) {
    const el = document.createElement("meta");
    el.setAttribute("property", property);
    el.setAttribute("content", value);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]:not([hreflang])`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeLink(rel: string) {
  document.querySelectorAll(`link[rel="${rel}"]:not([hreflang])`).forEach((el) => el.remove());
}

function setHreflang(lang: string, href: string) {
  const selector = `link[rel="alternate"][hreflang="${lang}"]`;
  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", lang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeAllHreflang() {
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
}

function setStructuredData(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u}`);

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = DEFAULT_OG_IMAGE_ALT,
  ogImageWidth = 1200,
  ogImageHeight = 630,
  ogType = "website",
  noindex = false,
  nofollow = false,
  prevPage,
  nextPage,
  publishedTime,
  modifiedTime,
  structuredData,
  includeWebPage = true,
}: SEOProps) {
  // Serialized so an inline object/array literal from the caller doesn't produce
  // a new reference on every render and re-run this effect indefinitely.
  const sdKey = structuredData ? JSON.stringify(structuredData) : "";

  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    else removeMeta("keywords");

    // Robots. `max-image-preview:large` is what unlocks large thumbnails in
    // Google Images/Discover; the unbounded snippet/video limits stop Google
    // from truncating rich results. Both are opt-in — silence means "small".
    const directives = noindex
      ? ["noindex", "nofollow", "noarchive"]
      : [
          "index",
          nofollow ? "nofollow" : "follow",
          "max-image-preview:large",
          "max-snippet:-1",
          "max-video-preview:-1",
        ];
    setMeta("robots", directives.join(", "));
    setMeta("googlebot", directives.join(", "));

    // Canonical — `canonical` is the Albanian path; localize it so each language
    // gets a self-referencing permalink instead of pointing back at Albanian.
    const pathname = window.location.pathname;
    const lang = detectLang(pathname);
    const canonicalPath = canonical ? localePath(canonical, lang) : pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    setLink("canonical", canonicalUrl);

    // Hreflang. Skipped entirely for noindex pages: advertising alternates for a
    // URL that must not be indexed sends conflicting signals.
    if (noindex) {
      removeAllHreflang();
    } else {
      const alternates = getAllAlternates(pathname, lang);
      for (const l of LANGS) setHreflang(l, `${SITE_URL}${alternates[l]}`);
      setHreflang("x-default", `${SITE_URL}${alternates.sq}`);
    }

    // Pagination hints for deep listings.
    if (prevPage) setLink("prev", abs(prevPage));
    else removeLink("prev");
    if (nextPage) setLink("next", abs(nextPage));
    else removeLink("next");

    // Open Graph
    const ogImageAbs = abs(ogImage);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", ogType, true);
    setMeta("og:image", ogImageAbs, true);
    setMeta("og:image:secure_url", ogImageAbs, true);
    setMeta("og:image:width", String(ogImageWidth), true);
    setMeta("og:image:height", String(ogImageHeight), true);
    setMeta("og:image:type", /\.png($|\?)/i.test(ogImageAbs) ? "image/png" : "image/jpeg", true);
    if (ogImageAlt) setMeta("og:image:alt", ogImageAlt, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:locale", OG_LOCALE[lang] ?? "sq_AL", true);
    setMetaList(
      "og:locale:alternate",
      LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
    );

    if (ogType === "article") {
      if (publishedTime) setMeta("article:published_time", publishedTime, true);
      if (modifiedTime) setMeta("article:modified_time", modifiedTime, true);
      setMeta("article:publisher", SITE_URL, true);
    } else {
      removeMeta("article:published_time", true);
      removeMeta("article:modified_time", true);
      removeMeta("article:publisher", true);
    }

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImageAbs);
    if (ogImageAlt) setMeta("twitter:image:alt", ogImageAlt);

    // Structured data — one @graph per page. The auto WebPage node stitches the
    // URL into the site-wide Organization/WebSite/AutoRental graph declared in
    // index.html, so page nodes can reference entities by @id instead of
    // duplicating them (duplicate entities are how sibling brands get merged).
    const pageNodes: object[] = structuredData
      ? Array.isArray(structuredData)
        ? [...structuredData]
        : [structuredData]
      : [];

    // Re-anchor the breadcrumb @id to this exact URL. Callers may omit the page
    // URL when building it, which would leave every page's breadcrumb sharing
    // one identifier — two nodes with the same @id are one entity to a parser.
    let breadcrumbId: string | undefined;
    const bcIndex = pageNodes.findIndex(
      (n) => (n as any)?.["@type"] === "BreadcrumbList",
    );
    if (bcIndex !== -1) {
      breadcrumbId = `${canonicalUrl}#breadcrumb`;
      pageNodes[bcIndex] = { ...(pageNodes[bcIndex] as object), "@id": breadcrumbId };
    }

    if (includeWebPage && !noindex) {
      pageNodes.unshift(
        buildWebPageSchema({
          url: canonicalUrl,
          name: fullTitle,
          description,
          lang,
          primaryImage: ogImageAbs,
          breadcrumbId,
        }),
      );
    }

    if (pageNodes.length > 0) {
      // Strip any per-node @context; the wrapper graph carries it once.
      const graph = pageNodes.map((n) => {
        const { "@context": _ctx, ...rest } = n as Record<string, any>;
        return rest;
      });
      setStructuredData("structured-data-dynamic", {
        "@context": "https://schema.org",
        "@graph": graph,
      });
    } else {
      document.getElementById("structured-data-dynamic")?.remove();
    }

    return () => {
      document.getElementById("structured-data-dynamic")?.remove();
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    ogImage,
    ogImageAlt,
    ogType,
    noindex,
    nofollow,
    prevPage,
    nextPage,
    publishedTime,
    modifiedTime,
    includeWebPage,
    sdKey,
  ]);
}
