const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity, ADMIN_ROLES } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');
const { sendMail } = require('../lib/mailer');
const { getClientIp, countryFromHeaders, parseDevice, lookupCountry } = require('../lib/requestMeta');
const { surchargeForBooking } = require('../lib/pricingRules');
const tpl = require('../lib/emailTemplates');
const {
  loadLocations,
  getLocationFee,
  getAllowedLocations,
  DEFAULT_LOCATION_FEES,
  DEFAULT_FREE_LOCATIONS,
} = require('../lib/locations');

// Location fees & free locations are loaded from the `settings` table
// (keys `location_fees` + `free_locations`) so admins can manage them from
// the UI without redeploying. See backend/lib/locations.js for details.

const BLOCKING_STATUSES = ['Pending', 'Confirmed', 'Active'];

const toDateOnly = (value) => {
  if (value === null || value === undefined || value === '') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : raw;
};

const parseDateOnly = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Date e pavlefshme.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    throw new Error('Date e pavlefshme.');
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const parseTimeOnly = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) throw new Error('Ora eshte e pavlefshme.');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error('Ora eshte e pavlefshme.');
  return `${match[1]}:${match[2]}`;
};

const buildDateTime = (dateValue, timeValue) => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};

const formatDateOnlyToLocale = (value) => {
  const raw = toDateOnly(value);
  const match = String(raw || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value || '');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day).toLocaleDateString('sq-AL');
};

const fmt = (r) => ({
  id: r.id, carId: r.car_id, customerId: r.customer_id,
  pickupLocation: r.pickup_location, dropoffLocation: r.dropoff_location,
  startDate: toDateOnly(r.start_date), startTime: r.start_time,
  endDate: toDateOnly(r.end_date), endTime: r.end_time,
  flightNumber: r.flight_number || null,
  customerCountry: r.customer_country || null,
  metaIp: r.meta_ip || null,
  metaCountry: r.meta_country || null,
  metaDevice: r.meta_device || null,
  notes: r.notes, source: r.source, status: r.status,
  totalPrice: r.total_price, locationFee: r.location_fee || 0,
  insurance: r.insurance, extras: r.extras,
  discountCode: r.discount_code, paymentStatus: r.payment_status,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

// Public: minimal availability data (only active bookings, only carId + dates)
router.get('/availability', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT car_id, start_date, end_date, start_time, end_time, status FROM reservations WHERE status IN ('Pending','Confirmed','Active')"
    );
    res.json(rows.map(r => ({
      carId: r.car_id,
      startDate: toDateOnly(r.start_date),
      endDate: toDateOnly(r.end_date),
      startTime: r.start_time,
      endTime: r.end_time,
      status: r.status,
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, carId, customerId, limit = 200, offset = 0 } = req.query;
    // Single-query approach: JOIN customers so non-admins can be scoped via c.user_id
    // without an extra round-trip (fixes N+1).
    let sql = 'SELECT r.* FROM reservations r';
    const params = [];

    if (!ADMIN_ROLES.includes(req.user.role)) {
      sql += ' INNER JOIN customers c ON c.id = r.customer_id AND c.user_id = ?';
      params.push(req.user.id);
      sql += ' WHERE 1=1';
    } else {
      sql += ' WHERE 1=1';
      if (customerId) { sql += ' AND r.customer_id = ?'; params.push(customerId); }
    }

    if (status)     { sql += ' AND r.status = ?';      params.push(status); }
    if (carId)      { sql += ' AND r.car_id = ?';      params.push(carId); }
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(...safePagination(limit, offset, 200));
    const [rows] = await pool.query(sql, params);
    const out = rows.map(fmt);
    // Attach the purchased extras (insurance / equipment / add-ons) to every row
    // in one batched query, so the admin list can show what the customer bought
    // without an extra request per reservation.
    const extrasByReservation = await fetchExtrasForReservations(out.map((r) => r.id));
    for (const r of out) r.extrasDetail = extrasByReservation.get(r.id) || [];
    res.json(out);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

const mapExtraRow = (r) => ({
  id: r.id,
  extraId: r.extra_id,
  code: r.extra_code,
  name: r.extra_name,
  category: r.category,
  quantity: r.quantity,
  unitPrice: Number(r.unit_price),
  priceType: r.price_type,
  totalPrice: Number(r.total_price),
});

const EXTRAS_COLUMNS =
  'id, extra_id, extra_code, extra_name, category, quantity, unit_price, price_type, total_price';

async function fetchReservationExtras(reservationId) {
  const [rows] = await pool.query(
    `SELECT ${EXTRAS_COLUMNS} FROM reservation_extras WHERE reservation_id = ? ORDER BY category, extra_name`,
    [reservationId]
  );
  return rows.map(mapExtraRow);
}

// Batched variant for list endpoints — returns Map<reservationId, extras[]>.
async function fetchExtrasForReservations(reservationIds) {
  const grouped = new Map();
  if (!reservationIds.length) return grouped;
  const placeholders = reservationIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT reservation_id, ${EXTRAS_COLUMNS} FROM reservation_extras WHERE reservation_id IN (${placeholders}) ORDER BY category, extra_name`,
    reservationIds
  );
  for (const r of rows) {
    const list = grouped.get(r.reservation_id) || [];
    list.push(mapExtraRow(r));
    grouped.set(r.reservation_id, list);
  }
  return grouped;
}

router.get('/:id', authenticate, async (req, res) => {
  try {
    // Resolve ownership via JOIN rather than by looking up "the" customer row for
    // this user. A user can legitimately own more than one customer record, and
    // picking custRows[0] rejected their own reservation with a 403 whenever the
    // reservation belonged to any of their other records — while GET / (which
    // JOINs) happily listed it. Same pattern as POST /:id/cancel.
    const [rows] = await pool.query(
      `SELECT r.*, c.user_id AS owner_user_id
         FROM reservations r
         LEFT JOIN customers c ON c.id = r.customer_id
        WHERE r.id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Rezervimi nuk u gjet.' });
    const { owner_user_id: ownerUserId, ...reservation } = rows[0];
    if (!ADMIN_ROLES.includes(req.user.role) && ownerUserId !== req.user.id) {
      return res.status(403).json({ error: 'Nuk keni leje.' });
    }
    const out = fmt(reservation);
    out.extrasDetail = await fetchReservationExtras(req.params.id);
    res.json(out);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Public endpoint — no authenticate middleware intentionally (web booking form)
router.post('/', async (req, res) => {
  try {
    const { carId, customerId, startDate, startTime, endDate, endTime, flightNumber, country, notes, source, insurance, extras, discountCode, website, customerEmail, selectedExtras } = req.body;
    let { pickupLocation, dropoffLocation } = req.body;
    // Auto-captured request metadata (like Elementor Forms): IP, device, country.
    const metaIp = getClientIp(req);
    const metaUserAgent = (req.headers['user-agent'] || '').slice(0, 500);
    const metaDevice = parseDevice(metaUserAgent);
    const customerCountry = country ? String(country).slice(0, 100) : null;
    // Honeypot bot protection — real users never fill hidden 'website' field
    if (website) return res.status(400).json({ error: 'Gabim.' });
    if (!carId || !customerId || !pickupLocation || !dropoffLocation || !startDate || !endDate) {
      return res.status(400).json({ error: 'Fusha të detyrueshme mungojnë.' });
    }

    // Verify customerId matches a real customer, and if customerEmail provided, that they match
    const [custCheck] = await pool.query('SELECT id, email FROM customers WHERE id = ?', [customerId]);
    if (!custCheck.length) return res.status(400).json({ error: 'Klient i pavlefshëm.' });
    // Trim both sides — a stored address with stray whitespace would otherwise
    // fail this check and block a legitimate booking with a 403.
    if (customerEmail &&
        String(custCheck[0].email).trim().toLowerCase() !== String(customerEmail).trim().toLowerCase()) {
      return res.status(403).json({ error: 'Klient i pavlefshëm.' });
    }

    // Validate locations against admin-managed list (prevent arbitrary values).
    // Tolerant comparison: trim + Unicode NFC so admin-entered diacritics
    // ("Tiranë Qendër" with NBSP, or NFD-decomposed ë) still match.
    const normLoc = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const allowedRaw = await getAllowedLocations();
    const ALLOWED_LOCATIONS = allowedRaw.map(normLoc);
    const pickupNorm = normLoc(pickupLocation);
    const dropoffNorm = normLoc(dropoffLocation);
    if (!ALLOWED_LOCATIONS.includes(pickupNorm) || !ALLOWED_LOCATIONS.includes(dropoffNorm)) {
      console.warn('[reservations] Invalid location', {
        pickupLocation, dropoffLocation, pickupNorm, dropoffNorm, ALLOWED_LOCATIONS,
      });
      return res.status(400).json({ error: 'Lokacion i pavlefshëm.' });
    }
    // Use canonical spelling going forward (consistent storage + fee lookup).
    pickupLocation = allowedRaw[ALLOWED_LOCATIONS.indexOf(pickupNorm)];
    dropoffLocation = allowedRaw[ALLOWED_LOCATIONS.indexOf(dropoffNorm)];

    // Validate free-text lengths
    if (notes && String(notes).length > 1000) return res.status(400).json({ error: 'Shënime shumë të gjata.' });
    if (discountCode && String(discountCode).length > 50) return res.status(400).json({ error: 'Kodi i zbritjes i pavlefshëm.' });
    // Insurance is now sourced from the extras catalog (selectedExtras) — the
    // `insurance` field is kept only as a display label for back-compat.
    const insuranceNorm = insurance ? String(insurance).trim().slice(0, 100) : null;
    if (extras && String(extras).length > 500) return res.status(400).json({ error: 'Ekstra shumë të gjata.' });

    // Convert incoming date values to YYYY-MM-DD without timezone shifting.
    const parseDateOnly = (value) => {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (!match) throw new Error('Datë e pavlefshme.');
      const [year, month, day] = match[1].split('-').map(Number);
      const dt = new Date(year, month - 1, day);
      if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
        throw new Error('Datë e pavlefshme.');
      }
      return match[1];
    };
    const parseTimeOnly = (value) => {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{2}):(\d{2})$/);
      if (!match) throw new Error('Ora është e pavlefshme.');
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error('Ora është e pavlefshme.');
      return `${match[1]}:${match[2]}`;
    };
    const buildDateTime = (dateValue, timeValue) => {
      const [year, month, day] = dateValue.split('-').map(Number);
      const [hours, minutes] = timeValue.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    };
    const formatDateOnlyToLocale = (value) => {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return String(value || '');
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      return new Date(year, month - 1, day).toLocaleDateString('sq-AL');
    };
    let sd, ed, st, et;
    try {
      sd = parseDateOnly(startDate);
      ed = parseDateOnly(endDate);
      st = parseTimeOnly(startTime || '10:00');
      et = parseTimeOnly(endTime || '10:00');
    } catch {
      return res.status(400).json({ error: 'Datat ose oraret janë të pavlefshme.' });
    }
    const startDateTime = buildDateTime(sd, st);
    const endDateTime = buildDateTime(ed, et);
    if (startDateTime < new Date()) {
      return res.status(400).json({ error: 'Data dhe ora e nisjes nuk mund te jene ne te kaluaren.' });
    }
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: 'Data dhe ora e mbarimit duhet të jenë pas datës dhe orës së fillimit.' });
    }

    // ── Transaction with row lock to prevent double-booking ──
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the car row to prevent concurrent bookings
      const [carRows] = await conn.query('SELECT id, brand, model, price_per_day, quantity, category FROM cars WHERE id = ? FOR UPDATE', [carId]);
      if (!carRows.length) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Makina nuk u gjet.' }); }
      const basePricePerDay = Number(carRows[0].price_per_day);
      const carQuantity = Number(carRows[0].quantity) || 1;
      const carCategory = carRows[0].category;

      // Monthly rate override (car-specific > category > all), resolved PER DAY so
      // a booking spanning two months is charged each month's own rate
      // (e.g. 29 Jun–10 Jul = June rate × June days + July rate × July days).
      const [allMonthlyRates] = await conn.query(
        'SELECT applies_to, applies_to_value, price_per_day, month, year FROM monthly_rates'
      );
      const rateForDay = (month, year) => {
        const matching = allMonthlyRates.filter(
          (r) => Number(r.month) === month && (r.year === null || Number(r.year) === year)
        );
        const car = matching.find((r) => r.applies_to === 'car' && r.applies_to_value === carId);
        if (car) return Number(car.price_per_day);
        const cat = matching.find((r) => r.applies_to === 'category' && r.applies_to_value === carCategory);
        if (cat) return Number(cat.price_per_day);
        const all = matching.find((r) => r.applies_to === 'all');
        if (all) return Number(all.price_per_day);
        return basePricePerDay;
      };

      const msPerDay = 86400000;
      // Daily rental: any partial day = full day (industry standard). 5h = 1 day, 25h = 2 days.
      const days = Math.max(1, Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / msPerDay));
      // Sum each day at its own month's rate.
      let rentalSubtotal = 0;
      const dayCursor = new Date(startDateTime);
      dayCursor.setHours(0, 0, 0, 0);
      for (let i = 0; i < days; i += 1) {
        rentalSubtotal += rateForDay(dayCursor.getMonth() + 1, dayCursor.getFullYear());
        dayCursor.setDate(dayCursor.getDate() + 1);
      }
      rentalSubtotal = Math.round(rentalSubtotal * 100) / 100;
      const locationFee = await getLocationFee(pickupLocation, dropoffLocation);

      // ── Resolve selected extras server-side (never trust client prices) ──
      const extrasRequested = Array.isArray(selectedExtras) ? selectedExtras : [];
      let extrasTotal = 0;
      const extrasResolved = [];
      if (extrasRequested.length > 0) {
        const ids = extrasRequested.map((x) => String(x.extraId)).filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const [extraRows] = await conn.query(
            `SELECT id, code, name_sq, name_en, category, price, price_type, max_quantity FROM extras WHERE id IN (${placeholders}) AND is_active = 1`,
            ids
          );
          const byId = new Map(extraRows.map((r) => [r.id, r]));
          for (const sel of extrasRequested) {
            const row = byId.get(sel.extraId);
            if (!row) continue;
            const qty = Math.max(1, Math.min(Number(sel.quantity) || 1, Number(row.max_quantity) || 1));
            const unit = Number(row.price);
            const multiplier = row.price_type === 'per_day' ? days : 1;
            const lineTotal = +(unit * qty * multiplier).toFixed(2);
            extrasTotal += lineTotal;
            extrasResolved.push({
              extraId: row.id,
              code: row.code,
              name: row.name_sq,
              category: row.category,
              quantity: qty,
              unitPrice: unit,
              priceType: row.price_type,
              totalPrice: lineTotal,
            });
          }
        }
      }

      // Admin-configured surcharge (e.g. short-rental / length-of-stay). Applied
      // server-side so the higher price is actually charged, not just displayed.
      const { amount: surchargeAmount } = await surchargeForBooking({
        carId, carCategory, startDate: startDateTime, endDate: endDateTime,
        days, bookingDate: new Date(), rentalSubtotal,
      });
      const totalPrice = +(rentalSubtotal + surchargeAmount + locationFee + extrasTotal).toFixed(2);
      // Build legacy comma-separated extras string for back-compat with old views
      const extrasLegacy = extrasResolved.length > 0
        ? extrasResolved.map((e) => e.quantity > 1 ? `${e.name} x${e.quantity}` : e.name).join(', ')
        : (extras || '');

      // Count overlapping reservations vs car quantity, including time-of-day when available.
      const [overlap] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM reservations
         WHERE car_id = ?
           AND status IN ('Pending','Confirmed','Active')
           AND (
             (start_date < ? OR (start_date = ? AND start_time < ?))
             AND
             (end_date > ? OR (end_date = ? AND end_time > ?))
           )`,
        [carId, ed, ed, et, sd, sd, st]
      );
      if (overlap[0].cnt >= carQuantity) {
        await conn.rollback(); conn.release();
        return res.status(409).json({ error: 'Makina nuk është e disponueshme për këto data.' });
      }

      const id = uuidv4();
      await conn.query(
        'INSERT INTO reservations (id, car_id, customer_id, pickup_location, dropoff_location, start_date, start_time, end_date, end_time, flight_number, customer_country, meta_ip, meta_device, meta_user_agent, notes, source, total_price, location_fee, insurance, extras, discount_code, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id, carId, customerId, pickupLocation, dropoffLocation, sd, st, ed, et, (flightNumber ? String(flightNumber).slice(0, 30) : null), customerCountry, metaIp || null, metaDevice || null, metaUserAgent || null, notes || null, source || 'Web', totalPrice, locationFee, insuranceNorm || null, extrasLegacy, discountCode || null, null]
      );

      // Persist selected extras with price snapshot
      for (const e of extrasResolved) {
        await conn.query(
          'INSERT INTO reservation_extras (id, reservation_id, extra_id, extra_code, extra_name, category, quantity, unit_price, price_type, total_price) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [uuidv4(), id, e.extraId, e.code, e.name, e.category, e.quantity, e.unitPrice, e.priceType, e.totalPrice]
        );
      }

      await conn.commit();
      conn.release();

      const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id]);
      const [custRows] = await pool.query('SELECT name, email, phone FROM customers WHERE id = ?', [customerId]);
      const fmtLocale = formatDateOnlyToLocale;
      const carName = `${carRows[0].brand || ''} ${carRows[0].model || ''}`.trim();

      // ── Customer confirmation ──
      if (custRows.length && custRows[0].email) {
        sendMail(
          custRows[0].email,
          'Konfirmim Rezervimi — Rent Ride',
          tpl.bookingConfirmation({
            customerName: custRows[0].name,
            carName,
            pickupLocation,
            dropoffLocation,
            startDate: fmtLocale(sd),
            endDate: fmtLocale(ed),
            startTime: st,
            endTime: et,
            totalPrice,
            insurance: insurance || null,
            reservationId: id,
          })
        ).catch((e) => console.error('[Email] booking confirmation failed:', e));
      }

      // ── Admin notification ──
      const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_USER;
      if (adminEmail) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://rentride.al';
        // Resolve the visitor's country from IP (best-effort, non-blocking) and
        // persist it, then send the admin email with all device/connection meta.
        (async () => {
          let metaCountry = countryFromHeaders(req);
          if (!metaCountry) metaCountry = await lookupCountry(metaIp);
          if (metaCountry) {
            try { await pool.query('UPDATE reservations SET meta_country = ? WHERE id = ?', [metaCountry, id]); } catch {}
          }
          await sendMail(
            adminEmail,
            `🔔 Rezervim i ri — ${carName} — €${totalPrice}`,
            tpl.adminBookingNotification({
              reservationId: id,
              customerName: custRows[0]?.name || 'Klient',
              customerEmail: custRows[0]?.email || customerEmail || '',
              customerPhone: custRows[0]?.phone || '',
              carName,
              carCategory: carRows[0].category || '',
              pickupLocation,
              dropoffLocation,
              startDate: fmtLocale(sd),
              startTime: st,
              endDate: fmtLocale(ed),
              endTime: et,
              days,
              totalPrice,
              locationFee,
              insurance: insurance || '',
              extrasList: extrasResolved.map((e) => ({ name: e.name, quantity: e.quantity, totalPrice: e.totalPrice })),
              source: source || 'Web',
              flightNumber: flightNumber ? String(flightNumber).slice(0, 30) : null,
              customerCountry,
              metaIp,
              metaCountry,
              metaDevice,
              adminPanelUrl: `${frontendUrl}/admin/rezervime`,
            })
          );
        })().catch((e) => console.error('[Email] admin notification failed:', e));
      }

      const outBody = fmt(rows[0]);
      outBody.extrasDetail = extrasResolved;
      res.status(201).json(outBody);
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

const VALID_STATUSES = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];

// Fire-and-forget status-change email to the customer. Safe to call from any
// status-change path (PATCH or PUT) — only sends for Confirmed/Cancelled/Completed.
function notifyStatusChange(reservationId, status) {
  if (!['Confirmed', 'Cancelled', 'Completed'].includes(status)) return;
  pool.query(
    `SELECT r.total_price, r.pickup_location, r.start_date, r.end_date,
            cu.name AS customer_name, cu.email AS customer_email,
            ca.brand, ca.model
     FROM reservations r
     JOIN customers cu ON cu.id = r.customer_id
     JOIN cars ca ON ca.id = r.car_id
     WHERE r.id = ?`,
    [reservationId]
  ).then(([eRows]) => {
    if (!eRows.length || !eRows[0].customer_email) return;
    const r = eRows[0];
    const emailData = {
      customerName: r.customer_name,
      carName: `${r.brand} ${r.model}`,
      startDate: formatDateOnlyToLocale(r.start_date),
      endDate: formatDateOnlyToLocale(r.end_date),
      pickupLocation: r.pickup_location,
      totalPrice: r.total_price,
      reservationId,
    };
    if (status === 'Confirmed') {
      sendMail(r.customer_email, 'Rezervimi u konfirmua — Rent Ride', tpl.reservationConfirmed(emailData)).catch((e) => console.error('[Email] confirmed failed:', e?.message));
    } else if (status === 'Cancelled') {
      sendMail(r.customer_email, 'Rezervimi u anulua — Rent Ride', tpl.reservationCancelled(emailData)).catch((e) => console.error('[Email] cancelled failed:', e?.message));
    } else if (status === 'Completed') {
      sendMail(r.customer_email, 'Fatura juaj — Rent Ride', tpl.invoiceEmail({
        ...emailData,
        invoiceNo: `INV-${String(reservationId).slice(0, 8).toUpperCase()}`,
      })).catch((e) => console.error('[Email] invoice failed:', e?.message));
    }
  }).catch((e) => console.error('[Email] status-change query failed:', e?.message));
}

// Customer self-cancel: own reservation only, only if not yet Active/Completed.
// Admin/manager/staff use PATCH /:id/status with full freedom.
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.customer_id, c.user_id
       FROM reservations r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Rezervimi nuk u gjet.' });
    const r = rows[0];
    const isAdmin = ['admin', 'manager', 'staff'].includes(req.user.role);
    const isOwner = r.user_id && r.user_id === req.user.id;
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Nuk keni leje për këtë rezervim.' });
    if (r.status !== 'Pending' && r.status !== 'Confirmed') {
      return res.status(409).json({ error: 'Vetëm rezervimet "Pending" ose "Confirmed" mund të anulohen vetë. Kontaktoni stafin për ndihmë.', code: 'NOT_CANCELLABLE' });
    }
    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', ['Cancelled', req.params.id]);
    await logActivity({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Reservation',
      entityId: req.params.id,
      description: isAdmin ? `Anuluar nga admin` : `Anuluar nga klienti vetë`,
      ipAddress: req.ip,
    });
    const [updated] = await pool.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    res.json(fmt(updated[0]));
    notifyStatusChange(req.params.id, 'Cancelled');
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.patch('/:id/status', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Statusi duhet të jetë një nga: ${VALID_STATUSES.join(', ')}` });
    }
    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Reservation', entityId: req.params.id, description: `Status ndryshoi në: ${status}`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    res.json(fmt(rows[0]));
    notifyStatusChange(req.params.id, status);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const fmtDate = (d) => {
      if (!d) return undefined;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) throw new Error('Datë e pavlefshme.');
      return dt.toISOString().slice(0, 10);
    };
    let sd, ed, st, et;
    try {
      sd = req.body.startDate ? parseDateOnly(req.body.startDate) : undefined;
      ed = req.body.endDate ? parseDateOnly(req.body.endDate) : undefined;
      st = req.body.startTime ? parseTimeOnly(req.body.startTime) : undefined;
      et = req.body.endTime ? parseTimeOnly(req.body.endTime) : undefined;
    } catch { return res.status(400).json({ error: 'Datat janë të pavlefshme.' }); }

    const fields = {
      car_id: req.body.carId,
      customer_id: req.body.customerId,
      pickup_location: req.body.pickupLocation,
      dropoff_location: req.body.dropoffLocation,
      start_date: sd,
      start_time: st,
      end_date: ed,
      end_time: et,
      flight_number: req.body.flightNumber !== undefined ? (req.body.flightNumber ? String(req.body.flightNumber).slice(0, 30) : null) : undefined,
      notes: req.body.notes,
      source: req.body.source,
      status: req.body.status,
      insurance: req.body.insurance,
      extras: req.body.extras,
      discount_code: req.body.discountCode,
      payment_status: req.body.paymentStatus,
    };
    // Validate status if provided
    if (fields.status && !VALID_STATUSES.includes(fields.status)) {
      return res.status(400).json({ error: `Statusi duhet të jetë një nga: ${VALID_STATUSES.join(', ')}` });
    }
    // Insurance is sourced from the extras catalog — accept any reasonable
    // label here (display only) without a hardcoded whitelist.
    if (fields.insurance) {
      fields.insurance = String(fields.insurance).trim().slice(0, 100);
    }
    // Validate source if provided
    const ALLOWED_SOURCES = ['Web', 'Telefon', 'Walk-in'];
    if (fields.source && !ALLOWED_SOURCES.includes(fields.source)) {
      return res.status(400).json({ error: `Burimi duhet të jetë një nga: ${ALLOWED_SOURCES.join(', ')}` });
    }

    // Validate locations if provided
    if (fields.pickup_location || fields.dropoff_location) {
      const normLoc = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
      const allowedRaw = await getAllowedLocations();
      const ALLOWED_LOCATIONS = allowedRaw.map(normLoc);
      if (fields.pickup_location) {
        const norm = normLoc(fields.pickup_location);
        if (!ALLOWED_LOCATIONS.includes(norm)) return res.status(400).json({ error: 'Lokacion i pavlefshëm.' });
        fields.pickup_location = allowedRaw[ALLOWED_LOCATIONS.indexOf(norm)];
      }
      if (fields.dropoff_location) {
        const norm = normLoc(fields.dropoff_location);
        if (!ALLOWED_LOCATIONS.includes(norm)) return res.status(400).json({ error: 'Lokacion i pavlefshëm.' });
        fields.dropoff_location = allowedRaw[ALLOWED_LOCATIONS.indexOf(norm)];
      }
    }

    // Transaction with row lock for date/car changes
    const conn = await pool.getConnection();
    let prevStatus = null;
    try {
      await conn.beginTransaction();

      // Validate customer exists if being changed
      if (fields.customer_id) {
        const [custCheck] = await conn.query('SELECT id FROM customers WHERE id = ?', [fields.customer_id]);
        if (!custCheck.length) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Klient i pavlefshëm.' }); }
      }

      const [currentRows] = await conn.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!currentRows.length) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Rezervimi nuk u gjet.' }); }
      const current = currentRows[0];
      prevStatus = current.status;
      const newCarId = fields.car_id || current.car_id;
      const newSd = fields.start_date || toDateOnly(current.start_date);
      const newEd = fields.end_date || toDateOnly(current.end_date);
      const newSt = fields.start_time || current.start_time || '10:00';
      const newEt = fields.end_time || current.end_time || '10:00';
      const newStatus = fields.status || current.status;
      const scheduleOrCarChanged = fields.car_id || fields.start_date || fields.end_date || fields.start_time || fields.end_time;
      const locationChanged = fields.pickup_location || fields.dropoff_location;
      const statusBecomesBlocking = fields.status && BLOCKING_STATUSES.includes(fields.status) && !BLOCKING_STATUSES.includes(current.status);
      const newStartDateTime = buildDateTime(newSd, newSt);
      const newEndDateTime = buildDateTime(newEd, newEt);
      if (newEndDateTime <= newStartDateTime) {
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: 'Data dhe ora e mbarimit duhet te jene pas dates dhe ores se fillimit.' });
      }

      if (scheduleOrCarChanged || locationChanged || statusBecomesBlocking) {
        // Lock car row and check overlap
        const [carRows] = await conn.query('SELECT price_per_day, quantity, category FROM cars WHERE id = ? FOR UPDATE', [newCarId]);
        if (!carRows.length) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Makina nuk u gjet.' }); }
        const carQuantity = Number(carRows[0].quantity) || 1;

        if (BLOCKING_STATUSES.includes(newStatus) && (scheduleOrCarChanged || statusBecomesBlocking)) {
          const [overlap] = await conn.query(
          `SELECT COUNT(*) AS cnt FROM reservations
           WHERE car_id = ?
             AND id != ?
             AND status IN ('Pending','Confirmed','Active')
             AND (
               (start_date < ? OR (start_date = ? AND start_time < ?))
               AND
               (end_date > ? OR (end_date = ? AND end_time > ?))
             )`,
          [newCarId, req.params.id, newEd, newEd, newEt, newSd, newSd, newSt]
        );
        if (overlap[0].cnt >= carQuantity) {
          await conn.rollback(); conn.release();
          return res.status(409).json({ error: 'Makina nuk është e disponueshme për këto data.' });
        }
        }
        // Monthly rate override for new dates — resolved PER DAY so a booking
        // spanning two months charges each month's own rate.
        const basePrice = Number(carRows[0].price_per_day);
        const newCategory = carRows[0].category;
        const [allMonthlyRates] = await conn.query(
          'SELECT applies_to, applies_to_value, price_per_day, month, year FROM monthly_rates'
        );
        const rateForDay = (month, year) => {
          const matching = allMonthlyRates.filter(
            (r) => Number(r.month) === month && (r.year === null || Number(r.year) === year)
          );
          const car = matching.find((r) => r.applies_to === 'car' && r.applies_to_value === newCarId);
          if (car) return Number(car.price_per_day);
          const cat = matching.find((r) => r.applies_to === 'category' && r.applies_to_value === newCategory);
          if (cat) return Number(cat.price_per_day);
          const all = matching.find((r) => r.applies_to === 'all');
          if (all) return Number(all.price_per_day);
          return basePrice;
        };

        const msPerDay = 86400000;
        const days = Math.max(1, Math.ceil((newEndDateTime.getTime() - newStartDateTime.getTime()) / msPerDay));
        let rentalSubtotal = 0;
        const dayCursor = new Date(newStartDateTime);
        dayCursor.setHours(0, 0, 0, 0);
        for (let i = 0; i < days; i += 1) {
          rentalSubtotal += rateForDay(dayCursor.getMonth() + 1, dayCursor.getFullYear());
          dayCursor.setDate(dayCursor.getDate() + 1);
        }
        rentalSubtotal = Math.round(rentalSubtotal * 100) / 100;
        const newPickup = fields.pickup_location || current.pickup_location;
        const newDropoff = fields.dropoff_location || current.dropoff_location;
        const newLocationFee = await getLocationFee(newPickup, newDropoff);
        fields.location_fee = newLocationFee;
        const { amount: surchargeAmount } = await surchargeForBooking({
          carId: newCarId, carCategory: newCategory, startDate: newStartDateTime, endDate: newEndDateTime,
          days, bookingDate: new Date(), rentalSubtotal,
        });
        fields.total_price = +(rentalSubtotal + surchargeAmount + newLocationFee).toFixed(2);
      }

      const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
      if (!entries.length) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Asnjë fushë për të ndryshuar.' }); }
      const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
      const values = entries.map(([, v]) => v);
      values.push(req.params.id);
      await conn.query(`UPDATE reservations SET ${setClauses} WHERE id = ?`, values);

      await conn.commit();
      conn.release();
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }

    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'Reservation', entityId: req.params.id, description: `Rezervim u ndryshua`, ipAddress: req.ip });
    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    res.json(fmt(rows[0]));

    // Notify customer when status changed via PUT (admin UI uses PUT, not PATCH)
    if (req.body.status && req.body.status !== prevStatus) {
      notifyStatusChange(req.params.id, req.body.status);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Gabim i brendshëm.' }); }
});

// Soft-cancel only: reservations are NEVER physically deleted. The DELETE verb
// is kept for backward compatibility with the admin UI, but it just sets the
// status to 'Cancelled' so history/invoices/deposits stay intact.
router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE reservations SET status = 'Cancelled' WHERE id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Rezervimi nuk u gjet.' });
    await logActivity({ userId: req.user.id, action: 'CANCEL', entity: 'Reservation', entityId: req.params.id, description: `Rezervim u anulua: ${req.params.id}`, ipAddress: req.ip });
    res.json({ error: null, message: 'Rezervimi u anulua.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Expose loader hooks for other modules (e.g. settings public endpoint).
// Properties on a router are ignored by Express but available via require().
router.loadLocations = loadLocations;
// Deprecated direct references — kept for backward compatibility with any
// caller that imported them previously. Reflect defaults only; use
// `loadLocations()` for live values.
router.LOCATION_FEES = DEFAULT_LOCATION_FEES;
router.FREE_LOCATIONS = DEFAULT_FREE_LOCATIONS;

// ─── Bulk import (one-time migration, e.g. from VikRentCar) ───────────────
// Admin/manager only. Accepts already-parsed + car-mapped rows from the admin
// import UI and creates customers + reservations. Deduplicates by (source,
// import_ref) so re-running the same file never double-imports. Each row is
// isolated in its own try/catch so one bad row can't abort the batch.
router.post('/import', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || !rows.length) return res.status(400).json({ error: 'Asnjë rresht për të importuar.' });
    if (rows.length > 2000) return res.status(400).json({ error: 'Shumë rreshta njëherësh (maksimumi 2000).' });

    const source = String(req.body?.source || 'VikRentCar').slice(0, 30);
    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const rowLabel = r.importRef ? `#${r.importRef}` : `rresht ${i + 1}`;
      try {
        if (!r.carId) { results.errors.push(`${rowLabel}: makina nuk është e mapuar.`); continue; }
        if (!r.startDate || !r.endDate) { results.errors.push(`${rowLabel}: mungon data.`); continue; }

        // Car must exist (FK is NOT NULL)
        const [carRows] = await pool.query('SELECT id FROM cars WHERE id = ?', [r.carId]);
        if (!carRows.length) { results.errors.push(`${rowLabel}: makina nuk u gjet.`); continue; }

        // Dedupe by source + import_ref
        if (r.importRef) {
          const [dup] = await pool.query(
            'SELECT id FROM reservations WHERE source = ? AND import_ref = ? LIMIT 1',
            [source, String(r.importRef)]
          );
          if (dup.length) { results.skipped++; continue; }
        }

        // ── Find-or-create customer ──
        const c = r.customer || {};
        const email = (c.email || '').toString().trim().toLowerCase();
        const phone = (c.phone || '').toString().trim().slice(0, 30);
        const fullName = (c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || email || 'Klient').slice(0, 255);

        let customerId = null;
        if (email) {
          const [byEmail] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
          if (byEmail.length) customerId = byEmail[0].id;
        }
        if (!customerId && phone) {
          const [byPhone] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
          if (byPhone.length) customerId = byPhone[0].id;
        }
        if (!customerId) {
          customerId = uuidv4();
          // email is required by schema — synthesize a stable placeholder when absent
          const safeEmail = email || `import-${source.toLowerCase()}-${r.importRef || uuidv4().slice(0, 8)}@import.local`;
          await pool.query(
            'INSERT INTO customers (id, name, first_name, last_name, email, phone, type, created_by) VALUES (?,?,?,?,?,?,?,?)',
            [customerId, fullName, (c.firstName || '').slice(0, 100), (c.lastName || '').slice(0, 100), safeEmail, phone, 'Standard', req.user.id]
          );
        }

        // ── Insert reservation ──
        const id = uuidv4();
        const status = /cancel|anul/i.test(r.status || '') ? 'Cancelled'
          : /pend|pritje/i.test(r.status || '') ? 'Pending'
          : 'Confirmed';
        const total = Number(r.total) || 0;
        const paid = Number(r.totalPaid) || 0;
        const paymentStatus = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending Payment';
        const notes = [r.notes, r.dob ? `Data e lindjes: ${r.dob}` : '', c.address ? `Adresa: ${c.address}` : '', c.city ? `Qyteti: ${c.city}` : '', c.zip ? `Zip: ${c.zip}` : '']
          .filter(Boolean).join(' · ').slice(0, 2000) || null;

        await pool.query(
          `INSERT INTO reservations
            (id, car_id, customer_id, pickup_location, dropoff_location, start_date, start_time, end_date, end_time,
             flight_number, notes, source, import_ref, status, total_price, payment_status, customer_country, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id, r.carId, customerId,
            (r.pickup || '').slice(0, 255) || '—', (r.dropoff || '').slice(0, 255) || '—',
            r.startDate, (r.startTime || '00:00').slice(0, 10), r.endDate, (r.endTime || '00:00').slice(0, 10),
            (r.flightNumber || '').slice(0, 30) || null, notes,
            source, r.importRef ? String(r.importRef).slice(0, 64) : null,
            status, total, paymentStatus, (c.country || '').slice(0, 100) || null, req.user.id,
          ]
        );
        results.created++;
      } catch (rowErr) {
        console.error('import row error', rowLabel, rowErr.message);
        results.errors.push(`${rowLabel}: ${rowErr.code || rowErr.message}`);
      }
    }

    await logActivity({ userId: req.user.id, action: 'IMPORT', entity: 'Reservation', entityId: null, description: `Import rezervimesh (${source}): ${results.created} të reja, ${results.skipped} kaluar, ${results.errors.length} gabime`, ipAddress: req.ip });
    res.json(results);
  } catch (err) {
    console.error('POST /reservations/import error:', err.message, err.code);
    res.status(500).json({ error: 'Gabim i brendshëm gjatë importit.' });
  }
});

module.exports = router;
