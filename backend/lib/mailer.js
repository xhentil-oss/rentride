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

async function sendMail(to, subject, html) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('⚠️  Email not configured — skipping mail to:', to);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || `Rent Ride <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
