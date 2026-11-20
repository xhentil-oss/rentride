import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSEO, buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema, SITE_URL } from "../hooks/useSEO";
import { useLocale } from "../hooks/useLocale";
import { CalendarBlank, ArrowLeft, ArrowRight, Tag, Clock } from "@phosphor-icons/react";
import LLink from "../components/LLink";
import Footer from "../components/Footer";
import { useState, useEffect, useMemo, type MouseEvent } from "react";
import DOMPurify from "dompurify";
import { STATIC_SLUGS, loadStaticPost, localizeLinks, type StaticPost } from "../lib/blog";
import { BLOG_UI, DATE_LOCALE } from "../content/blog/ui";
import manifest from "../content/blog/posts.json";

const API_BASE = "/api";

/** One shape for both sources: repo articles (9 languages) and admin/DB posts (sq/en). */
interface ViewPost {
  title: string;
  metaTitle: string;
  metaDescription: string;
  html: string;
  faq: { question: string; answer: string }[];
  tags: string[];
  coverImage?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingMinutes?: number;
  /** Shown in a language it was not written in — keep it out of the index. */
  untranslated: boolean;
}

function fromStatic(p: StaticPost, untranslated: boolean): ViewPost {
  return {
    title: p.title, metaTitle: p.metaTitle, metaDescription: p.metaDescription, html: p.html,
    faq: p.faq ?? [], tags: [], coverImage: p.coverImage, publishedAt: p.publishedAt,
    updatedAt: p.updatedAt, readingMinutes: p.readingMinutes, untranslated,
  };
}

function fromDb(post: any, lang: string): ViewPost {
  const en = lang === "en";
  const title = en && post.titleEn ? post.titleEn : post.titleSq;
  return {
    title,
    metaTitle: (en && post.metaTitleEn) || post.metaTitleSq || title,
    metaDescription: (en && post.metaDescEn) || post.metaDescSq || String(post.excerptSq ?? "").slice(0, 160),
    html: en && post.contentEn ? post.contentEn : post.contentSq,
    faq: [],
    tags: post.tags ? String(post.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    coverImage: post.coverImage || undefined,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    untranslated: !(lang === "sq" || (en && post.contentEn)),
  };
}

export default function BlogPostPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { lang, localePath } = useLocale();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ui = BLOG_UI[lang];

  const [post, setPost] = useState<ViewPost | null>(null);
  const [related, setRelated] = useState<StaticPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const load = async (): Promise<ViewPost | null> => {
      if (STATIC_SLUGS.has(slug)) {
        const own = await loadStaticPost(lang, slug);
        if (own) return fromStatic(own, false);
        const en = await loadStaticPost("en", slug);
        return en ? fromStatic(en, true) : null;
      }
      const r = await fetch(`${API_BASE}/blog/slug/${encodeURIComponent(slug)}`);
      if (!r.ok) return null;
      return fromDb(await r.json(), lang);
    };

    load()
      .then((p) => {
        if (cancelled) return;
        if (p) setPost(p); else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setNotFound(true); setLoading(false); } });

    // Three other articles in this language — internal links for readers and crawlers.
    const others = (manifest as { slug: string }[]).map((e) => e.slug).filter((s) => s !== slug);
    const start = Math.max(0, others.findIndex((s) => s > slug));
    const picks = [0, 1, 2].map((i) => others[(start + i) % others.length]).filter(Boolean);
    Promise.all(picks.map((s) => loadStaticPost(lang, s)))
      .then((list) => { if (!cancelled) setRelated(list.filter((p): p is StaticPost => p !== null)); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [slug, lang]);

  const postUrl = `${SITE_URL}${localePath(`/blog/${slug}`)}`;
  const html = useMemo(() => (post ? DOMPurify.sanitize(localizeLinks(post.html, lang)) : ""), [post, lang]);

  useSEO({
    title: post?.metaTitle || "Blog",
    description: post?.metaDescription || ui.seoDescription,
    canonical: `/blog/${slug}`,
    ogImage: post?.coverImage,
    ogType: "article",
    publishedTime: post?.publishedAt,
    modifiedTime: post?.updatedAt || post?.publishedAt,
    noindex: notFound || post?.untranslated,
    structuredData: post
      ? [
          buildArticleSchema({
            url: postUrl,
            headline: post.title,
            description: post.metaDescription,
            image: post.coverImage,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            lang,
          }),
          ...(post.faq.length ? [buildFAQSchema(post.faq)] : []),
          buildBreadcrumbSchema(
            [
              { name: ui.home, url: localePath("/") },
              { name: "Blog", url: localePath("/blog") },
              { name: post.title, url: localePath(`/blog/${slug}`) },
            ],
            postUrl,
          ),
        ]
      : undefined,
  });

  // Links inside the article body are plain <a>; keep in-site navigation client-side.
  const onBodyClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href || !href.startsWith("/") || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    e.preventDefault();
    navigate(href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-2/3" />
            <div className="h-4 bg-neutral-200 rounded w-1/3" />
            <div className="h-64 bg-neutral-200 rounded mt-6" />
            <div className="h-4 bg-neutral-200 rounded w-full" />
            <div className="h-4 bg-neutral-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-800 mb-2">{ui.notFound}</h1>
            <LLink to="/blog" className="text-primary hover:underline no-underline">{ui.backToBlog}</LLink>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(DATE_LOCALE[lang], { day: "numeric", month: "long", year: "numeric" })
    : "";
  const readTime = post.readingMinutes ?? Math.max(1, Math.ceil(post.html.replace(/<[^>]*>/g, "").split(/\s+/).length / 200));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="max-w-3xl mx-auto px-6 py-10">
        <LLink to="/blog" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary transition-colors no-underline mb-6">
          <ArrowLeft size={14} className="rtl:rotate-180" /> {ui.allArticles}
        </LLink>

        {post.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {post.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-neutral-400 mb-8">
          {date && (
            <span className="flex items-center gap-1.5">
              <CalendarBlank size={14} /> <time dateTime={post.publishedAt}>{date}</time>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {ui.minRead(readTime)}
          </span>
        </div>

        {post.coverImage && (
          <div className="rounded-xl overflow-hidden mb-8">
            <img src={post.coverImage} alt={post.title} className="w-full h-auto object-cover" />
          </div>
        )}

        <div
          className="prose prose-neutral max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg prose-table:text-sm"
          onClick={onBodyClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {post.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">{ui.faqTitle}</h2>
            <div className="space-y-3">
              {post.faq.map((f) => (
                <details key={f.question} className="group bg-white rounded-xl border border-border p-5">
                  <summary className="cursor-pointer font-medium text-neutral-900 list-none flex items-center justify-between gap-4">
                    {f.question}
                    <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <nav className="mt-12" aria-label={ui.moreArticles}>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">{ui.moreArticles}</h2>
            <ul className="grid gap-3 sm:grid-cols-3 list-none p-0">
              {related.map((r) => (
                <li key={r.slug}>
                  <LLink
                    to={`/blog/${r.slug}`}
                    className="group block h-full bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow no-underline"
                  >
                    <span className="block text-sm font-semibold text-neutral-900 group-hover:text-primary line-clamp-3">{r.title}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      {ui.readMore} <ArrowRight size={12} className="rtl:rotate-180" />
                    </span>
                  </LLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>

      <section className="bg-gradient-primary py-12 px-6 text-center mt-12">
        <h2 className="text-2xl font-bold text-white mb-3">{ui.ctaTitle}</h2>
        <p className="text-white/85 mb-6">{ui.ctaText}</p>
        <LLink
          to="/flota"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white text-primary hover:bg-azure transition-colors no-underline"
        >
          {t("header.bookNow")}
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
