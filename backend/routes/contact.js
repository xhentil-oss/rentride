const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { sendMail } = require('../lib/mailer');
const { contactForm } = require('../lib/emailTemplates');
const { t } = require('../lib/i18n');

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  // rate-limit responses are sent without our req context — use a generic
  // bilingual fallback. The middleware doesn't have access to t() at config
  // time. We provide a handler that runs with req available instead.
  handler: (req, res) => {
    res.status(429).json({ error: t(req, 'contact.rateLimited') });
  },
});

router.post('/', contactLimiter, async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: t(req, 'contact.missingFields') });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: t(req, 'contact.invalidEmail') });
  }
  if (String(message).trim().length < 10 || String(message).length > 2000) {
    return res.status(400).json({ error: t(req, 'contact.messageLength') });
  }

  try {
    const to = process.env.MAIL_USER;
    await sendMail(
      to,
      `Kontakt: ${String(subject).slice(0, 80)} — ${String(name).slice(0, 80)}`,
      contactForm({ fromName: name, fromEmail: email, fromPhone: phone, subject, message })
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Contact]', err);
    res.status(500).json({ error: t(req, 'contact.sendFailed') });
  }
});

module.exports = router;
