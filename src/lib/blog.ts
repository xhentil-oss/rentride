/**
 * Blog articles that ship with the site (src/content/blog/<lang>/<slug>.json),
 * one file per language so each language is a real, fully translated page.
 * Each file is its own lazy chunk — a visitor only downloads what they read.
 *
 * Posts written in the admin (database) still work alongside these; they only
 * exist in Albanian/English, so they are listed only for those two languages.
 */
import { localePath, type Lang } from "./routes";
import manifest from "../content/blog/posts.json";

export interface StaticPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  keywords: string[];
  readingMinutes: number;
  html: string;
  faq: { question: string; answer: string }[];
  coverImage?: string;
  publishedAt: string;
  updatedAt?: string;
}

interface ManifestEntry { slug: string; publishedAt: string; updatedAt?: string; coverImage?: string }

const FILES = import.meta.glob<{ default: Omit<StaticPost, "publishedAt"> }>("../content/blog/*/*.json");
const ENTRIES = manifest as ManifestEntry[];

export const STATIC_SLUGS: ReadonlySet<string> = new Set(ENTRIES.map((e) => e.slug));

/** Load one article in one language. Returns null if that translation does not exist. */
export async function loadStaticPost(lang: Lang, slug: string): Promise<StaticPost | null> {
  const entry = ENTRIES.find((e) => e.slug === slug);
  const load = FILES[`../content/blog/${lang}/${slug}.json`];
  if (!entry || !load) return null;
  const mod = await load();
  return { ...mod.default, ...entry, coverImage: entry.coverImage ?? mod.default.coverImage };
}

/** All articles available in a language, newest first. */
export async function loadStaticPosts(lang: Lang): Promise<StaticPost[]> {
  const posts = await Promise.all(ENTRIES.map((e) => loadStaticPost(lang, e.slug)));
  return posts
    .filter((p): p is StaticPost => p !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * Article bodies link with canonical Albanian paths ("/makine-me-qira-aeroport",
 * "/blog/<slug>"); rewrite them to the reader's language.
 */
export function localizeLinks(html: string, lang: Lang): string {
  return html.replace(/href="(\/[^"#?]*)([^"]*)"/g, (_m, path: string, rest: string) => `href="${localePath(path, lang)}${rest}"`);
}
