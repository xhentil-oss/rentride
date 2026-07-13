const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

// ── MAINTENANCE ──────────────────────────────────────────────
router.get('/maintenance', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const { carId, status } = req.query;
    let sql = 'SELECT * FROM maintenance_records WHERE 1=1';
    const p = [];
    if (carId)  { sql += ' AND car_id = ?'; p.push(carId); }
    if (status) { sql += ' AND status = ?'; p.push(status); }
    sql += ' ORDER BY scheduled_date DESC LIMIT ? OFFSET ?';
    const { limit = 200, offset = 0 } = req.query;
    p.push(...safePagination(limit, offset, 200));
    const [rows] = await pool.query(sql, p);
    res.json(rows.map(r => ({ id: r.id, carId: r.car_id, type: r.type, status: r.status, scheduledDate: r.scheduled_date, completedDate: r.completed_date, mileageAtService: r.mileage_at_service, nextServiceMileage: r.next_service_mileage, cost: r.cost, notes: r.notes, mechanicName: r.mechanic_name, createdAt: r.created_at })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/maintenance', authenticate, requireRole('admin', 'manager', 'staff'), [
  body('carId').notEmpty(),
  body('cost').optional().isFloat({ min: 0, max: 999999 }),
  body('mileageAtService').optional().isInt({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { carId, type, status, scheduledDate, completedDate, mileageAtService, nextServiceMileage, cost, notes, mechanicName } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO maintenance_records (id, car_id, type, status, scheduled_date, completed_date, mileage_at_service, next_service_mileage, cost, notes, mechanic_name, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [id, carId, type, status || 'Scheduled', scheduledDate, completedDate, mileageAtService, nextServiceMileage, cost, notes, mechanicName, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM maintenance_records WHERE id = ?', [id]);
    res.status(201).json(rows.map(r => ({ id: r.id, carId: r.car_id, type: r.type, status: r.status, scheduledDate: r.scheduled_date, completedDate: r.completed_date, mileageAtService: r.mileage_at_service, nextServiceMileage: r.next_service_mileage, cost: r.cost, notes: r.notes, mechanicName: r.mechanic_name, createdAt: r.created_at }))[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/maintenance/:id', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { type, status, scheduledDate, completedDate, mileageAtService, nextServiceMileage, cost, notes, mechanicName } = req.body;
    await pool.query('UPDATE maintenance_records SET type=?, status=?, scheduled_date=?, completed_date=?, mileage_at_service=?, next_service_mileage=?, cost=?, notes=?, mechanic_name=? WHERE id=?', [type, status, scheduledDate, completedDate, mileageAtService, nextServiceMileage, cost, notes, mechanicName, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM maintenance_records WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Nuk u gjet.' });
    const r = rows[0];
    res.json({ id: r.id, carId: r.car_id, type: r.type, status: r.status, scheduledDate: r.scheduled_date, completedDate: r.completed_date, mileageAtService: r.mileage_at_service, nextServiceMileage: r.next_service_mileage, cost: r.cost, notes: r.notes, mechanicName: r.mechanic_name, createdAt: r.created_at });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/maintenance/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM maintenance_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'U fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// ── INSURANCE ────────────────────────────────────────────────
router.get('/insurance', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM insurance_records ORDER BY expiry_date ASC LIMIT ? OFFSET ?',
      safePagination(req.query.limit, req.query.offset, 500));
    res.json(rows.map(r => ({ id: r.id, carId: r.car_id, provider: r.provider, policyNumber: r.policy_number, startDate: r.start_date, expiryDate: r.expiry_date, cost: r.cost, type: r.type, status: r.status })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/insurance', authenticate, requireRole('admin', 'manager'), [
  body('carId').notEmpty(),
  body('cost').optional().isFloat({ min: 0, max: 999999 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { carId, provider, policyNumber, startDate, expiryDate, cost, type, status } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO insurance_records (id, car_id, provider, policy_number, start_date, expiry_date, cost, type, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)', [id, carId, provider, policyNumber, startDate, expiryDate, cost, type, status || 'Active', req.user.id]);
    const [rows] = await pool.query('SELECT * FROM insurance_records WHERE id = ?', [id]);
    const r = rows[0];
    res.status(201).json({ id: r.id, carId: r.car_id, provider: r.provider, policyNumber: r.policy_number, startDate: r.start_date, expiryDate: r.expiry_date, cost: r.cost, type: r.type, status: r.status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/insurance/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { provider, policyNumber, startDate, expiryDate, cost, type, status } = req.body;
    await pool.query('UPDATE insurance_records SET provider=?, policy_number=?, start_date=?, expiry_date=?, cost=?, type=?, status=? WHERE id=?', [provider, policyNumber, startDate, expiryDate, cost, type, status, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM insurance_records WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Nuk u gjet.' });
    const r = rows[0];
    res.json({ id: r.id, carId: r.car_id, provider: r.provider, policyNumber: r.policy_number, startDate: r.start_date, expiryDate: r.expiry_date, cost: r.cost, type: r.type, status: r.status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.delete('/insurance/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM insurance_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'U fshi.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// ── REGISTRATION ─────────────────────────────────────────────
router.get('/registration', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM registration_records ORDER BY expiry_date ASC LIMIT ? OFFSET ?',
      safePagination(req.query.limit, req.query.offset, 500));
    res.json(rows.map(r => ({ id: r.id, carId: r.car_id, plateNumber: r.plate_number, expiryDate: r.expiry_date, renewalCost: r.renewal_cost, status: r.status, notes: r.notes })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/registration', authenticate, requireRole('admin', 'manager'), [
  body('carId').notEmpty(),
  body('renewalCost').optional().isFloat({ min: 0, max: 99999 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { carId, plateNumber, expiryDate, renewalCost, status, notes } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO registration_records (id, car_id, plate_number, expiry_date, renewal_cost, status, notes, created_by) VALUES (?,?,?,?,?,?,?,?)', [id, carId, plateNumber, expiryDate, renewalCost, status || 'Valid', notes, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM registration_records WHERE id = ?', [id]);
    const r = rows[0];
    res.status(201).json({ id: r.id, carId: r.car_id, plateNumber: r.plate_number, expiryDate: r.expiry_date, renewalCost: r.renewal_cost, status: r.status, notes: r.notes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/registration/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { plateNumber, expiryDate, renewalCost, status, notes } = req.body;
    await pool.query('UPDATE registration_records SET plate_number=?, expiry_date=?, renewal_cost=?, status=?, notes=? WHERE id=?', [plateNumber, expiryDate, renewalCost, status, notes, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM registration_records WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Nuk u gjet.' });
    const r = rows[0];
    res.json({ id: r.id, carId: r.car_id, plateNumber: r.plate_number, expiryDate: r.expiry_date, renewalCost: r.renewal_cost, status: r.status, notes: r.notes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// ── FUEL LOGS ────────────────────────────────────────────────
router.get('/fuel', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const { carId } = req.query;
    let sql = 'SELECT * FROM fuel_logs WHERE 1=1';
    const p = [];
    if (carId) { sql += ' AND car_id = ?'; p.push(carId); }
    sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    const { limit = 200, offset = 0 } = req.query;
    p.push(...safePagination(limit, offset, 200));
    const [rows] = await pool.query(sql, p);
    res.json(rows.map(r => ({ id: r.id, carId: r.car_id, date: r.date, liters: r.liters, pricePerLiter: r.price_per_liter, totalCost: r.total_cost, mileage: r.mileage, fuelType: r.fuel_type, station: r.station, notes: r.notes })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/fuel', authenticate, requireRole('admin', 'manager', 'staff'), [
  body('carId').notEmpty(),
  body('liters').optional().isFloat({ min: 0, max: 9999 }),
  body('pricePerLiter').optional().isFloat({ min: 0, max: 999 }),
  body('totalCost').optional().isFloat({ min: 0, max: 99999 }),
  body('mileage').optional().isInt({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { carId, date, liters, pricePerLiter, totalCost, mileage, fuelType, station, notes } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO fuel_logs (id, car_id, date, liters, price_per_liter, total_cost, mileage, fuel_type, station, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [id, carId, date, liters, pricePerLiter, totalCost, mileage, fuelType, station, notes, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM fuel_logs WHERE id = ?', [id]);
    const r = rows[0];
    res.status(201).json({ id: r.id, carId: r.car_id, date: r.date, liters: r.liters, pricePerLiter: r.price_per_liter, totalCost: r.total_cost, mileage: r.mileage, fuelType: r.fuel_type, station: r.station, notes: r.notes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// ── DAMAGE REPORTS ───────────────────────────────────────────
router.get('/damage', authenticate, requireRole('admin', 'manager', 'staff', 'accountant'), async (req, res) => {
  try {
    const { carId, status } = req.query;
    let sql = 'SELECT * FROM damage_reports WHERE 1=1';
    const p = [];
    if (carId)  { sql += ' AND car_id = ?'; p.push(carId); }
    if (status) { sql += ' AND status = ?'; p.push(status); }
    sql += ' ORDER BY report_date DESC LIMIT ? OFFSET ?';
    const { limit = 200, offset = 0 } = req.query;
    p.push(...safePagination(limit, offset, 200));
    const [rows] = await pool.query(sql, p);
    res.json(rows.map(r => ({ id: r.id, carId: r.car_id, reservationId: r.reservation_id, reportDate: r.report_date, description: r.description, severity: r.severity, status: r.status, repairCost: r.repair_cost, photoUrls: r.photo_urls, reportedBy: r.reported_by, notes: r.notes })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.post('/damage', authenticate, requireRole('admin', 'manager', 'staff'), [
  body('carId').notEmpty(),
  body('repairCost').optional().isFloat({ min: 0, max: 999999 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { carId, reservationId, reportDate, description, severity, status, repairCost, photoUrls, reportedBy, notes } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO damage_reports (id, car_id, reservation_id, report_date, description, severity, status, repair_cost, photo_urls, reported_by, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [id, carId, reservationId, reportDate, description, severity, status || 'Reported', repairCost, photoUrls || '', reportedBy, notes, req.user.id]);
    const [rows] = await pool.query('SELECT * FROM damage_reports WHERE id = ?', [id]);
    const r = rows[0];
    res.status(201).json({ id: r.id, carId: r.car_id, reservationId: r.reservation_id, reportDate: r.report_date, description: r.description, severity: r.severity, status: r.status, repairCost: r.repair_cost, photoUrls: r.photo_urls, reportedBy: r.reported_by, notes: r.notes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/damage/:id', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { status, repairCost, notes } = req.body;
    await pool.query('UPDATE damage_reports SET status=?, repair_cost=?, notes=? WHERE id=?', [status, repairCost, notes, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM damage_reports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Nuk u gjet.' });
    const r = rows[0];
    res.json({ id: r.id, carId: r.car_id, reservationId: r.reservation_id, reportDate: r.report_date, description: r.description, severity: r.severity, status: r.status, repairCost: r.repair_cost, photoUrls: r.photo_urls, reportedBy: r.reported_by, notes: r.notes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

module.exports = router;
