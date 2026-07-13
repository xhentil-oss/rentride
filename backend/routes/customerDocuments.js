const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, ADMIN_ROLES } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const toCamel = (r) => ({
  id: r.id, customerId: r.customer_id, documentType: r.document_type,
  fileUrl: r.file_url, expiryDate: r.expiry_date, createdBy: r.created_by,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

router.get('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM customer_documents ORDER BY created_at DESC LIMIT ? OFFSET ?',
      safePagination(limit, offset, 200));
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { customerId, documentType, fileUrl, expiryDate } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO customer_documents (id, customer_id, document_type, file_url, expiry_date, created_by) VALUES (?,?,?,?,?,?)',
      [id, customerId, documentType, fileUrl, expiryDate || null, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM customer_documents WHERE id = ?', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM customer_documents WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dokumenti u fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
