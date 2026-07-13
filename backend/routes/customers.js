const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity, ADMIN_ROLES } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const fmt = (r) => ({ id: r.id, name: r.name, firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone, type: r.type, createdAt: r.created_at, updatedAt: r.updated_at });

router.get('/', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const { type, search, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(...safePagination(limit, offset, 100));
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Klienti nuk u gjet.' });
    // Non-admin can only see their own customer record
    if (!ADMIN_ROLES.includes(req.user.role) && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Nuk keni leje.' });
    }
    res.json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Public: find-or-create customer (used by booking form)
router.post('/', async (req, res) => {
  try {
    const { name, firstName, lastName, email, phone, type = 'Standard', website } = req.body;
    // Honeypot bot protection
    if (website) return res.status(400).json({ error: 'Gabim.' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email është i detyrueshëm.' });
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'Email format i pavlefshëm.' });
    if (name && name.length > 255) return res.status(400).json({ error: 'Emri shumë i gjatë.' });

    // phone is NOT NULL in DB — coerce to empty string if missing
    const safePhone = (phone || '').toString().trim().slice(0, 30);

    // Reuse existing customer by email (most common — return user signed up before)
    const [existingByEmail] = await pool.query(
      'SELECT id FROM customers WHERE email = ?', [email]
    );
    if (existingByEmail.length) {
      // Identical shape/status to prevent email enumeration
      return res.status(201).json({ id: existingByEmail[0].id });
    }

    // Reuse existing customer by phone — same person booking again with a
    // different email (or a typo) shouldn't fragment into multiple records.
    if (safePhone) {
      const [existingByPhone] = await pool.query(
        'SELECT id FROM customers WHERE phone = ?', [safePhone]
      );
      if (existingByPhone.length) {
        return res.status(201).json({ id: existingByPhone[0].id });
      }
    }

    const id = uuidv4();
    const createdBy = req.user ? req.user.id : null;
    const safeName = name || `${firstName || ''} ${lastName || ''}`.trim() || email;
    await pool.query(
      'INSERT INTO customers (id, name, first_name, last_name, email, phone, type, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [id, safeName, firstName || '', lastName || '', email, safePhone, type, createdBy]
    );
    return res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, firstName, lastName, email, phone, type } = req.body;

    // Check duplicate email (always)
    if (email) {
      const [dupEmail] = await pool.query(
        'SELECT id FROM customers WHERE email = ? AND id != ?', [email, req.params.id]
      );
      if (dupEmail.length) {
        return res.status(409).json({ error: 'Një klient me këtë email ekziston tashmë.' });
      }
    }
    // Check duplicate phone only when non-empty (avoid collisions on blank phones)
    if (phone && phone.trim()) {
      const [dupPhone] = await pool.query(
        "SELECT id FROM customers WHERE phone = ? AND phone != '' AND id != ?", [phone, req.params.id]
      );
      if (dupPhone.length) {
        return res.status(409).json({ error: 'Një klient me këtë numër telefoni ekziston tashmë.' });
      }
    }
    await pool.query(
      'UPDATE customers SET name=?, first_name=?, last_name=?, email=?, phone=?, type=? WHERE id=?',
      [name, firstName, lastName, email, phone || '', type, req.params.id]
    );
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Customer', entityId: req.params.id, description: `Klient u ndryshua: ${email}`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [[{ resCount }]] = await pool.query('SELECT COUNT(*) AS resCount FROM reservations WHERE customer_id = ?', [req.params.id]);
    const [[{ depCount }]] = await pool.query('SELECT COUNT(*) AS depCount FROM deposits WHERE customer_id = ?', [req.params.id]);
    if (resCount > 0 || depCount > 0) {
      return res.status(409).json({
        error: `Klienti ka ${resCount} rezervim${resCount === 1 ? '' : 'e'}${depCount > 0 ? ` dhe ${depCount} depozitë` : ''} të lidhura. Fshini ose anuloni ato më parë.`,
        code: 'HAS_REFERENCES',
        resCount, depCount,
      });
    }
    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'Customer', entityId: req.params.id, description: `Klient u fshi: ${req.params.id}`, ipAddress: req.ip });
    res.json({ message: 'Klienti u fshi.' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Klienti ka të dhëna të lidhura (rezervime/depozita). Fshini ato më parë.', code: 'HAS_REFERENCES' });
    }
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

module.exports = router;
