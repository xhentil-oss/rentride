/**
 * GET /api/google-reviews
 * Fetches place reviews from Google Places API and caches them for 6 hours.
 * Requires GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID in .env
 * Falls back to empty array gracefully if not configured.
 */
const router = require('express').Router();
const https = require('https');

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache = { data: null, fetchedAt: 0 };

function fetchFromGoogle() {
  return new Promise((resolve) => {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;

    if (!key || !placeId) {
      return resolve({ rating: null, totalRatings: 0, reviews: [] });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json`
      + `?place_id=${encodeURIComponent(placeId)}`
      + `&fields=reviews,rating,user_ratings_total`
      + `&language=sq`
      + `&reviews_sort=newest`
      + `&key=${encodeURIComponent(key)}`;

    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (!json || json.status !== 'OK') {
            console.warn('[google-reviews] Places API returned status:', json?.status);
            return resolve({ rating: null, totalRatings: 0, reviews: [] });
          }
          const result = json.result ?? {};
          const reviews = (result.reviews ?? []).map((r) => ({
            authorName: r.author_name ?? 'Anonim',
            rating: r.rating ?? 5,
            text: r.text ?? '',
            time: r.time ?? 0,
            relativeTime: r.relative_time_description ?? '',
            profilePhotoUrl: r.profile_photo_url ?? null,
          }));
          resolve({
            rating: result.rating ?? null,
            totalRatings: result.user_ratings_total ?? 0,
            reviews,
          });
        } catch (e) {
          console.error('[google-reviews] Parse error:', e.message);
          resolve({ rating: null, totalRatings: 0, reviews: [] });
        }
      });
    }).on('error', (e) => {
      console.error('[google-reviews] Network error:', e.message);
      resolve({ rating: null, totalRatings: 0, reviews: [] });
    });
  });
}

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (!cache.data || now - cache.fetchedAt > TTL_MS) {
      cache.data = await fetchFromGoogle();
      cache.fetchedAt = now;
    }
    // 1h browser cache for public
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(cache.data);
  } catch (err) {
    console.error('[google-reviews] Unexpected error:', err);
    res.json({ rating: null, totalRatings: 0, reviews: [] });
  }
});

module.exports = router;
