const router = require('express').Router();
const pool = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendMail, verifyMail, mailConfig, adminRecipients, mailErrorDetail } = require('../lib/mailer');
const { pickupReminder, adminBookingNotification } = require('../lib/emailTemplates');

// Format a date-only string (YYYY-MM-DD) or Date as sq-AL without timezone shift.
function formatDateOnlyLocale(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      .toLocaleDateString('sq-AL');
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('sq-AL');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

// GET /api/email/diagnostics — admin-only. Shows the mail config the RUNNING
// process actually holds (env is read at boot, so this also proves whether the
// last .env edit was picked up) and verifies the SMTP connection.
router.get('/diagnostics', authenticate, requireRole('admin'), async (req, res) => {
  const cfg = mailConfig();
  const smtp = await verifyMail();
  res.json({
    ...cfg,
    smtp,
    hint: !cfg.configured
      ? 'MAIL_USER/MAIL_PASS mungojnë te backend/.env — asnjë email nuk dërgohet.'
      : !smtp.ok
        ? 'Lidhja SMTP dështoi — shiko `smtp` (host/port/secure ose fjalëkalimi).'
        : !cfg.adminRecipients.length
          ? 'SMTP OK, por ADMIN_EMAIL/MAIL_USER nuk kanë email të vlefshëm.'
          : 'Konfigurimi duket në rregull. Provo POST /api/email/test.',
  });
});

// POST /api/email/test — admin-only. Sends the real "new booking" template to the
// configured admin address with dummy data, so a failure here isolates the mail
// path from the booking path.
router.post('/test', authenticate, requireRole('admin'), async (req, res) => {
  const to = isValidEmail(req.body?.to) ? String(req.body.to).trim() : adminRecipients();
  if (!to || (Array.isArray(to) && !to.length)) {
    return res.status(400).json({ error: 'Asnjë marrës: vendos ADMIN_EMAIL te backend/.env ose dërgo {"to":"you@example.com"}.' });
  }
  if (!mailConfig().configured) {
    return res.status(503).json({ error: 'MAIL_USER/MAIL_PASS mungojnë te backend/.env.' });
  }
  try {
    const info = await sendMail(to, '🔔 TEST — Rezervim i ri (Rent Ride)', adminBookingNotification({
      reservationId: 'TEST0000',
      customerName: 'Klient Test',
      customerEmail: 'klient@example.com',
      customerPhone: '+355 69 000 0000',
      carName: 'Test Makina',
      carCategory: 'Economy',
      pickupLocation: 'Tiranë',
      dropoffLocation: 'Tiranë',
      startDate: '01.01.2026',
      startTime: '10:00',
      endDate: '03.01.2026',
      endTime: '10:00',
      days: 2,
      totalPrice: 100,
      locationFee: 0,
      insurance: '',
      extrasList: [],
      source: 'Test',
      adminPanelUrl: `${process.env.FRONTEND_URL || 'https://rentride.al'}/admin/rezervime`,
    }));
    res.json({
      ok: true,
      sentTo: Array.isArray(to) ? to : [to],
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      messageId: info?.messageId || null,
      note: 'Nëse nuk mbërrin, kontrollo Spam dhe log-un e serverit.',
    });
  } catch (err) {
    res.status(502).json({ error: 'Dërgimi dështoi.', detail: mailErrorDetail(err) });
  }
});

// POST /api/email/pickup-reminder/:id — admin sends 24h reminder for one reservation
router.post('/pickup-reminder/:id', authenticate, requireRole('admin', 'manager', 'staff'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.pickup_location, r.start_date, r.start_time,
              cu.name AS customer_name, cu.email AS customer_email,
              ca.brand, ca.model
       FROM reservations r
       JOIN customers cu ON cu.id = r.customer_id
       JOIN cars ca ON ca.id = r.car_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rezervimi nuk u gjet.' });

    const r = rows[0];
    if (!isValidEmail(r.customer_email)) {
      return res.status(400).json({ error: 'Klienti nuk ka email të vlefshëm.' });
    }
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      return res.status(503).json({ error: 'Email nuk është konfiguruar në server.' });
    }

    try {
      await sendMail(
        r.customer_email,
        'Kujtesë: Makina juaj nesër — Rent Ride',
        pickupReminder({
          customerName: r.customer_name,
          carName: `${r.brand} ${r.model}`,
          pickupLocation: r.pickup_location,
          startDate: formatDateOnlyLocale(r.start_date),
          startTime: r.start_time,
          reservationId: r.id,
        })
      );
    } catch (mailErr) {
      console.error('[Email Reminder SMTP]', {
        message: mailErr?.message,
        code: mailErr?.code,
        responseCode: mailErr?.responseCode,
        command: mailErr?.command,
      });
      return res.status(502).json({ error: 'Dërgimi i email-it dështoi. Kontrolloni konfigurimin SMTP.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Email Reminder]', err);
    res.status(500).json({ error: 'Gabim i brendshëm gjatë dërgimit.' });
  }
});

module.exports = router;
