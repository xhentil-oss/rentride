const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, ADMIN_ROLES } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const toCamel = (r) => ({
  id: r.id, customerId: r.customer_id, type: r.type,
  subject: r.subject, content: r.content, timestamp: r.timestamp,
  createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
});

router.get('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM communication_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      safePagination(limit, offset, 200));
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { customerId, type, subject, content, timestamp } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO communication_logs (id, customer_id, type, subject, content, timestamp, created_by) VALUES (?,?,?,?,?,?,?)',
      [id, customerId, type, subject, content, timestamp || new Date(), req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM communication_logs WHERE id = ?', [id]);
    res.status(201).json(toCamel(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await pool.query('DELETE FROM communication_logs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Shënimi u fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
