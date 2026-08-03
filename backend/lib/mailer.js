const nodemailer = require('nodemailer');

const mailPort = Number(process.env.MAIL_PORT) || 587;
// secure=true for port 465 (TLS direct), false for 587/25 (STARTTLS).
// MAIL_SECURE env var overrides if explicitly set ("true" or "false").
const mailSecure = process.env.MAIL_SECURE
  ? String(process.env.MAIL_SECURE).toLowerCase() === 'true'
  : mailPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: mailPort,
  secure: mailSecure,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Recipients for admin notifications. ADMIN_EMAIL accepts a comma/semicolon
// separated list so several people can be notified; falls back to the SMTP
// account (the sender mails itself) when unset.
function adminRecipients() {
  const raw = process.env.ADMIN_EMAIL || process.env.MAIL_USER || '';
  return String(raw)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

// Masked snapshot of the mail config — safe to log and to expose to admins.
// Used at boot and by GET /api/email/diagnostics to answer "which address is
// actually active right now" without SSH-ing into the server.
function mailConfig() {
  const user = process.env.MAIL_USER || null;
  return {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: mailPort,
    secure: mailSecure,
    user,
    passSet: Boolean(process.env.MAIL_PASS),
    passLength: process.env.MAIL_PASS ? String(process.env.MAIL_PASS).length : 0,
    from: process.env.MAIL_FROM || (user ? `Rent Ride <${user}>` : null),
    adminEmailRaw: process.env.ADMIN_EMAIL || null,
    adminRecipients: adminRecipients(),
    configured: Boolean(process.env.MAIL_USER && process.env.MAIL_PASS),
  };
}

// Compact SMTP error detail — nodemailer hides the useful parts on `err.message`
// alone, and a bare stack tells us nothing about why the server refused.
function mailErrorDetail(err) {
  return {
    message: err?.message,
    code: err?.code,
    responseCode: err?.responseCode,
    command: err?.command,
    response: err?.response,
  };
}

async function sendMail(to, subject, html) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('⚠️  [Mail] MAIL_USER/MAIL_PASS mungojnë — email NUK u dërgua te:', to);
    return null;
  }
  if (!to) {
    console.warn('⚠️  [Mail] Asnjë marrës — email NUK u dërgua. Subjekti:', subject);
    return null;
  }
  const recipients = Array.isArray(to) ? to.join(', ') : to;
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `Rent Ride <${process.env.MAIL_USER}>`,
      to: recipients,
      subject,
      html,
    });
    // Logged on success too: without this there is no way to tell "SMTP accepted
    // it, check Spam" apart from "it never left the server".
    console.log('✉️  [Mail] dërguar →', recipients, '|', subject, '| accepted:',
      (info.accepted || []).join(',') || '—',
      '| rejected:', (info.rejected || []).join(',') || '—',
      '| id:', info.messageId);
    return info;
  } catch (err) {
    console.error('✗ [Mail] DËSHTOI →', recipients, '|', subject, mailErrorDetail(err));
    throw err;
  }
}

// Verify host/port/auth without sending. Returns {ok:true} or {ok:false, ...detail}.
async function verifyMail() {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    return { ok: false, message: 'MAIL_USER/MAIL_PASS mungojnë te backend/.env' };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...mailErrorDetail(err) };
  }
}

module.exports = { sendMail, verifyMail, mailConfig, adminRecipients, mailErrorDetail };
