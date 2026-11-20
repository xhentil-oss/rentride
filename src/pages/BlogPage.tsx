import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { useQuery } from "../hooks/useApi";
import { useLocale } from "../hooks/useLocale";
import { CalendarBlank, ArrowRight, Tag } from "@phosphor-icons/react";
import LLink from "../components/LLink";
import Footer from "../components/Footer";
import { loadStaticPosts, STATIC_SLUGS } from "../lib/blog";
import { BLOG_UI, DATE_LOCALE } from "../content/blog/ui";

const ITEMS_PER_PAGE = 9;

interface Card {
  key: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt?: string;
  tags: string[];
}

export default function BlogPage() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ui = BLOG_UI[lang];
  const [page, setPage] = useState(1);

  useSEO({
    title: ui.seoTitle,
    description: ui.seoDescription,
    keywords: ui.seoKeywords,
    canonical: "/blog",
  });

  // Repo articles exist in every language; admin (DB) posts only in Albanian/English.
  const [staticCards, setStaticCards] = useState<Card[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setStaticCards(null);
    loadStaticPosts(lang)
      .then((posts) => {
        if (cancelled) return;
        setStaticCards(posts.map((p) => ({
          key: `s-${p.slug}`, slug: p.slug, title: p.title, excerpt: p.excerpt,
          coverImage: p.coverImage, publishedAt: p.publishedAt, tags: [],
        })));
      })
      .catch(() => { if (!cancelled) setStaticCards([]); });
    return () => { cancelled = true; };
  }, [lang]);

  const { data: dbPosts, isPending: dbLoading } = useQuery("BlogPost");
  const isEn = lang === "en";
  const dbCards: Card[] = (lang === "sq" || isEn ? dbPosts ?? [] : [])
    .filter((p: any) => !STATIC_SLUGS.has(p.slug) && (lang === "sq" || p.titleEn))
    .map((p: any) => ({
      key: `d-${p.id}`,
      slug: p.slug,
      title: isEn ? p.titleEn : p.titleSq,
      excerpt: (isEn ? p.excerptEn : p.excerptSq) || undefined,
      coverImage: p.coverImage || undefined,
      publishedAt: p.publishedAt || undefined,
      tags: p.tags ? String(p.tags).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    }));

  const loading = staticCards === null || ((lang === "sq" || isEn) && dbLoading);
  const allPosts = [...(staticCards ?? []), ...dbCards].sort((a, b) =>
    String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")),
  );

  const totalPages = Math.ceil(allPosts.length / ITEMS_PER_PAGE);
  const paginated = allPosts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="bg-gradient-primary py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{ui.heroTitle}</h1>
          <p className="text-white/85 text-lg">{ui.heroSubtitle}</p>
        </div>
      </section>

      <main className="max-w-[1440px] mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="h-48 bg-neutral-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500 text-lg">{ui.empty}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-500 mb-6">{ui.articles(allPosts.length)}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((post) => {
                const date = post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString(DATE_LOCALE[lang], { day: "numeric", month: "long", year: "numeric" })
                  : "";
                return (
                  <LLink
                    key={post.key}
                    to={`/blog/${post.slug}`}
                    className="group bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 no-underline"
                  >
                    {post.coverImage ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-end p-5">
                        <span className="text-lg font-semibold text-primary/70 line-clamp-2">{post.title}</span>
                      </div>
                    )}
                    <div className="p-5">
                      {post.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h2 className="text-base font-semibold text-neutral-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{post.excerpt}</p>}
                      <div className="flex items-center justify-between">
                        {date && (
                          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                            <CalendarBlank size={12} /> {date}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                          {ui.readMore} <ArrowRight size={12} className="rtl:rotate-180" />
                        </span>
                      </div>
                    </div>
                  </LLink>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm rounded-md border border-border bg-white text-neutral-700 disabled:opacity-40 hover:bg-azure transition-colors cursor-pointer"
                >
                  {t("fleet.prev")}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      p === page ? "bg-primary text-white" : "bg-white border border-border text-neutral-700 hover:bg-azure"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm rounded-md border border-border bg-white text-neutral-700 disabled:opacity-40 hover:bg-azure transition-colors cursor-pointer"
                >
                  {t("fleet.next")}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
