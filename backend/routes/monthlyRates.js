const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');

const fmt = (r) => ({
  id: r.id,
  year: r.year !== null && r.year !== undefined ? parseInt(r.year) : null,
  month: parseInt(r.month),
  appliesTo: r.applies_to,
  appliesToValue: r.applies_to_value,
  pricePerDay: parseFloat(r.price_per_day),
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// Admin: get all rates
router.get('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM monthly_rates ORDER BY year, month, applies_to, applies_to_value');
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Public: rates for price calculation (no auth needed)
router.get('/public', async (req, res) => {
  try {
    const { year } = req.query;
    const yr = parseInt(year) || new Date().getFullYear();
    const [rows] = await pool.query(
      'SELECT * FROM monthly_rates WHERE year = ? OR year IS NULL ORDER BY month, applies_to',
      [yr]
    );
    res.json(rows.map(fmt));
  } catch (err) { res.status(500).json({ error: 'Gabim.' }); }
});

// Upsert: delete existing matching rate, then insert
router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { year, month, appliesTo, appliesToValue, pricePerDay, notes } = req.body;
    if (!month || pricePerDay == null) {
      return res.status(400).json({ error: 'month dhe pricePerDay janë të detyrueshme.' });
    }
    const price = parseFloat(pricePerDay);
    if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'pricePerDay duhet të jetë numër pozitiv.' });

    const yr = year || null;
    const at = appliesTo || 'all';
    const atv = appliesToValue || null;

    // Delete existing rate with same parameters (NULL-safe comparison using <=>)
    await pool.query(
      'DELETE FROM monthly_rates WHERE month = ? AND applies_to = ? AND (year <=> ?) AND (applies_to_value <=> ?)',
      [month, at, yr, atv]
    );

    const id = uuidv4();
    await pool.query(
      'INSERT INTO monthly_rates (id, year, month, applies_to, applies_to_value, price_per_day, notes, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [id, yr, month, at, atv, price, notes || null, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM monthly_rates WHERE id = ?', [id]);
    await logActivity({
      userId: req.user.id, action: 'CREATE', entity: 'MonthlyRate', entityId: id,
      description: `Çmim mujor: muaji ${month}${yr ? '/' + yr : ''} [${at}${atv ? ':' + atv : ''}] → €${price}/ditë`,
      ipAddress: req.ip,
    });
    res.status(201).json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Delete a rate by ID
router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM monthly_rates WHERE id = ?', [req.params.id]);
    await logActivity({
      userId: req.user.id, action: 'DELETE', entity: 'MonthlyRate', entityId: req.params.id,
      description: 'Çmim mujor u fshi', ipAddress: req.ip,
    });
    res.json({ message: 'U fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
