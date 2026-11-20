#!/usr/bin/env node
/**
 * Build-time prerendering — runs after `vite build`.
 *
 * Every indexable page × every language is rendered in headless Chrome and
 * saved as static HTML under dist/prerender/. The Node server sends that file
 * for the matching URL, so crawlers (Google, Bing, AI assistants, WhatsApp /
 * Facebook link previews) get the real title, canonical, hreflang and text
 * without executing JavaScript. The SPA boots on top of it as before.
 *
 * No extra dependencies: a tiny local server serves dist/ and forwards GET
 * /api/* to the live site (public read-only data: cars, reviews, settings),
 * and the installed Chrome renders each URL with --dump-dom.
 *
 *   node scripts/prerender.mjs                 # uses https://rentride.al for data
 *   PRERENDER_API=http://localhost:5000 node scripts/prerender.mjs
 *   CHROME_PATH="C:/path/chrome.exe" node scripts/prerender.mjs
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LANGS, localePath } from "../src/lib/routes.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "prerender");
const API = (process.env.PRERENDER_API || "https://rentride.al").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY || 8);

// Indexable pages, as canonical Albanian paths. Account, checkout, thank-you
// and reset pages are noindex and stay client-rendered.
const STATIC_PAGES = [
  "/", "/flota", "/vleresime", "/makina-me-qira-tirane", "/makine-me-qira-aeroport",
  "/makina-suv-me-qira", "/makina-automatike-me-qira", "/makina-luksoze-me-qira",
  "/sitemap", "/kontakt", "/zyrat", "/termat-e-sherbimit", "/privatesie", "/blog",
];

const BLOCKED_HOSTS = [
  "*.googletagmanager.com", "*.google-analytics.com", "*.analytics.google.com",
  "*.doubleclick.net", "*.googleadservices.com", "*.googlesyndication.com",
  "accounts.google.com", "apis.google.com",
];

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Chrome not found — set CHROME_PATH");
  return found;
}

// ── Local server: dist/ + SPA fallback + read-only API passthrough ─────────
const apiCache = new Map();

/**
 * Same mapping as backend/routes/cars.js imageUrl(): base64 photos become
 * /api/cars/:id/image?v=<updatedAt>. Keeps prerendered pages small even when
 * the data source still runs an older API that inlines the photos.
 */
function carImageUrls(data) {
  const fix = (c) => {
    if (!c || typeof c.image !== "string" || !c.image.startsWith("data:")) return c;
    const v = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
    return { ...c, image: `/api/cars/${encodeURIComponent(c.id)}/image?v=${v}` };
  };
  if (Array.isArray(data)) return data.map(fix);
  if (data && Array.isArray(data.data)) return { ...data, data: data.data.map(fix) };
  return fix(data);
}
async function proxyApi(req, res) {
  if (req.method !== "GET") { res.writeHead(204).end(); return; } // never write to production
  const url = API + req.url;
  if (!apiCache.has(url)) {
    apiCache.set(url, fetch(url, { headers: { accept: "application/json", "x-locale": req.headers["x-locale"] || "sq" } })
      .then(async (r) => {
        let body = Buffer.from(await r.arrayBuffer());
        if (req.url.startsWith("/api/cars") && r.ok) body = Buffer.from(JSON.stringify(carImageUrls(JSON.parse(body.toString("utf8")))));
        return { status: r.status, type: r.headers.get("content-type") || "application/json", body };
      }));
  }
  try {
    const r = await apiCache.get(url);
    res.writeHead(r.status, { "content-type": r.type }).end(r.body);
  } catch {
    res.writeHead(502).end();
  }
}

function startServer() {
  const indexHtml = fs.readFileSync(path.join(DIST, "index.html"));
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (pathname.startsWith("/api/")) return void proxyApi(req, res);
    const file = path.join(DIST, pathname);
    if (file.startsWith(DIST) && !file.startsWith(OUT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(200, { "content-type": MIME[".html"] }).end(indexHtml);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ── Rendering ───────────────────────────────────────────────────────────────
function render(chrome, url, profileDir) {
  const args = [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--hide-scrollbars", "--window-size=1366,900",
    `--user-data-dir=${profileDir}`,
    "--blink-settings=imagesEnabled=false",
    `--host-resolver-rules=${BLOCKED_HOSTS.map((h) => `MAP ${h} ~NOTFOUND`).join(", ")}`,
    "--virtual-time-budget=20000",
    "--dump-dom", url,
  ];
  return new Promise((resolve, reject) => {
    execFile(chrome, args, { maxBuffer: 32 * 1024 * 1024, timeout: 90_000, windowsHide: true }, (err, stdout) => {
      if (err && !stdout) reject(err); else resolve(stdout);
    });
  });
}

/** Remove one element (and its subtree) that starts with `openTag`, balancing nested <div>s. */
function removeDivStartingWith(html, openTag) {
  const start = html.indexOf(openTag);
  if (start < 0) return html;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return html.slice(0, start) + html.slice(re.lastIndex);
  }
  return html;
}

function clean(dom) {
  let html = dom.trim();
  // Third-party tags injected at runtime (GTM, Google sign-in); the template's
  // own inline loaders stay and will inject them again in the browser.
  html = html.replace(/<script\b[^>]*\bsrc="https?:\/\/[^"]*"[^>]*><\/script>/g, "");
  html = html.replace(/<iframe\b[\s\S]*?<\/iframe>/g, "");
  // Cookie banner: a per-visitor decision, not page content.
  html = removeDivStartingWith(html, '<div role="dialog" aria-live="polite"');
  if (!/^<!doctype/i.test(html)) html = "<!DOCTYPE html>\n" + html;
  return html;
}

function outFile(urlPath) {
  return path.join(OUT, urlPath === "/" ? "__root.html" : `${urlPath.replace(/^\//, "")}.html`);
}

async function pool(items, size, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: size }, async (_, w) => {
    while (i < items.length) await worker(items[i++], w);
  }));
}

// ── Main ────────────────────────────────────────────────────────────────────
const chrome = findChrome();
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;

const getJson = async (p) => { try { const r = await fetch(API + p); return r.ok ? await r.json() : []; } catch { return []; } };
const carsRaw = await getJson("/api/cars");
const cars = (Array.isArray(carsRaw) ? carsRaw : carsRaw.data ?? []).filter((c) => c.slug && c.status !== "Deleted");
const dbPostsRaw = await getJson("/api/blog");
const dbPosts = Array.isArray(dbPostsRaw) ? dbPostsRaw : [];
const staticPosts = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/blog/posts.json"), "utf8"));

const urls = new Set();
for (const p of STATIC_PAGES) for (const l of LANGS) urls.add(localePath(p, l));
for (const c of cars) for (const l of LANGS) urls.add(localePath(`/makina/${c.slug}`, l));
for (const p of staticPosts) {
  for (const l of LANGS) {
    if (fs.existsSync(path.join(ROOT, "src/content/blog", l, `${p.slug}.json`))) urls.add(localePath(`/blog/${p.slug}`, l));
  }
}
for (const p of dbPosts) {
  if (staticPosts.some((s) => s.slug === p.slug)) continue;
  urls.add(localePath(`/blog/${p.slug}`, "sq"));
  if (p.titleEn && p.contentEn) urls.add(localePath(`/blog/${p.slug}`, "en"));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const profiles = Array.from({ length: CONCURRENCY }, (_, i) => fs.mkdtempSync(path.join(os.tmpdir(), `prerender-${i}-`)));

const list = [...urls];
let written = 0;
const skipped = [];
const started = Date.now();
console.log(`Prerendering ${list.length} pages with ${path.basename(chrome)} (data: ${API}, ${cars.length} cars)…`);

await pool(list, CONCURRENCY, async (urlPath, w) => {
  try {
    const dom = await render(chrome, base + urlPath, profiles[w]);
    if (/<meta name="robots" content="[^"]*noindex/.test(dom)) { skipped.push(`${urlPath} (noindex)`); return; }
    if (!/<h1\b/.test(dom)) { skipped.push(`${urlPath} (no <h1> — render incomplete)`); return; }
    const file = outFile(urlPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, clean(dom));
    written++;
    if (written % 25 === 0) console.log(`  ${written}/${list.length}`);
  } catch (e) {
    skipped.push(`${urlPath} (${e.message.split("\n")[0]})`);
  }
});

server.close();
for (const p of profiles) fs.rmSync(p, { recursive: true, force: true });
console.log(`✓ ${written} pages prerendered in ${Math.round((Date.now() - started) / 1000)}s → dist/prerender/`);
if (skipped.length) console.log(`Skipped ${skipped.length}:\n  ` + skipped.join("\n  "));
// A large miss means something is broken (API down, Chrome failed) — fail the build.
if (written < list.length * 0.9) { console.error("✗ Too many pages failed to prerender."); process.exit(1); }
