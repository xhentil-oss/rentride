// Lightweight request metadata for reservations: client IP, a human-readable
// device/browser string parsed from the User-Agent, and a best-effort country
// from the IP. No external dependencies; the country lookup is cached and has a
// short timeout so it never blocks a booking. Privacy: we store only what the
// browser sends with every request (like Elementor Forms metadata).

const geoCache = new Map(); // ip -> { country, ts }
const GEO_TTL = 24 * 60 * 60 * 1000; // 24h

function getClientIp(req) {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (xff || req.ip || req.connection?.remoteAddress || '').replace(/^::ffff:/, '');
}

// Country from a CDN/proxy header (instant, no network call). Null otherwise.
function countryFromHeaders(req) {
  const hdr = req.headers['cf-ipcountry'] || req.headers['x-geoip-country-code'] || req.headers['x-country-code'];
  return hdr && /^[A-Za-z]{2}$/.test(hdr) ? String(hdr).toUpperCase() : null;
}

// Compact "Browser • OS • Type" summary from a User-Agent string.
function parseDevice(ua) {
  if (!ua) return null;
  const s = String(ua);
  let os = 'OS i panjohur';
  if (/Windows NT 10/.test(s)) os = 'Windows 10/11';
  else if (/Windows/.test(s)) os = 'Windows';
  else if (/iPhone|iPad|iPod/.test(s)) os = 'iOS';
  else if (/Android/.test(s)) os = 'Android';
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS';
  else if (/Linux/.test(s)) os = 'Linux';
  let browser = 'Browser i panjohur';
  if (/Edg\//.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera';
  else if (/SamsungBrowser/.test(s)) browser = 'Samsung Internet';
  else if (/Chrome\//.test(s) && !/Edg\//.test(s)) browser = 'Chrome';
  else if (/Firefox\//.test(s)) browser = 'Firefox';
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = 'Safari';
  const type = /iPad|Tablet/.test(s) ? 'Tablet' : /Mobi|Android|iPhone|iPod/.test(s) ? 'Mobile' : 'Desktop';
  return `${browser} • ${os} • ${type}`;
}

// Best-effort IP → country code. Cached, 1.5s timeout, never throws.
async function lookupCountry(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) return null;
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < GEO_TTL) return cached.country;
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

module.exports = { getClientIp, countryFromHeaders, parseDevice, lookupCountry };
