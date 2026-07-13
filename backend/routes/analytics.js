const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

// ── IP → country (privacy-friendly: we never store the IP, only the country) ──
const geoCache = new Map(); // ip -> { country, ts }
const GEO_TTL = 24 * 60 * 60 * 1000; // 24h

function clientIp(req) {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.ip || req.connection?.remoteAddress || '';
}

async function lookupCountry(req) {
  // 1) Proxy/CDN headers (Cloudflare, some cPanel GeoIP setups) — instant.
  const hdr = req.headers['cf-ipcountry'] || req.headers['x-geoip-country-code'] || req.headers['x-country-code'];
  if (hdr && /^[A-Za-z]{2}$/.test(hdr)) return hdr.toUpperCase();

  const ip = clientIp(req);
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) return null;

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < GEO_TTL) return cached.country;

  // 2) Best-effort free lookup (no key). Short timeout, never throws.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`, { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await r.json();
    const country = j && j.countryCode ? String(j.countryCode).toUpperCase() : null;
    geoCache.set(ip, { country, ts: Date.now() });
    return country;
  } catch {
    geoCache.set(ip, { country: null, ts: Date.now() });
    return null;
  }
}

// ── POST /track — public, fire-and-forget from the browser ───────────────────
router.post('/track', async (req, res) => {
  // Respond immediately; recording must never block or error the visitor.
  res.status(204).end();
  try {
    const { type, name, path, data, lang, sessionId, referrer } = req.body || {};
    const t = type === 'event' ? 'event' : 'pageview';
    const country = await lookupCountry(req);
    await pool.query(
      'INSERT INTO analytics_events (id, type, name, path, data, country, lang, session_id, referrer) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        uuidv4(),
        t,
        name ? String(name).slice(0, 100) : null,
        path ? String(path).slice(0, 512) : null,
        data ? JSON.stringify(data).slice(0, 2000) : null,
        country,
        lang ? String(lang).slice(0, 5) : null,
        sessionId ? String(sessionId).slice(0, 64) : null,
        referrer ? String(referrer).slice(0, 512) : null,
      ]
    );
  } catch (err) {
    console.error('analytics track error:', err.message);
  }
});

// ── GET /summary — admin dashboard data ──────────────────────────────────────
router.get('/summary', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    let days, since;
    if (req.query.range === 'today') {
      since = new Date();
      since.setHours(0, 0, 0, 0); // start of today (server time)
      days = 1;
    } else {
      days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
      since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    const [[totals]] = await pool.query(
      `SELECT
         COUNT(CASE WHEN type='pageview' THEN 1 END) AS pageviews,
         COUNT(DISTINCT session_id) AS visitors
       FROM analytics_events WHERE created_at >= ?`,
      [since]
    );
    const [byCountry] = await pool.query(
      `SELECT country, COUNT(DISTINCT session_id) AS visitors
       FROM analytics_events
       WHERE created_at >= ? AND country IS NOT NULL AND country <> ''
       GROUP BY country ORDER BY visitors DESC LIMIT 20`,
      [since]
    );
    const [byEvent] = await pool.query(
      `SELECT name, COUNT(*) AS count
       FROM analytics_events
       WHERE created_at >= ? AND type='event' AND name IS NOT NULL
       GROUP BY name ORDER BY count DESC`,
      [since]
    );
    const [topPages] = await pool.query(
      `SELECT path, COUNT(*) AS views
       FROM analytics_events
       WHERE created_at >= ? AND type='pageview' AND path IS NOT NULL
       GROUP BY path ORDER BY views DESC LIMIT 10`,
      [since]
    );
    const [daily] = await pool.query(
      `SELECT DATE(created_at) AS date,
              COUNT(CASE WHEN type='pageview' THEN 1 END) AS pageviews,
              COUNT(DISTINCT session_id) AS visitors
       FROM analytics_events
       WHERE created_at >= ?
       GROUP BY DATE(created_at) ORDER BY date`,
      [since]
    );

    res.json({
      days,
      pageviews: totals.pageviews || 0,
      visitors: totals.visitors || 0,
      byCountry,
      byEvent,
      topPages,
      daily,
    });
  } catch (err) {
    console.error('analytics summary error:', err.message);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

module.exports = router;
