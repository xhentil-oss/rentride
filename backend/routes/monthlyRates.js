const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { toDayKey } = require('../lib/monthlyRates');

const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

const fmt = (r) => {
  const startDate = toDayKey(r.start_date);
  const endDate = toDayKey(r.end_date);
  return {
    id: r.id,
    kind: startDate && endDate ? 'period' : 'month',
    year: r.year !== null && r.year !== undefined ? parseInt(r.year) : null,
    month: r.month !== null && r.month !== undefined ? parseInt(r.month) : null,
    startDate,
    endDate,
    label: r.label ?? null,
    appliesTo: r.applies_to,
    appliesToValue: r.applies_to_value,
    pricePerDay: parseFloat(r.price_per_day),
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validates a create/update payload and normalises it into DB column values.
// Returns { error } or { values }.
function parseRatePayload(body) {
  const { year, month, startDate, endDate, appliesTo, appliesToValue, pricePerDay, label, notes } = body;

  const price = parseFloat(pricePerDay);
  if (pricePerDay == null || isNaN(price) || price <= 0) {
    return { error: 'pricePerDay duhet të jetë numër pozitiv.' };
  }

  const sd = startDate && String(startDate).trim() !== '' ? String(startDate).trim() : null;
  const ed = endDate && String(endDate).trim() !== '' ? String(endDate).trim() : null;
  const isPeriod = Boolean(sd || ed);

  if (isPeriod) {
    if (!sd || !ed) return { error: 'Periudha kërkon si datën e fillimit ashtu edhe atë të mbarimit.' };
    if (!DATE_RE.test(sd) || !DATE_RE.test(ed)) return { error: 'Datat duhet të jenë në formatin YYYY-MM-DD.' };
    if (ed < sd) return { error: 'Data e mbarimit duhet të jetë e njëjtë ose pas datës së fillimit.' };
  } else if (!month) {
    return { error: 'month dhe pricePerDay janë të detyrueshme.' };
  } else if (parseInt(month) < 1 || parseInt(month) > 12) {
    return { error: 'month duhet të jetë 1–12.' };
  }

  return {
    values: {
      // A period carries its year in the dates themselves.
      year: isPeriod ? null : (year || null),
      month: isPeriod ? null : parseInt(month),
      startDate: sd,
      endDate: ed,
      label: label && String(label).trim() !== '' ? String(label).trim() : null,
      appliesTo: appliesTo || 'all',
      appliesToValue: appliesToValue || null,
      price,
      notes: notes || null,
      isPeriod,
    },
  };
}

const describe = (v) => {
  const scope = `${v.appliesTo}${v.appliesToValue ? ':' + v.appliesToValue : ''}`;
  const when = v.isPeriod
    ? `${v.startDate} → ${v.endDate}`
    : `muaji ${MONTHS_SQ[v.month - 1] || v.month}${v.year ? '/' + v.year : ''}`;
  return `${when} [${scope}] → €${v.price}/ditë`;
};

// Admin: get all rates (month rates + period rates)
router.get('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM monthly_rates ORDER BY start_date, year, month, applies_to, applies_to_value'
    );
    res.json(rows.map(fmt));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Public: rates for price calculation (no auth needed).
// Month rates are scoped to the requested year; period rates carry their own
// dates, so return every one that has not fully elapsed.
router.get('/public', async (req, res) => {
  try {
    const { year } = req.query;
    const yr = parseInt(year) || new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT * FROM monthly_rates
        WHERE (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= CURDATE())
           OR (start_date IS NULL AND (year = ? OR year IS NULL))
        ORDER BY start_date, month, applies_to`,
      [yr]
    );
    res.json(rows.map(fmt));
  } catch (err) { res.status(500).json({ error: 'Gabim.' }); }
});

// Create. Month rates upsert (one per month/scope, matching the matrix UI);
// period rates are always new rows — overlaps are legitimate and resolved by
// specificity at price time.
router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const parsed = parseRatePayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.values;

    if (!v.isPeriod) {
      // NULL-safe comparison using <=>
      await pool.query(
        'DELETE FROM monthly_rates WHERE month = ? AND start_date IS NULL AND applies_to = ? AND (year <=> ?) AND (applies_to_value <=> ?)',
        [v.month, v.appliesTo, v.year, v.appliesToValue]
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO monthly_rates
         (id, year, month, start_date, end_date, label, applies_to, applies_to_value, price_per_day, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, v.year, v.month, v.startDate, v.endDate, v.label, v.appliesTo, v.appliesToValue, v.price, v.notes, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM monthly_rates WHERE id = ?', [id]);
    await logActivity({
      userId: req.user.id, action: 'CREATE', entity: 'MonthlyRate', entityId: id,
      description: `${v.isPeriod ? 'Çmim periudhe' : 'Çmim mujor'}: ${describe(v)}`,
      ipAddress: req.ip,
    });
    res.status(201).json(fmt(rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Bulk: apply one price to many scopes at once — "these 8 cars share this rate"
// is a single action instead of eight rows typed by hand. `replaceIds` lets the
// editor swap a whole group; the delete and the inserts share one transaction so
// a half-written group can never survive a failure.
const MAX_BULK_SCOPES = 300;

router.post('/bulk', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  const { scopes, replaceIds } = req.body;
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return res.status(400).json({ error: 'Zgjidh të paktën një makinë ose kategori.' });
  }
  if (scopes.length > MAX_BULK_SCOPES) {
    return res.status(400).json({ error: `Maksimumi ${MAX_BULK_SCOPES} zgjedhje njëherësh.` });
  }

  // Same scope twice would create duplicate rows that resolve identically.
  const seen = new Set();
  const unique = [];
  for (const s of scopes) {
    const at = s && s.appliesTo ? String(s.appliesTo) : 'all';
    const atv = s && s.appliesToValue ? String(s.appliesToValue) : null;
    const key = `${at}:${atv ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ appliesTo: at, appliesToValue: atv });
  }

  // Validate every scope before touching the database.
  const prepared = [];
  for (const sc of unique) {
    const parsed = parseRatePayload({ ...req.body, appliesTo: sc.appliesTo, appliesToValue: sc.appliesToValue });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    prepared.push(parsed.values);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (Array.isArray(replaceIds) && replaceIds.length) {
      await conn.query('DELETE FROM monthly_rates WHERE id IN (?)', [replaceIds]);
    }

    const ids = [];
    for (const v of prepared) {
      if (!v.isPeriod) {
        await conn.query(
          'DELETE FROM monthly_rates WHERE month = ? AND start_date IS NULL AND applies_to = ? AND (year <=> ?) AND (applies_to_value <=> ?)',
          [v.month, v.appliesTo, v.year, v.appliesToValue]
        );
      }
      const id = uuidv4();
      await conn.query(
        `INSERT INTO monthly_rates
           (id, year, month, start_date, end_date, label, applies_to, applies_to_value, price_per_day, notes, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, v.year, v.month, v.startDate, v.endDate, v.label, v.appliesTo, v.appliesToValue, v.price, v.notes, req.user.id]
      );
      ids.push(id);
    }

    await conn.commit();
    conn.release();

    const [rows] = await pool.query('SELECT * FROM monthly_rates WHERE id IN (?)', [ids]);
    const first = prepared[0];
    await logActivity({
      userId: req.user.id,
      action: replaceIds && replaceIds.length ? 'UPDATE' : 'CREATE',
      entity: 'MonthlyRate',
      entityId: ids[0],
      description: `${first.isPeriod ? 'Çmim periudhe' : 'Çmim mujor'} për ${ids.length} zgjedhje: ${describe(first)}`,
      ipAddress: req.ip,
    });
    res.status(201).json(rows.map(fmt));
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Update an existing rate in place (used by the period editor)
router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM monthly_rates WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Çmimi nuk u gjet.' });

    const parsed = parseRatePayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.values;

    await pool.query(
      `UPDATE monthly_rates
          SET year = ?, month = ?, start_date = ?, end_date = ?, label = ?,
              applies_to = ?, applies_to_value = ?, price_per_day = ?, notes = ?
        WHERE id = ?`,
      [v.year, v.month, v.startDate, v.endDate, v.label, v.appliesTo, v.appliesToValue, v.price, v.notes, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM monthly_rates WHERE id = ?', [req.params.id]);
    await logActivity({
      userId: req.user.id, action: 'UPDATE', entity: 'MonthlyRate', entityId: req.params.id,
      description: `${v.isPeriod ? 'Çmim periudhe' : 'Çmim mujor'} u përditësua: ${describe(v)}`,
      ipAddress: req.ip,
    });
    res.json(fmt(rows[0]));
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
