const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const fmt = (r) => ({
  id: r.id,
  conversationId: r.conversation_id,
  text: r.text,
  isFromAdmin: !!r.is_from_admin,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

router.get('/', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { conversationId, limit = 200, offset = 0 } = req.query;
    const [safeLim, safeOff] = safePagination(limit, offset, 200);
    let sql = 'SELECT * FROM chat_messages WHERE 1=1';
    const params = [];
    if (conversationId) { sql += ' AND conversation_id = ?'; params.push(conversationId); }
    sql += ' ORDER BY created_at ASC LIMIT ? OFFSET ?';
    params.push(safeLim, safeOff);
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { conversationId, text, isFromAdmin } = req.body;
    if (!conversationId || !text) {
      return res.status(400).json({ error: 'conversationId dhe text janë të detyrueshme.' });
    }
    const id = uuidv4();
    await pool.query(
      'INSERT INTO chat_messages (id, conversation_id, text, is_from_admin, created_by) VALUES (?,?,?,?,?)',
      [id, conversationId, text, isFromAdmin ? 1 : 0, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [id]);
    res.status(201).json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM chat_messages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Mesazhi u fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
