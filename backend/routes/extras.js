const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');

const VALID_CATEGORIES = ['insurance', 'equipment', 'service', 'addon'];
const VALID_PRICE_TYPES = ['per_day', 'per_rental', 'one_time'];

const fmt = (r) => ({
  id: r.id,
  code: r.code,
  nameSq: r.name_sq,
  nameEn: r.name_en,
  descriptionSq: r.description_sq,
  descriptionEn: r.description_en,
  category: r.category,
  price: Number(r.price),
  priceType: r.price_type,
  icon: r.icon,
  maxQuantity: r.max_quantity,
  isActive: !!r.is_active,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// Public — only active extras, sorted for display
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM extras WHERE is_active = 1 ORDER BY category, sort_order ASC, name_sq ASC'
    );
    res.set('Cache-Control', 'public, max-age=120');
    res.json(rows.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Admin — all extras including inactive
router.get('/admin', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM extras ORDER BY category, sort_order ASC, name_sq ASC'
    );
    res.json(rows.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { code, nameSq, nameEn, descriptionSq, descriptionEn, category, price, priceType, icon, maxQuantity, isActive, sortOrder } = req.body;
    if (!code || !String(code).trim()) return res.status(400).json({ error: 'Kodi është i detyrueshëm.' });
    if (!nameSq || !String(nameSq).trim()) return res.status(400).json({ error: 'Emri (SQ) është i detyrueshëm.' });
    if (!nameEn || !String(nameEn).trim()) return res.status(400).json({ error: 'Emri (EN) është i detyrueshëm.' });
    const cat = VALID_CATEGORIES.includes(category) ? category : 'addon';
    const pt = VALID_PRICE_TYPES.includes(priceType) ? priceType : 'per_day';
    const id = uuidv4();
    try {
      await pool.query(
        'INSERT INTO extras (id, code, name_sq, name_en, description_sq, description_en, category, price, price_type, icon, max_quantity, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id, String(code).trim(), String(nameSq).trim(), String(nameEn).trim(), descriptionSq || null, descriptionEn || null, cat, Number(price) || 0, pt, icon || null, Number(maxQuantity) || 1, isActive === false ? 0 : 1, Number(sortOrder) || 0]
      );
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Kodi ekziston tashmë.' });
      throw e;
    }
    const [rows] = await pool.query('SELECT * FROM extras WHERE id = ?', [id]);
    await logActivity({ userId: req.user.id, action: 'CREATE', entity: 'Extra', entityId: id, description: `Extra u krijua: ${nameSq}`, ipAddress: req.ip });
    res.status(201).json(fmt(rows[0]));
  } catch (err) {
    console.error('POST /extras:', err.message);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { code, nameSq, nameEn, descriptionSq, descriptionEn, category, price, priceType, icon, maxQuantity, isActive, sortOrder } = req.body;
    const [existing] = await pool.query('SELECT id FROM extras WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Extra nuk u gjet.' });
    const cat = VALID_CATEGORIES.includes(category) ? category : 'addon';
    const pt = VALID_PRICE_TYPES.includes(priceType) ? priceType : 'per_day';
    try {
      await pool.query(
        'UPDATE extras SET code=?, name_sq=?, name_en=?, description_sq=?, description_en=?, category=?, price=?, price_type=?, icon=?, max_quantity=?, is_active=?, sort_order=? WHERE id=?',
        [String(code).trim(), String(nameSq).trim(), String(nameEn).trim(), descriptionSq || null, descriptionEn || null, cat, Number(price) || 0, pt, icon || null, Number(maxQuantity) || 1, isActive ? 1 : 0, Number(sortOrder) || 0, req.params.id]
      );
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Kodi ekziston tashmë.' });
      throw e;
    }
    const [rows] = await pool.query('SELECT * FROM extras WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Extra', entityId: req.params.id, description: `Extra u ndryshua: ${nameSq}`, ipAddress: req.ip });
    res.json(fmt(rows[0]));
  } catch (err) {
    console.error('PUT /extras:', err.message);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Soft delete via is_active=0 to preserve referential integrity with reservation_extras snapshots
    await pool.query('UPDATE extras SET is_active = 0 WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'Extra', entityId: req.params.id, description: `Extra u çaktivizua: ${req.params.id}`, ipAddress: req.ip });
    res.json({ message: 'Extra u çaktivizua.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

module.exports = router;
