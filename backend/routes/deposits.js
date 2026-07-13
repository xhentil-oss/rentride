const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity, ADMIN_ROLES } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const toCamel = (r) => ({
  id: r.id, reservationId: r.reservation_id, customerId: r.customer_id,
  amount: r.amount, paidDate: r.paid_date, returnDate: r.return_date,
  status: r.status, note: r.note, createdBy: r.created_by,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

router.get('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM deposits ORDER BY created_at DESC LIMIT ? OFFSET ?',
      safePagination(limit, offset, 200));
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.get('/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM deposits WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Depozita nuk u gjet.' });
    res.json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { reservationId, customerId, amount, paidDate, status, note } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO deposits (id, reservation_id, customer_id, amount, paid_date, status, note, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [id, reservationId, customerId, amount, paidDate, status || 'Mbajtur', note || null, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM deposits WHERE id = ?', [id]);
    await logActivity({ userId: req.user.id, action: 'CREATE', entity: 'Deposit', entityId: id, description: `Depozitë e re: ${amount}`, ipAddress: req.ip });
    res.status(201).json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { amount, status, returnDate, note } = req.body;
    await pool.query(
      'UPDATE deposits SET amount=COALESCE(?,amount), status=COALESCE(?,status), return_date=COALESCE(?,return_date), note=COALESCE(?,note) WHERE id=?',
      [amount, status, returnDate, note, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM deposits WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Depozita nuk u gjet.' });
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Deposit', entityId: req.params.id, description: `Depozitë u ndryshua: ${req.params.id}`, ipAddress: req.ip });
    res.json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM deposits WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'Deposit', entityId: req.params.id, description: `Depozitë u fshi: ${req.params.id}`, ipAddress: req.ip });
    res.json({ message: 'Depozita u fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
