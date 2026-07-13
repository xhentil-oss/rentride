const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const toCamel = (r) => ({ id: r.id, userId: r.user_id, userName: r.user_name, userEmail: r.user_email, action: r.action, entity: r.entity, entityId: r.entity_id, description: r.description, ipAddress: r.ip_address, timestamp: r.timestamp });

router.get('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { entity, action, userId, limit = 100, offset = 0 } = req.query;
    let sql = `SELECT al.*, u.name as user_name, u.email as user_email
               FROM activity_logs al
               LEFT JOIN users u ON al.user_id = u.id
               WHERE 1=1`;
    const p = [];
    if (entity) { sql += ' AND al.entity = ?'; p.push(entity); }
    if (action) { sql += ' AND al.action = ?'; p.push(action); }
    if (userId) { sql += ' AND al.user_id = ?'; p.push(userId); }
    sql += ' ORDER BY al.timestamp DESC LIMIT ? OFFSET ?';
    p.push(...safePagination(limit, offset, 100));
    const [rows] = await pool.query(sql, p);
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { action, entity, entityId, description } = req.body;
    if (!action || !entity) return res.status(400).json({ error: 'action dhe entity janë të detyrueshme.' });
    const id = uuidv4();
    await pool.query(
      'INSERT INTO activity_logs (id, user_id, action, entity, entity_id, description, ip_address, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [id, req.user.id, action, entity, entityId || null, description || null, req.ip]
    );
    res.status(201).json({ id, message: 'Log u krijua.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
