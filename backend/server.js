const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Load backend-specific env first, then root env as a fallback. This keeps the
// server stable whether it is started from the repository root or /backend.
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

// ─── Validate required secrets ──────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be set and at least 32 characters.');
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('❌ JWT_REFRESH_SECRET must be set and at least 32 characters.');
  process.exit(1);
}

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.set('trust proxy', 1); // Trust cPanel reverse proxy — fixes req.ip and rate limiting
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", "'unsafe-inline'", "https://unpkg.com",
        // Google Analytics 4 + Google Ads (gtag.js) and Google Sign-In
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://googleads.g.doubleclick.net",
        "https://www.googleadservices.com",
        "https://accounts.google.com",
        "https://apis.google.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"], // "https:" already covers Google/Ads tracking pixels
      connectSrc: [
        "'self'", "https://unpkg.com", "https://images.unsplash.com", "https://maps.googleapis.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
        "https://*.doubleclick.net",
        "https://*.googleadservices.com",
        "https://www.google.com",
        "https://pagead2.googlesyndication.com",
        "https://accounts.google.com",
      ],
      frameSrc: ["'self'", "https://accounts.google.com", "https://td.doubleclick.net", "https://www.googletagmanager.com"],
    },
  },
}));
app.use(compression());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'https://rentride.al')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limit — strict for login/register/reset (brute-force sensitive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 20,
  message: { error: 'Shumë kërkesa. Provoni pas 15 minutash.' },
});

// Lenient limiter for session endpoints used during normal navigation (/me, /refresh, /logout)
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Shumë kërkesa. Provoni më vonë.' },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Shumë kërkesa. Provoni më vonë.' },
});

// Stricter limiter for public POST endpoints (booking, reviews, customers)
const publicPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Shumë kërkesa. Provoni pas 15 minutash.' },
});

// Extra-strict per-IP limiter for /register specifically — prevents bots from
// mass-creating customer accounts. 5 per hour per IP is generous for humans
// (typo retries, multiple family members on same Wi-Fi) but blocks scripts.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 orë
  max: 5,
  message: { error: 'Shumë regjistrime nga kjo IP. Provoni pas 1 ore.' },
});

// ─── ROUTES ───────────────────────────────────────────────────
// Stricter rate limits on public POST endpoints (booking spam, review flood)
app.post('/api/customers', publicPostLimiter);
app.post('/api/reservations', publicPostLimiter);
app.post('/api/reviews', publicPostLimiter);

// Apply strict auth limiter only to login/register/forgot; lenient to /me, /refresh, /logout
// /register additionally has a per-IP registerLimiter (hourly cap) on top of authLimiter.
const strictAuthPaths = ['/login', '/register', '/forgot-password', '/login-2fa', '/reset-password', '/resend-verification', '/google'];
app.use('/api/auth', (req, res, next) => {
  const p = req.path;
  if (p === '/register' || p.startsWith('/register')) {
    return registerLimiter(req, res, (err) => {
      if (err) return next(err);
      return authLimiter(req, res, next);
    });
  }
  if (strictAuthPaths.some(s => p === s || p.startsWith(s))) return authLimiter(req, res, next);
  return sessionLimiter(req, res, next);
}, require('./routes/auth'));
app.use('/api/cars',          apiLimiter,  require('./routes/cars'));
app.use('/api/customers',     apiLimiter,  require('./routes/customers'));
app.use('/api/reservations',  apiLimiter,  require('./routes/reservations'));
app.use('/api/invoices',      apiLimiter,  require('./routes/invoices'));
app.use('/api/reviews',       apiLimiter,  require('./routes/reviews'));
app.use('/api/pricing-rules', apiLimiter,  require('./routes/pricingRules'));
app.use('/api/extras',        apiLimiter,  require('./routes/extras'));
app.use('/api/monthly-rates', apiLimiter,  require('./routes/monthlyRates'));
app.use('/api/fleet',         apiLimiter,  require('./routes/fleet'));
app.use('/api/users',         apiLimiter,  require('./routes/users'));
app.use('/api/activity-logs', apiLimiter,  require('./routes/activityLogs'));
app.use('/api/chat',          apiLimiter,  require('./routes/chat'));
app.use('/api/settings',      apiLimiter,  require('./routes/settings'));
app.use('/api/analytics',                  require('./routes/analytics'));
app.use('/api/blog',          apiLimiter,  require('./routes/blog'));
app.use('/api/deposits',      apiLimiter,  require('./routes/deposits'));
app.use('/api/customer-documents', apiLimiter, require('./routes/customerDocuments'));
app.use('/api/communication-logs', apiLimiter, require('./routes/communicationLogs'));
app.use('/api/google-reviews',     apiLimiter,  require('./routes/googleReviews'));
app.post('/api/contact', require('./routes/contact'));
app.use('/api/email',    apiLimiter,  require('./routes/email'));
try {
  app.use('/api/upload', apiLimiter, require('./routes/upload'));
} catch (e) {
  console.warn('⚠️  Upload route unavailable (multer missing?):', e.message);
  app.use('/api/upload', (req, res) => res.status(503).json({ error: 'Upload jo i disponueshëm. Kontakto adminstratorin.' }));
}

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ─── DYNAMIC SITEMAP ──────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  try {
    const pool = require('./database/db');
    const BASE = 'https://rentride.al';
    const today = new Date().toISOString().slice(0, 10);

    const [cars]  = await pool.query("SELECT slug, brand, model, year, image, updated_at FROM cars WHERE status != 'Deleted' ORDER BY created_at");
    const [posts] = await pool.query("SELECT slug, title_sq, cover_image, updated_at FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC").catch(() => [[]]);

    const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : today;

    // Only absolute http(s) URLs are valid in an image sitemap. Uploads are
    // stored as site-relative paths, and base64 data URLs must be skipped.
    const absImage = (src) => {
      if (!src || typeof src !== 'string') return null;
      if (src.startsWith('data:')) return null;
      if (/^https?:\/\//i.test(src)) return src;
      if (src.startsWith('/')) return BASE + src;
      return null;
    };

    const imageBlock = (src, title, caption) => {
      const url = absImage(src);
      if (!url) return '';
      return `
    <image:image>
      <image:loc>${escXml(url)}</image:loc>
      <image:title>${escXml(title)}</image:title>
      <image:caption>${escXml(caption)}</image:caption>
    </image:image>`;
    };

    const LANGS = ['sq', 'en', 'fr', 'es', 'it'];

    // Per-page localized slugs (must mirror src/lib/routes.ts SLUGS).
    const staticUrls = [
      { slugs: { sq: '/',                          en: '/en',                      fr: '/fr',                         es: '/es',                         it: '/it' },                      pri: '1.0',  freq: 'weekly' },
      { slugs: { sq: '/makina-me-qira-tirane',     en: '/en/car-rental-tirana',    fr: '/fr/location-voiture-tirana', es: '/es/alquiler-coches-tirana',  it: '/it/noleggio-auto-tirana' }, pri: '0.95', freq: 'weekly' },
      { slugs: { sq: '/flota',                     en: '/en/fleet',                fr: '/fr/flotte',                  es: '/es/flota',                   it: '/it/flotta' },               pri: '0.9',  freq: 'weekly' },
      { slugs: { sq: '/makine-me-qira-aeroport',   en: '/en/airport-car-rental',   fr: '/fr/location-aeroport',       es: '/es/alquiler-aeropuerto',     it: '/it/noleggio-aeroporto' },   pri: '0.9',  freq: 'monthly' },
      { slugs: { sq: '/makina-suv-me-qira',        en: '/en/suv-car-rental',       fr: '/fr/location-suv',            es: '/es/alquiler-suv',            it: '/it/noleggio-suv' },         pri: '0.85', freq: 'monthly' },
      { slugs: { sq: '/makina-automatike-me-qira', en: '/en/automatic-car-rental', fr: '/fr/location-automatique',    es: '/es/alquiler-automatico',     it: '/it/noleggio-automatico' },  pri: '0.85', freq: 'monthly' },
      { slugs: { sq: '/makina-luksoze-me-qira',    en: '/en/luxury-car-rental',    fr: '/fr/location-luxe',           es: '/es/alquiler-lujo',           it: '/it/noleggio-lusso' },       pri: '0.85', freq: 'monthly' },
      { slugs: { sq: '/rezervo',                   en: '/en/book',                 fr: '/fr/reserver',                es: '/es/reservar',                it: '/it/prenota' },              pri: '0.8',  freq: 'monthly' },
      { slugs: { sq: '/blog',                      en: '/en/blog',                 fr: '/fr/blog',                    es: '/es/blog',                    it: '/it/blog' },                 pri: '0.8',  freq: 'weekly' },
      { slugs: { sq: '/vleresime',                 en: '/en/reviews',              fr: '/fr/avis',                    es: '/es/opiniones',               it: '/it/recensioni' },           pri: '0.7',  freq: 'weekly' },
      { slugs: { sq: '/kontakt',                   en: '/en/contact',              fr: '/fr/contact',                 es: '/es/contacto',                it: '/it/contatti' },             pri: '0.6',  freq: 'monthly' },
      { slugs: { sq: '/zyrat',                     en: '/en/offices',              fr: '/fr/bureaux',                 es: '/es/oficinas',                it: '/it/uffici' },               pri: '0.6',  freq: 'monthly' },
      { slugs: { sq: '/termat-e-sherbimit',        en: '/en/terms',                fr: '/fr/conditions',              es: '/es/terminos',                it: '/it/termini' },              pri: '0.3',  freq: 'yearly' },
      { slugs: { sq: '/privatesie',                en: '/en/privacy',              fr: '/fr/confidentialite',         es: '/es/privacidad',              it: '/it/privacy' },              pri: '0.3',  freq: 'yearly' },
    ];

    const hreflangLinks = (slugs) =>
      LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escXml(BASE + slugs[l])}" />`).join('\n') +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(BASE + slugs.sq)}" />`;

    const urlEntry = ({ loc, slugs, lastmod, freq, pri, images = '' }) => `
  <url>
    <loc>${escXml(BASE + loc)}</loc>
${hreflangLinks(slugs)}
    <lastmod>${lastmod}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>${images}
  </url>`;

    // The image namespace turns every car photo into an indexable asset —
    // Google Images is a meaningful discovery surface for a rental fleet, and
    // it costs nothing beyond declaring the images we already serve.
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // Static pages — one <url> per language
    for (const { slugs, pri, freq } of staticUrls) {
      for (const l of LANGS) xml += urlEntry({ loc: slugs[l], slugs, lastmod: today, freq, pri });
    }

    // Car detail pages (slug shared across languages; only the prefix differs)
    for (const car of cars) {
      const s = escXml(car.slug);
      const slugs = { sq: `/makina/${s}`, en: `/en/car/${s}`, fr: `/fr/voiture/${s}`, es: `/es/coche/${s}`, it: `/it/auto/${s}` };
      const lastmod = fmtDate(car.updated_at);
      const label = `${car.brand} ${car.model} ${car.year}`.trim();
      const images = imageBlock(
        car.image,
        `${label} — makinë me qira në Tiranë`,
        `${label} me qira nga Rent Ride, e disponueshme në Tiranë dhe Aeroportin Nënë Tereza.`,
      );
      for (const l of LANGS) xml += urlEntry({ loc: slugs[l], slugs, lastmod, freq: 'weekly', pri: '0.8', images });
    }

    // Blog posts
    for (const post of posts) {
      const s = escXml(post.slug);
      const slugs = { sq: `/blog/${s}`, en: `/en/blog/${s}`, fr: `/fr/blog/${s}`, es: `/es/blog/${s}`, it: `/it/blog/${s}` };
      const lastmod = fmtDate(post.updated_at);
      const images = imageBlock(post.cover_image, post.title_sq || 'Rent Ride blog', post.title_sq || 'Rent Ride blog');
      for (const l of LANGS) xml += urlEntry({ loc: slugs[l], slugs, lastmod, freq: 'monthly', pri: '0.7', images });
    }

    xml += `\n</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // cache 1h
    return res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Sitemap temporarily unavailable.');
  }
});

// ─── API 404 for unknown endpoints ────────────────────────────
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint nuk ekziston.' });
});

// ─── SERVE UPLOADED FILES ─────────────────────────────────────
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders(res) { res.setHeader('Cache-Control', 'public, max-age=604800'); },
}));

// ─── SERVE FRONTEND (production) ─────────────────────────────
const distPath = path.join(__dirname, 'public');
// Cache hashed assets (JS/CSS) for 1 year; never cache index.html
app.use(express.static(distPath, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else if (/\.(js|css)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n⚡ ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => { console.error('⏰ Forced shutdown'); process.exit(1); }, 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
