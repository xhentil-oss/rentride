const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const VALID_TYPES = ['seasonal', 'duration', 'early_bird', 'last_minute', 'promo_code', 'loyalty', 'length_of_stay', 'weekend', 'min_duration'];
const VALID_DISCOUNT_TYPES = ['percentage', 'percent', 'fixed'];

const fmt = (r) => ({
  id: r.id, name: r.name, type: r.type, discountType: r.discount_type,
  discountValue: r.discount_value, direction: r.direction || 'discount',
  startDate: r.start_date, endDate: r.end_date,
  minDays: r.min_days, maxDays: r.max_days, advanceBookingDays: r.advance_booking_days,
  lastMinuteHours: r.last_minute_hours, promoCode: r.promo_code,
  applicableTo: r.applicable_to, isActive: !!r.is_active, priority: r.priority,
  description: r.description, usageCount: r.usage_count, maxUsages: r.max_usages,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pricing_rules WHERE is_active = 1 ORDER BY priority DESC, created_at DESC');
    // Hide promo codes and sensitive fields from public.
    // No caching: admin toggles (activate/deactivate a rule) must take effect
    // immediately on the public site — a shared/CDN cache would delay them.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(rows.map(r => ({
      id: r.id, name: r.name, type: r.type, discountType: r.discount_type,
      discountValue: r.discount_value, direction: r.direction || 'discount',
      startDate: r.start_date, endDate: r.end_date,
      minDays: r.min_days, maxDays: r.max_days,
      applicableTo: r.applicable_to, isActive: !!r.is_active, priority: r.priority,
      description: r.description,
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Admin GET — full data including promo codes
router.get('/admin', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM pricing_rules ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?',
      safePagination(limit, offset, 200));
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, type, discountType, discountValue, direction, startDate, endDate, minDays, maxDays, advanceBookingDays, lastMinuteHours, promoCode, applicableTo, isActive, priority, description, maxUsages } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Emri është i detyrueshëm.' });
    const id = uuidv4();
    const sd = startDate && startDate !== '' ? startDate : null;
    const ed = endDate && endDate !== '' ? endDate : null;
    const dir = direction === 'surcharge' ? 'surcharge' : 'discount';
    const dv = (discountValue !== undefined && discountValue !== null) ? Number(discountValue) : 0;
    const dt = discountType || 'percent';
    await pool.query(
      'INSERT INTO pricing_rules (id, name, type, discount_type, discount_value, direction, start_date, end_date, min_days, max_days, advance_booking_days, last_minute_hours, promo_code, applicable_to, is_active, priority, description, max_usages, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, String(name).trim(), type || 'seasonal', dt, dv, dir, sd, ed, minDays || null, maxDays || null, advanceBookingDays || null, lastMinuteHours || null, promoCode || null, applicableTo || 'all', isActive ? 1 : 0, priority || 0, description || null, maxUsages || 0, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM pricing_rules WHERE id = ?', [id]);
    await logActivity({ userId: req.user.id, action: 'CREATE', entity: 'PricingRule', entityId: id, description: `Rregull çmimi u krijua: ${name}`, ipAddress: req.ip });
    res.status(201).json(fmt(rows[0]));
  } catch (err) { console.error('POST /pricing-rules error:', err.message, err.code); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const b = req.body || {};
    // Partial update — only touch the fields actually sent. This lets a simple
    // toggle send just { isActive } without wiping the other columns (which
    // previously bound `undefined` and threw a 500).
    const map = {
      name: b.name,
      type: b.type,
      discount_type: b.discountType,
      discount_value: b.discountValue,
      direction: b.direction === undefined ? undefined : (b.direction === 'surcharge' ? 'surcharge' : 'discount'),
      start_date: b.startDate === undefined ? undefined : (b.startDate && b.startDate !== '' ? b.startDate : null),
      end_date: b.endDate === undefined ? undefined : (b.endDate && b.endDate !== '' ? b.endDate : null),
      min_days: b.minDays === undefined ? undefined : (b.minDays || null),
      max_days: b.maxDays === undefined ? undefined : (b.maxDays || null),
      advance_booking_days: b.advanceBookingDays === undefined ? undefined : (b.advanceBookingDays || null),
      last_minute_hours: b.lastMinuteHours === undefined ? undefined : (b.lastMinuteHours || null),
      promo_code: b.promoCode === undefined ? undefined : (b.promoCode || null),
      applicable_to: b.applicableTo === undefined ? undefined : (b.applicableTo || 'all'),
      is_active: b.isActive === undefined ? undefined : (b.isActive ? 1 : 0),
      priority: b.priority === undefined ? undefined : (b.priority || 0),
      description: b.description === undefined ? undefined : (b.description || null),
      max_usages: b.maxUsages === undefined ? undefined : (b.maxUsages || 0),
    };
    const entries = Object.entries(map).filter(([, v]) => v !== undefined);
    if (!entries.length) return res.status(400).json({ error: 'Asnjë fushë për të ndryshuar.' });
    const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([, v]) => v);
    values.push(req.params.id);
    await pool.query(`UPDATE pricing_rules SET ${setClause} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM pricing_rules WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Rregulli nuk u gjet.' });
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'PricingRule', entityId: req.params.id, description: `Rregull çmimi u ndryshua: ${rows[0].name}`, ipAddress: req.ip });
    res.json(fmt(rows[0]));
  } catch (err) { console.error('PUT /pricing-rules error:', err.message, err.code); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Called when a pricing rule is applied during booking — requires auth
router.post('/:id/use', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, max_usages, usage_count, is_active FROM pricing_rules WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Rregulli nuk u gjet.' });
    const rule = rows[0];
    if (!rule.is_active) return res.status(400).json({ error: 'Rregulli nuk eshte aktiv.' });
    if (rule.max_usages > 0 && rule.usage_count >= rule.max_usages) {
      return res.status(400).json({ error: 'Kufiri i perdorimeve eshte arritur.' });
    }
    await pool.query('UPDATE pricing_rules SET usage_count = usage_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'usage_count +1' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM pricing_rules WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'PricingRule', entityId: req.params.id, description: `Rregull çmimi u fshi: ${req.params.id}`, ipAddress: req.ip });
    res.json({ error: null, message: 'Rregulli u fshi.' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Rregulli ka rezervime që e përdorin. Ç\'aktivizojeni në vend që ta fshini.', code: 'HAS_REFERENCES' });
    }
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

module.exports = router;
