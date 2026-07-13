const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const fmt = (r) => ({ id: r.id, rating: r.rating, text: r.text, authorName: r.author_name, aspects: r.aspects, approved: !!r.approved, createdAt: r.created_at, updatedAt: r.updated_at });

// Public — only approved
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?', safePagination(limit, offset, 100));
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Admin — all reviews (requires auth)
router.get('/admin', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC LIMIT ? OFFSET ?',
      safePagination(limit, offset, 200));
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Public submit
router.post('/', async (req, res) => {
  try {
    const { rating, text, authorName, aspects, website } = req.body;
    // Honeypot bot protection
    if (website) return res.status(400).json({ error: 'Gabim.' });
    if (!rating || !Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Vlerësimi duhet të jetë 1-5.' });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Teksti i review-s është i detyruar.' });
    }
    if (!authorName || !authorName.trim()) {
      return res.status(400).json({ error: 'Emri i autorit është i detyruar.' });
    }
    if (text.length > 2000) return res.status(400).json({ error: 'Teksti shumë i gjatë (max 2000 karaktere).' });
    if (authorName.length > 100) return res.status(400).json({ error: 'Emri shumë i gjatë (max 100 karaktere).' });
    const id = uuidv4();
    await pool.query('INSERT INTO reviews (id, rating, text, author_name, aspects, approved) VALUES (?,?,?,?,?,0)', [id, Number(rating), text, authorName, aspects || null]);
    const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [id]);
    res.status(201).json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.patch('/:id/approve', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { approved } = req.body;
    await pool.query('UPDATE reviews SET approved = ? WHERE id = ?', [approved ? 1 : 0, req.params.id]);
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Review', entityId: req.params.id, description: `Review ${approved ? 'u aprovua' : 'u refuzua'}`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
    res.json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'Review', entityId: req.params.id, description: `Review u fshi: ${req.params.id}`, ipAddress: req.ip });
    res.json({ message: 'Review u fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
