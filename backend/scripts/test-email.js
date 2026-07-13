/**
 * Standalone SMTP test. Loads backend/.env, prints the mail config, verifies
 * the SMTP connection, and sends one test email. Use to debug why booking
 * notifications don't arrive.
 *
 * Run on the server (inside the Node venv):
 *   node backend/scripts/test-email.js rentcaralbania23@gmail.com
 * If no recipient is given, it uses ADMIN_EMAIL (or MAIL_USER).
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const nodemailer = require('nodemailer');

const to = process.argv[2] || process.env.ADMIN_EMAIL || process.env.MAIL_USER;
const port = Number(process.env.MAIL_PORT) || 587;
const secure = process.env.MAIL_SECURE
  ? String(process.env.MAIL_SECURE).toLowerCase() === 'true'
  : port === 465;

console.log('──────── SMTP config ────────');
console.log('  MAIL_HOST  :', process.env.MAIL_HOST || '(default smtp.gmail.com)');
console.log('  MAIL_PORT  :', port);
console.log('  MAIL_SECURE:', secure, port === 465 && !secure ? '⚠️ port 465 zakonisht do true' : (port === 587 && secure ? '⚠️ port 587 zakonisht do false' : ''));
console.log('  MAIL_USER  :', process.env.MAIL_USER || '❌ MUNGON');
console.log('  MAIL_PASS  :', process.env.MAIL_PASS ? `✓ (${process.env.MAIL_PASS.length} karaktere)` : '❌ MUNGON');
console.log('  MAIL_FROM  :', process.env.MAIL_FROM || '(default)');
console.log('  ADMIN_EMAIL:', process.env.ADMIN_EMAIL || '(pa vendosur → bie te MAIL_USER)');
console.log('  Dërgon te  :', to || '❌ asnjë marrës');
console.log('─────────────────────────────\n');

if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
  console.error('❌ MAIL_USER/MAIL_PASS mungojnë te backend/.env — emaili s\'mund të dërgohet.');
  process.exit(1);
}
if (!to) {
  console.error('❌ Asnjë marrës. Jep një email si argument: node backend/scripts/test-email.js you@example.com');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port,
  secure,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

(async () => {
  try {
    console.log('→ Po verifikoj lidhjen SMTP...');
    await transporter.verify();
    console.log('✓ Lidhja SMTP OK (host/port/auth në rregull)\n');
    console.log('→ Po dërgoj email test...');
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `Rent Ride <${process.env.MAIL_USER}>`,
      to,
      subject: 'Test email — Rent Ride',
      html: '<p>✅ Ky është një email test nga serveri. Nëse e merr këtë, SMTP funksionon.</p>',
    });
    console.log('✓ U DËRGUA! messageId:', info.messageId);
    console.log('  response:', info.response);
    console.log('\n👉 Kontrollo kutinë (edhe Spam) te:', to);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ DËSHTOI:', err && err.message);
    if (err && err.code) console.error('  code:', err.code);
    if (err && err.command) console.error('  command:', err.command);
    if (err && err.response) console.error('  SMTP response:', err.response);
    console.error('\nShkaqet e zakonshme:');
    console.error('  • Gmail: duhet "App Password" (jo fjalëkalimi normal) + MAIL_USER = email i plotë');
    console.error('  • Port/secure: 465→MAIL_SECURE=true, 587→MAIL_SECURE=false');
    console.error('  • Host i gabuar ose i bllokuar nga firewall i hostit');
    process.exit(1);
  }
})();
