const router = require('express').Router();
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { loadLocations, invalidateLocationCache } = require('../lib/locations');

// Settings keys whose value is a JSON object/array — stored as JSON strings
// in the DB so frontend can edit them structurally.
const JSON_SETTING_KEYS = new Set(['location_fees', 'free_locations', 'location_modes']);

// GET all settings (admin only)
router.get('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value, category, updated_at FROM settings ORDER BY category, setting_key');
    // Group by category
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = {};
      grouped[row.category][row.setting_key] = row.setting_value;
    }
    res.json({ settings: grouped, raw: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// PUT — bulk upsert settings
router.put('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { settings } = req.body; // { "key": "value", ... }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Formati i gabuar. Dërgo { settings: { key: value } }' });
    }

    const entries = Object.entries(settings);
    let locationsTouched = false;
    for (const [key, value] of entries) {
      // Determine category from key prefix (e.g. smtp_host → smtp, company_name → company)
      const category = key.split('_')[0] || 'general';
      // JSON-typed settings: accept objects/arrays directly and stringify;
      // also accept already-stringified JSON.
      let storedValue;
      if (JSON_SETTING_KEYS.has(key)) {
        if (typeof value === 'string') {
          try { JSON.parse(value); storedValue = value; }
          catch { return res.status(400).json({ error: `Vlerë JSON e pavlefshme për ${key}.` }); }
        } else if (value && typeof value === 'object') {
          storedValue = JSON.stringify(value);
        } else {
          return res.status(400).json({ error: `Vlerë JSON e pavlefshme për ${key}.` });
        }
        locationsTouched = true;
      } else {
        storedValue = String(value);
      }
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value, category, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), category = VALUES(category), updated_by = VALUES(updated_by)',
        [key, storedValue, JSON_SETTING_KEYS.has(key) ? 'booking' : category, req.user.id]
      );
    }

    if (locationsTouched) invalidateLocationCache();

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Settings',
      entityId: 'bulk',
      description: `Settings u ndryshuan: ${entries.map(([k]) => k).join(', ')}`,
      ipAddress: req.ip,
    });

    // Return updated settings
    const [rows] = await pool.query('SELECT setting_key, setting_value, category, updated_at FROM settings ORDER BY category, setting_key');
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = {};
      grouped[row.category][row.setting_key] = row.setting_value;
    }
    res.json({ settings: grouped, message: 'Settings u ruajtën.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// GET public company info (no auth needed — for footer, contact page, etc.)
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM settings WHERE category IN ('company','homepage','banner','logo') OR setting_key IN ('company_name','company_phone','company_email','company_address','company_website','social_facebook','social_instagram','social_tiktok','homepage_featured_cars','banner_hero','banner_about','booking_contract_enabled','booking_discount_code_enabled','fleet_default_sort','logo_url')"
    );
    const data = {};
    for (const row of rows) {
      data[row.setting_key] = row.setting_value;
    }

    // Single source of truth for location fees — always read live (DB-backed,
    // 60s cache) so admin updates propagate to the booking UI within a minute.
    try {
      const { fees, free, modes } = await loadLocations();
      data.location_fees = fees;
      data.free_locations = free;
      data.location_modes = modes || {};
    } catch (_) { /* non-fatal */ }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate'); // ndryshimet e admin-it te reflektohen menjehere
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
