import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSEO, buildArticleSchema, buildBreadcrumbSchema, SITE_URL } from "../hooks/useSEO";
import { useLocale } from "../hooks/useLocale";
import { CalendarBlank, ArrowLeft, Tag, Clock } from "@phosphor-icons/react";
import LLink from "../components/LLink";
import Footer from "../components/Footer";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";

const API_BASE = "/api";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, localePath } = useLocale();
  const { t } = useTranslation();
  const isEn = lang === "en";

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API_BASE}/blog/slug/${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(data => { setPost(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  const title = post ? (isEn && post.titleEn ? post.titleEn : post.titleSq) : "";
  const content = post ? (isEn && post.contentEn ? post.contentEn : post.contentSq) : "";
  const metaTitle = post ? (isEn && post.metaTitleEn ? post.metaTitleEn : post.metaTitleSq || title) : "";
  const metaDesc = post ? (isEn && post.metaDescEn ? post.metaDescEn : post.metaDescSq || (post.excerptSq ?? "").slice(0, 160)) : "";

  const postUrl = `${SITE_URL}${localePath(`/blog/${slug}`)}`;

  useSEO({
    title: metaTitle || "Blog",
    description: metaDesc,
    canonical: `/blog/${slug}`,
    ogImage: post?.coverImage || undefined,
    ogType: "article",
    publishedTime: post?.publishedAt,
    modifiedTime: post?.updatedAt || post?.publishedAt,
    structuredData: post
      ? [
          buildArticleSchema({
            url: postUrl,
            headline: title,
            description: metaDesc,
            image: post.coverImage || undefined,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            lang: isEn ? "en" : "sq",
          }),
          buildBreadcrumbSchema(
            [
              { name: isEn ? "Home" : "Kryefaqja", url: "/" },
              { name: "Blog", url: "/blog" },
              { name: title, url: `/blog/${slug}` },
            ],
            postUrl,
          ),
        ]
      : undefined,
  });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">
            {isEn ? "Post not found" : "Postimi nuk u gjet"}
          </h1>
          <LLink to={localePath("/blog")} className="text-primary hover:underline no-underline">
            {isEn ? "Back to blog" : "Kthehu te blogu"}
          </LLink>
        </div>
        <Footer />
      </div>
    );
  }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(isEn ? "en-GB" : "sq-AL", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const tags = post.tags ? post.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean) : [];
  const readTime = Math.max(1, Math.ceil(content.replace(/<[^>]*>/g, "").split(/\s+/).length / 200));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <LLink to={localePath("/blog")} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary transition-colors no-underline mb-6">
          <ArrowLeft size={14} /> {isEn ? "All articles" : "Të gjithë artikujt"}
        </LLink>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {tags.map((tag: string) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight">
          {title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-neutral-400 mb-8">
          {date && (
            <span className="flex items-center gap-1.5">
              <CalendarBlank size={14} /> {date}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {readTime} min {isEn ? "read" : "lexim"}
          </span>
        </div>

        {/* Cover image */}
        {post.coverImage && (
          <div className="rounded-xl overflow-hidden mb-8">
            <img src={post.coverImage} alt={title} className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-neutral max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </article>

      {/* CTA */}
      <section className="bg-gradient-primary py-12 px-6 text-center mt-12">
        <h2 className="text-2xl font-bold text-white mb-3">
          {isEn ? "Ready for a car hire in Tirana?" : "Gati për një makinë me qira në Tiranë?"}
        </h2>
        <p className="text-white/85 mb-6">
          {isEn ? "Book in just minutes — clear prices, a modern fleet." : "Rezervo brenda pak minutash — çmime të qarta, flotë moderne."}
        </p>
        <LLink
          to="/rezervo"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white text-primary hover:bg-azure transition-colors no-underline"
        >
          {t("header.bookNow")}
        </LLink>
      </section>

      <Footer />
    </div>
  );
}
