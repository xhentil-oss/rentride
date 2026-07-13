const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const fmt = (r) => ({ id: r.id, invoiceNo: r.invoice_no, reservationId: r.reservation_id, amount: r.amount, status: r.status, dueDate: r.due_date, paidAt: r.paid_at, createdAt: r.created_at, updatedAt: r.updated_at });

router.get('/', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const { status, reservationId } = req.query;
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    if (status)        { sql += ' AND status = ?';         params.push(status); }
    if (reservationId) { sql += ' AND reservation_id = ?'; params.push(reservationId); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const { limit = 200, offset = 0 } = req.query;
    params.push(...safePagination(limit, offset, 200));
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.get('/:id', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ? OR invoice_no = ?', [req.params.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Fatura nuk u gjet.' });
    res.json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager'), [
  body('invoiceNo').notEmpty().isLength({ max: 100 }),
  body('amount').isFloat({ min: 0, max: 999999 }),
  body('reservationId').notEmpty(),
  body('dueDate').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { invoiceNo, reservationId, amount, status, dueDate } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO invoices (id, invoice_no, reservation_id, amount, status, due_date, created_by) VALUES (?,?,?,?,?,?,?)', [id, invoiceNo, reservationId, amount, status || 'Pa paguar', dueDate, req.user.id]);
    await logActivity({ userId: req.user.id, action: 'CREATE', entity: 'Invoice', entityId: id, description: `Faturë e re: ${invoiceNo}`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
    res.status(201).json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), [
  body('amount').optional().isFloat({ min: 0, max: 999999 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { invoiceNo, reservationId, amount, status, dueDate } = req.body;
    const paidAt = status === 'Paguar' ? new Date() : null;
    await pool.query('UPDATE invoices SET invoice_no=?, reservation_id=?, amount=?, status=?, due_date=?, paid_at=? WHERE id=?', [invoiceNo, reservationId, amount, status, dueDate, paidAt, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Fatura nuk u gjet.' });
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Invoice', entityId: req.params.id, description: `Faturë u ndryshua: ${req.params.id}`, ipAddress: req.ip });
    res.json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'Invoice', entityId: req.params.id, description: `Faturë u fshi: ${req.params.id}`, ipAddress: req.ip });
    res.json({ message: 'Fatura u fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
