const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const VALID_CATEGORIES = ['Economy', 'Compact', 'Sedan', 'SUV', 'Luxury', 'Van', 'Convertible', 'Ekonomike', 'Luksoze', 'Familjare', 'Automatike', 'Sportive', 'Minivan'];
const VALID_TRANSMISSIONS = ['Automatic', 'Manual', 'Automatike', 'Manuale'];
const VALID_FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Benzinë', 'Benzine', 'Naftë', 'Nafte', 'Hibrid', 'Elektrik'];
const VALID_STATUSES = ['Available', 'Rented', 'Maintenance', 'Out of Service', 'Në dispozicion', 'I rezervuar', 'Në mirëmbajtje'];

const toCamel = (r) => ({
  id: r.id, brand: r.brand, model: r.model, year: r.year,
  category: r.category, transmission: r.transmission, fuel: r.fuel,
  seats: r.seats, luggage: r.luggage, pricePerDay: r.price_per_day,
  displayPrice: r.display_price != null ? Number(r.display_price) : null,
  status: r.status, image: r.image, slug: r.slug, featured: !!r.featured,
  quantity: r.quantity ?? 1, description: r.description ?? '',
  createdAt: r.created_at, updatedAt: r.updated_at,
});

router.get('/', async (req, res) => {
  try {
    const { category, status, featured, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT * FROM cars WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (status)   { sql += ' AND status = ?';   params.push(status); }
    if (featured !== undefined) { sql += ' AND featured = ?'; params.push(featured === 'true' ? 1 : 0); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(...safePagination(limit, offset, 100));
    const [rows] = await pool.query(sql, params);
    // Only cache for unauthenticated (public) requests — admin refetch must get fresh data.
    // 5min browser cache + 10min CDN cache; admin DELETE/PUT triggers refetch on UI side.
    if (!req.headers.authorization) {
      res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=60');
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cars WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Makina nuk u gjet.' });
    res.json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager'), [
  body('brand').notEmpty().isLength({ max: 100 }),
  body('model').notEmpty().isLength({ max: 100 }),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 2 }),
  body('pricePerDay').isFloat({ min: 0, max: 99999 }),
  body('seats').optional().isInt({ min: 1, max: 50 }),
  body('category').optional().isIn(VALID_CATEGORIES),
  body('transmission').optional().isIn(VALID_TRANSMISSIONS),
  body('fuel').optional().isIn(VALID_FUELS),
  body('status').optional().isIn(VALID_STATUSES),
  body('quantity').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { brand, model, year, category, transmission, fuel, seats, luggage, pricePerDay, displayPrice, status, image, slug, featured, quantity, description } = req.body;
    const id = uuidv4();
    const dispP = (displayPrice !== undefined && displayPrice !== null && displayPrice !== '') ? Number(displayPrice) : null;
    await pool.query(
      'INSERT INTO cars (id, brand, model, year, category, transmission, fuel, seats, luggage, price_per_day, display_price, status, image, slug, featured, quantity, description, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, brand, model, year, category, transmission, fuel, seats, luggage, pricePerDay, dispP, status || 'Available', image, slug, featured ? 1 : 0, quantity ?? 1, description ?? null, req.user.id]
    );
    await logActivity({ userId: req.user.id, action: 'CREATE', entity: 'Car', entityId: id, description: `Makina e re: ${brand} ${model}`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const fields = req.body;
    // Build partial update — only update fields that were actually sent
    const mapping = {
      brand: fields.brand, model: fields.model, year: fields.year,
      category: fields.category, transmission: fields.transmission, fuel: fields.fuel,
      seats: fields.seats, luggage: fields.luggage, price_per_day: fields.pricePerDay,
      display_price: fields.displayPrice !== undefined ? (fields.displayPrice === '' || fields.displayPrice === null ? null : Number(fields.displayPrice)) : undefined,
      status: fields.status, image: fields.image, slug: fields.slug,
      featured: fields.featured !== undefined ? (fields.featured ? 1 : 0) : undefined,
      quantity: fields.quantity, description: fields.description,
    };
    const entries = Object.entries(mapping).filter(([, v]) => v !== undefined);
    if (!entries.length) return res.status(400).json({ error: 'Asnjë fushë për të ndryshuar.' });
    const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([, v]) => v);
    values.push(req.params.id);
    await pool.query(`UPDATE cars SET ${setClauses} WHERE id = ?`, values);
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Car', entityId: req.params.id, description: `Makina u ndryshua: ${fields.brand || ''} ${fields.model || ''}`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    res.json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [[{ resCount }]] = await pool.query('SELECT COUNT(*) AS resCount FROM reservations WHERE car_id = ?', [req.params.id]);
    if (resCount > 0) {
      return res.status(409).json({
        error: `Makina ka ${resCount} rezervim${resCount === 1 ? '' : 'e'} të lidhura. Fshini ato më parë.`,
        code: 'HAS_REFERENCES',
        resCount,
      });
    }
    await pool.query('DELETE FROM cars WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'Car', entityId: req.params.id, description: `Makina u fshi: ${req.params.id}`, ipAddress: req.ip });
    res.json({ message: 'Makina u fshi.' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Makina ka rezervime të lidhura. Fshini ato më parë.', code: 'HAS_REFERENCES' });
    }
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

module.exports = router;
