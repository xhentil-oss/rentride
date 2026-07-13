const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const otplib = require('otplib');
const authenticator = otplib.authenticator || (otplib.default && otplib.default.authenticator);
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');

// Make this route resilient when Passenger/cPanel starts the process from a
// different working directory than /backend.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const GOOGLE_ENV_PATHS = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function readGoogleClientIdFromEnvFiles() {
  for (const envPath of GOOGLE_ENV_PATHS) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      const clientId = cleanEnvValue(parsed.GOOGLE_CLIENT_ID || parsed.VITE_GOOGLE_CLIENT_ID);
      if (clientId) return clientId;
    } catch {
      // Ignore unreadable env files; the route will return the normal config error.
    }
  }
  return '';
}

function getGoogleConfigDiagnostics() {
  return {
    processGoogleClientId: Boolean(cleanEnvValue(process.env.GOOGLE_CLIENT_ID)),
    processViteGoogleClientId: Boolean(cleanEnvValue(process.env.VITE_GOOGLE_CLIENT_ID)),
    envFileGoogleClientId: Boolean(readGoogleClientIdFromEnvFiles()),
  };
}

function getGoogleClientId() {
  return (
    readGoogleClientIdFromEnvFiles()
    || cleanEnvValue(process.env.GOOGLE_CLIENT_ID)
    || cleanEnvValue(process.env.VITE_GOOGLE_CLIENT_ID)
  );
}

function getGoogleClient() {
  const clientId = getGoogleClientId();
  return clientId ? new OAuth2Client(clientId) : null;
}

if (authenticator) authenticator.options = { window: 1 }; // Allow ±30s clock drift

// Simple HTML escape for email templates (prevent XSS via user-supplied name)
const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// OTP brute-force tracking is persisted in DB columns users.otp_failed_attempts /
// users.otp_locked_until (see migrate.js) — survives server restarts and works
// across multiple Node processes.
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 15;
const pool = require('../database/db');
const { authenticate, logActivity, ADMIN_ROLES } = require('../middleware/auth');
const { sendMail } = require('../lib/mailer');
const { BCRYPT_ROUNDS, REFRESH_TOKEN_EXPIRY_MS } = require('../lib/helpers');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ─── Cookie options ───────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' };
const ACCESS_MAX_AGE  = 60 * 60 * 1000;
const REFRESH_MAX_AGE = REFRESH_TOKEN_EXPIRY_MS;

function setAuthCookies(res, access, refresh) {
  res.cookie('rct_token', access, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE });
  res.cookie('rct_refresh_token', refresh, { ...COOKIE_OPTS, maxAge: REFRESH_MAX_AGE });
}

function clearAuthCookies(res) {
  res.clearCookie('rct_token', COOKIE_OPTS);
  res.clearCookie('rct_refresh_token', COOKIE_OPTS);
}

const makeTokens = (userId) => {
  const access = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const refresh = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { access, refresh };
};

// ─── POST /api/auth/register ─────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email i pavlefshëm').isLength({ max: 255 }).withMessage('Email tepër i gjatë'),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Fjalëkalimi duhet të ketë min 8 karaktere'),
    body('name').trim().notEmpty().withMessage('Emri është i detyrueshëm').isLength({ max: 100 }).withMessage('Emri tepër i gjatë'),
    // `checkFalsy: true` treats empty string / null / 0 as missing so the
    // "(opsional)" phone field doesn't block registration when left blank.
    body('phone').optional({ checkFalsy: true }).isLength({ max: 30 }).withMessage('Numri i telefonit tepër i gjatë'),
    body('locale').optional().isIn(['sq', 'en']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Normalize: trim + lowercase email so "User@X.com" and "user@x.com" don't
    // create duplicate accounts and login always finds the user.
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const password = req.body.password;
    const phone = req.body.phone ? String(req.body.phone).trim() : '';
    const locale = req.body.locale === 'en' ? 'en' : 'sq';
    const role = 'customer';

    try {
      const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length) return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });

      // Phone uniqueness — only enforced against already-linked customer accounts.
      if (phone) {
        const [existingPhone] = await pool.query(
          'SELECT id FROM customers WHERE phone = ? AND user_id IS NOT NULL AND email <> ? LIMIT 1',
          [phone, email]
        );
        if (existingPhone.length) return res.status(409).json({ error: 'Ky numër telefoni është tashmë i regjistruar.' });
      }

      // A `customers` row with this email is COMMON: it's created every time
      // someone books as a guest. We don't refuse — we attach that existing
      // customer record to the new user account so booking history is kept.
      // If the customer is already linked to another user, then it's a genuine
      // duplicate — refuse.
      const [existingCust] = await pool.query('SELECT id, user_id FROM customers WHERE email = ?', [email]);
      let customerId;
      let reusedCustomer = false;
      if (existingCust.length) {
        if (existingCust[0].user_id) {
          return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });
        }
        customerId = existingCust[0].id;
        reusedCustomer = true;
      } else {
        customerId = uuidv4();
      }

      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = uuidv4();
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyTokenHash = hashToken(verifyToken);
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const nameParts = name.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        try {
          await conn.query(
            'INSERT INTO users (id, email, name, password, role, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, email, name, hash, role, verifyTokenHash, verifyExpires]
          );
        } catch (insErr) {
          // Race: two simultaneous registers passed the SELECT check.
          // Return a friendly 409 instead of the generic 500.
          if (insErr && insErr.code === 'ER_DUP_ENTRY') {
            await conn.rollback(); conn.release();
            return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });
          }
          throw insErr;
        }

        if (reusedCustomer) {
          // Attach existing guest customer to the new user, filling in any
          // missing name/phone fields without overwriting non-empty data.
          await conn.query(
            'UPDATE customers SET user_id = ?, name = COALESCE(NULLIF(name, ""), ?), first_name = COALESCE(NULLIF(first_name, ""), ?), last_name = COALESCE(NULLIF(last_name, ""), ?), phone = COALESCE(NULLIF(phone, ""), ?) WHERE id = ?',
            [userId, name, firstName, lastName, phone, customerId]
          );
        } else {
          await conn.query(
            'INSERT INTO customers (id, name, first_name, last_name, email, phone, type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [customerId, name, firstName, lastName, email, phone, 'Standard', userId]
          );
        }

        const { access, refresh } = makeTokens(userId);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
        await conn.query(
          'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
          [uuidv4(), userId, hashToken(refresh), expiresAt]
        );

        await conn.commit();
        conn.release();

        // Send verification email (non-blocking)
        const frontendUrl = process.env.FRONTEND_URL || 'https://rentride.al';
        const verifyLink = `${frontendUrl}/api/auth/verify-email?token=${verifyToken}&locale=${locale}`;
        sendMail(email, 'Verifiko emailin tënd — Rent Ride', `
          <p>Mirë se vini, <strong>${escapeHtml(name)}</strong>!</p>
          <p>Klikoni linkun më poshtë për të verifikuar emailin tuaj:</p>
          <p><a href="${verifyLink}" style="color:#2563eb">Verifiko emailin</a></p>
          <p>Linku skudon pas 24 orësh.</p>
        `).catch(() => {});

        setAuthCookies(res, access, refresh);
        await logActivity({ userId, action: 'CREATE', entity: 'Customer', entityId: customerId, description: `Regjistrim klienti: ${email}`, ipAddress: req.ip });

        return res.status(201).json({
          user: { id: userId, email, name, role, customerId, email_verified: 0 },
        });
      } catch (txErr) {
        await conn.rollback();
        conn.release();
        throw txErr;
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { password } = req.body;
    // Normalize: same rules as /register so users still log in after the
    // email-normalization rollout, regardless of how they typed the email.
    const email = String(req.body.email || '').trim().toLowerCase();

    try {
      const [rows] = await pool.query(
        'SELECT id, email, name, role, password, is_active, two_factor_enabled, two_factor_secret, permissions, failed_attempts, locked_until, email_verified FROM users WHERE email = ?',
        [email]
      );
      if (!rows.length) return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar.' });

      const user = rows[0];
      if (!user.is_active) return res.status(403).json({ error: 'Llogaria juaj është çaktivizuar.' });

      // Account lockout check
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
        return res.status(423).json({ error: `Llogaria është bllokuar. Provoni pas ${remaining} minutash.` });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        const attempts = (user.failed_attempts || 0) + 1;
        if (attempts >= 5) {
          const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          await pool.query('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, user.id]);
          return res.status(423).json({ error: 'Shumë përpjekje të gabuara. Llogaria u bllokua për 15 minuta.' });
        }
        await pool.query('UPDATE users SET failed_attempts = ? WHERE id = ?', [attempts, user.id]);
        return res.status(401).json({ error: `Email ose fjalëkalim i gabuar. (${5 - attempts} përpjekje të mbetura)` });
      }

      // Reset lockout on success
      await pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?', [user.id]);
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()', [user.id]);

      await logActivity({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, description: `Login: ${email}`, ipAddress: req.ip });

      // 2FA required — issue a short-lived temp token instead of full session
      if (user.two_factor_enabled) {
        const tempToken = jwt.sign(
          { userId: user.id, type: '2fa_pending' },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );
        return res.json({ requires2fa: true, tempToken });
      }

      const { access, refresh } = makeTokens(user.id);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
      await pool.query(
        'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [uuidv4(), user.id, hashToken(refresh), expiresAt]
      );

      let customerId = null;
      if (!ADMIN_ROLES.includes(user.role)) {
        const [cust] = await pool.query('SELECT id FROM customers WHERE user_id = ?', [user.id]);
        if (cust.length) customerId = cust[0].id;
      }

      setAuthCookies(res, access, refresh);
      return res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions, customerId, email_verified: user.email_verified },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
    }
  }
);

// ─── POST /api/auth/login-2fa ─────────────────────────────────
router.post('/login-2fa', async (req, res) => {
  const { tempToken, otp } = req.body;
  if (!tempToken || !otp) return res.status(400).json({ error: 'tempToken dhe OTP janë të detyrueshme.' });

  try {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token i pavlefshëm ose ka skaduar.' });
    }

    if (decoded.type !== '2fa_pending') return res.status(401).json({ error: 'Token i pavlefshëm.' });

    // OTP brute-force protection — persisted in DB (survives restarts / multi-process)
    const [rows] = await pool.query(
      'SELECT id, email, name, role, permissions, two_factor_secret, email_verified, otp_failed_attempts, otp_locked_until FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'Llogaria nuk ekziston.' });

    const user = rows[0];
    if (!user.two_factor_secret) return res.status(400).json({ error: '2FA nuk është konfiguruar.' });

    // Check existing OTP lockout
    if (user.otp_locked_until && new Date(user.otp_locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.otp_locked_until) - Date.now()) / 60000);
      return res.status(429).json({ error: `Shumë përpjekje të gabuara OTP. Provoni pas ${remaining} minutash.` });
    }

    const valid = authenticator.check(otp, user.two_factor_secret);
    if (!valid) {
      const attempts = (user.otp_failed_attempts || 0) + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000);
        await pool.query(
          'UPDATE users SET otp_failed_attempts = ?, otp_locked_until = ? WHERE id = ?',
          [attempts, lockedUntil, user.id]
        );
        return res.status(429).json({ error: `Shumë përpjekje të gabuara OTP. Llogaria u bllokua për ${OTP_LOCK_MINUTES} minuta.` });
      }
      await pool.query('UPDATE users SET otp_failed_attempts = ? WHERE id = ?', [attempts, user.id]);
      return res.status(401).json({ error: `Kodi OTP është i gabuar. (${OTP_MAX_ATTEMPTS - attempts} përpjekje të mbetura)` });
    }
    // Reset OTP counters on success
    await pool.query('UPDATE users SET otp_failed_attempts = 0, otp_locked_until = NULL WHERE id = ?', [user.id]);

    const { access, refresh } = makeTokens(user.id);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, hashToken(refresh), expiresAt]
    );

    let customerId = null;
    if (!ADMIN_ROLES.includes(user.role)) {
      const [cust] = await pool.query('SELECT id FROM customers WHERE user_id = ?', [user.id]);
      if (cust.length) customerId = cust[0].id;
    }

    setAuthCookies(res, access, refresh);
    return res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions, customerId, email_verified: user.email_verified },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
  }
});

// ─── Passwordless email-code login (admin/staff only) ────────────
// Staff request a 6-digit code by email, then exchange it for a session — no
// password needed. Customers cannot use this path. The code is stored hashed
// (bcrypt), single-use, expires in 10 min, and reuses the OTP brute-force
// counters (otp_failed_attempts / otp_locked_until).
const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;

router.post('/login-code/request', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  // Generic response regardless of outcome → no account enumeration.
  const generic = { ok: true, message: 'Nëse ekziston një llogari stafi me këtë email, kodi u dërgua.' };
  if (!email) return res.status(400).json({ error: 'Email është i detyrueshëm.' });
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, role, is_active FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    if (!user || !user.is_active || !ADMIN_ROLES.includes(user.role)) {
      return res.json(generic);
    }
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expires = new Date(Date.now() + LOGIN_CODE_TTL_MS);
    await pool.query(
      'UPDATE users SET login_code_hash = ?, login_code_expires = ?, otp_failed_attempts = 0, otp_locked_until = NULL WHERE id = ?',
      [codeHash, expires, user.id]
    );
    sendMail(
      user.email,
      'Kodi i hyrjes — Rent Ride',
      `<div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Përshëndetje ${escapeHtml(user.name)},</p>
        <p>Kodi juaj i hyrjes në panel:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
        <p style="color:#6b7280;font-size:14px">Kodi skadon për 10 minuta. Nëse nuk e kërkuat ju, injorojeni këtë email.</p>
      </div>`
    ).catch((e) => console.error('[Email] login code failed:', e?.message));
    await logActivity({ userId: user.id, action: 'LOGIN_CODE_REQUEST', entity: 'User', entityId: user.id, description: `Kërkesë kod hyrjeje: ${email}`, ipAddress: req.ip });
    return res.json(generic);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
  }
});

router.post('/login-code/verify', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Email dhe kodi janë të detyrueshme.' });
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, role, permissions, is_active, login_code_hash, login_code_expires, otp_failed_attempts, otp_locked_until, email_verified FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    if (!user || !user.is_active || !ADMIN_ROLES.includes(user.role)) {
      return res.status(401).json({ error: 'Email ose kod i gabuar.' });
    }
    if (user.otp_locked_until && new Date(user.otp_locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.otp_locked_until) - Date.now()) / 60000);
      return res.status(429).json({ error: `Shumë përpjekje të gabuara. Provoni pas ${remaining} minutash.` });
    }
    if (!user.login_code_hash || !user.login_code_expires || new Date(user.login_code_expires) < new Date()) {
      return res.status(401).json({ error: 'Kodi ka skaduar. Kërkoni një kod të ri.' });
    }
    const valid = await bcrypt.compare(code, user.login_code_hash);
    if (!valid) {
      const attempts = (user.otp_failed_attempts || 0) + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000);
        await pool.query('UPDATE users SET otp_failed_attempts = ?, otp_locked_until = ? WHERE id = ?', [attempts, lockedUntil, user.id]);
        return res.status(429).json({ error: `Shumë përpjekje të gabuara. Llogaria u bllokua për ${OTP_LOCK_MINUTES} minuta.` });
      }
      await pool.query('UPDATE users SET otp_failed_attempts = ? WHERE id = ?', [attempts, user.id]);
      return res.status(401).json({ error: `Kodi është i gabuar. (${OTP_MAX_ATTEMPTS - attempts} përpjekje të mbetura)` });
    }
    // Success — consume code, reset counters, issue a full session.
    await pool.query(
      'UPDATE users SET login_code_hash = NULL, login_code_expires = NULL, otp_failed_attempts = 0, otp_locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );
    const { access, refresh } = makeTokens(user.id);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, hashToken(refresh), expiresAt]
    );
    await logActivity({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, description: `Login me kod email: ${email}`, ipAddress: req.ip });
    setAuthCookies(res, access, refresh);
    return res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions, customerId: null, email_verified: user.email_verified },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.rct_refresh_token;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token mungon.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const hashedToken = hashToken(refreshToken);
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
      [hashedToken, decoded.userId]
    );
    if (!rows.length) {
      // Reuse-detection: token is JWT-valid but not in DB → it was already rotated.
      // Treat as theft attempt and invalidate the whole token family for this user.
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [decoded.userId]).catch(() => {});
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token i pavlefshëm ose ka skaduar.' });
    }

    const { access, refresh: newRefresh } = makeTokens(decoded.userId);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [hashedToken]);
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), decoded.userId, hashToken(newRefresh), expiresAt]
    );

    setAuthCookies(res, access, newRefresh);
    return res.json({ ok: true });
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Refresh token i pavlefshëm.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    const refreshToken = req.cookies?.rct_refresh_token;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [hashToken(refreshToken)]);
    }
    clearAuthCookies(res);
    await logActivity({ userId: req.user.id, action: 'LOGOUT', entity: 'User', entityId: req.user.id, description: `Logout: ${req.user.email}`, ipAddress: req.ip });
    return res.json({ message: 'U shkyçët me sukses.' });
  } catch (err) {
    return res.status(500).json({ error: 'Gabim gjatë shkyçjes.' });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────
// Sign in / sign up with a Google ID token (credential from Google Identity Services).
// The frontend obtains this token client-side via the GSI button or one-tap.
// On success we issue our own access + refresh JWT cookies just like /login.
router.post('/google', async (req, res) => {
  const GOOGLE_CLIENT_ID = getGoogleClientId();
  const googleClient = getGoogleClient();

  if (!googleClient) {
    return res.status(500).json({
      error: 'Google Sign-In nuk është i konfiguruar.',
      code: 'GOOGLE_CLIENT_ID_MISSING',
      diagnostics: getGoogleConfigDiagnostics(),
    });
  }
  const { credential } = req.body || {};
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'Credential mungon.' });
  }

  try {
    // Verify signature + audience. Throws if invalid/expired/wrong audience.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: 'Token Google i pavlefshëm.' });
    }
    if (!payload.email_verified) {
      return res.status(401).json({ error: 'Emaili Google nuk është i verifikuar.' });
    }

    const googleId = payload.sub;
    const email = String(payload.email).trim().toLowerCase();
    const name = String(payload.name || payload.email.split('@')[0]).trim().slice(0, 100);
    const picture = payload.picture || null;

    // 1) User already linked via google_id → log them in.
    let [rows] = await pool.query(
      'SELECT id, email, name, role, permissions, is_active, email_verified FROM users WHERE google_id = ?',
      [googleId]
    );

    let userId;
    let user;

    if (rows.length) {
      if (!rows[0].is_active) return res.status(403).json({ error: 'Llogaria juaj është çaktivizuar.' });
      user = rows[0];
      userId = user.id;
    } else {
      // 2) Existing local account with same email → link it.
      [rows] = await pool.query(
        'SELECT id, email, name, role, permissions, is_active, email_verified FROM users WHERE email = ?',
        [email]
      );
      if (rows.length) {
        if (!rows[0].is_active) return res.status(403).json({ error: 'Llogaria juaj është çaktivizuar.' });
        user = rows[0];
        userId = user.id;
        await pool.query(
          'UPDATE users SET google_id = ?, email_verified = 1, profile_picture_url = COALESCE(profile_picture_url, ?) WHERE id = ?',
          [googleId, picture, userId]
        );
      } else {
        // 3) Brand-new user → create users + customers rows in a transaction.
        userId = uuidv4();
        const customerId = uuidv4();
        const nameParts = name.split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Attach existing guest customer if any (same email, no user_id yet).
        const [existingCust] = await pool.query('SELECT id, user_id FROM customers WHERE email = ?', [email]);
        let finalCustomerId = customerId;
        let reusedCustomer = false;
        if (existingCust.length) {
          if (existingCust[0].user_id) {
            return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });
          }
          finalCustomerId = existingCust[0].id;
          reusedCustomer = true;
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          try {
            await conn.query(
              'INSERT INTO users (id, email, name, role, email_verified, google_id, profile_picture_url) VALUES (?, ?, ?, ?, 1, ?, ?)',
              [userId, email, name, 'customer', googleId, picture]
            );
          } catch (insErr) {
            if (insErr && insErr.code === 'ER_DUP_ENTRY') {
              await conn.rollback(); conn.release();
              return res.status(409).json({ error: 'Ky email është tashmë i regjistruar.' });
            }
            throw insErr;
          }

          if (reusedCustomer) {
            await conn.query(
              'UPDATE customers SET user_id = ?, name = COALESCE(NULLIF(name, ""), ?), first_name = COALESCE(NULLIF(first_name, ""), ?), last_name = COALESCE(NULLIF(last_name, ""), ?) WHERE id = ?',
              [userId, name, firstName, lastName, finalCustomerId]
            );
          } else {
            await conn.query(
              'INSERT INTO customers (id, name, first_name, last_name, email, phone, type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [finalCustomerId, name, firstName, lastName, email, '', 'Standard', userId]
            );
          }

          await conn.commit();
          conn.release();
        } catch (txErr) {
          try { await conn.rollback(); } catch {}
          try { conn.release(); } catch {}
          throw txErr;
        }

        user = { id: userId, email, name, role: 'customer', permissions: '', email_verified: 1 };
        await logActivity({
          userId, action: 'CREATE', entity: 'Customer', entityId: finalCustomerId,
          description: `Regjistrim me Google: ${email}`, ipAddress: req.ip,
        });
      }
    }

    // Look up customerId for the response (matches /login behaviour).
    const [custRows] = await pool.query(
      'SELECT id FROM customers WHERE user_id = ? OR email = ? LIMIT 1',
      [userId, email]
    );
    const customerId = custRows[0]?.id || null;

    // Issue our own session tokens.
    const { access, refresh } = makeTokens(userId);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, hashToken(refresh), expiresAt]
    );

    setAuthCookies(res, access, refresh);
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);
    await logActivity({
      userId, action: 'LOGIN', entity: 'User', entityId: userId,
      description: 'Hyrje me Google', ipAddress: req.ip,
    });

    return res.json({
      user: {
        id: userId, email: user.email, name: user.name, role: user.role,
        permissions: user.permissions, customerId, email_verified: 1,
      },
    });
  } catch (err) {
    console.error('Google sign-in error:', err.message);
    if (err?.sql || err?.sqlMessage) {
      return res.status(500).json({
        error: 'Gabim gjatë hyrjes me Google.',
        code: 'GOOGLE_SIGNIN_ACCOUNT_ERROR',
      });
    }
    return res.status(401).json({ error: 'Token Google i pavlefshëm ose ka skaduar.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ─── POST /api/auth/change-password ──────────────────────────
router.post('/change-password', authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    try {
      const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
      const valid = await bcrypt.compare(currentPassword, rows[0].password);
      if (!valid) return res.status(400).json({ error: 'Fjalëkalimi aktual është i gabuar.' });

      const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
      clearAuthCookies(res);

      return res.json({ message: 'Fjalëkalimi u ndryshua me sukses.' });
    } catch (err) {
      return res.status(500).json({ error: 'Gabim gjatë ndryshimit të fjalëkalimit.' });
    }
  }
);

// ─── POST /api/auth/forgot-password ──────────────────────────
router.post('/forgot-password',
  [body('email').isEmail()],
  async (req, res) => {
    // Always return 200 to prevent email enumeration.
    // Also equalize response time so attackers cannot infer existence via timing.
    const tStart = Date.now();
    const MIN_RESPONSE_MS = 600;
    const finish = (payload, status = 200) => {
      const elapsed = Date.now() - tStart;
      const delay = Math.max(0, MIN_RESPONSE_MS - elapsed);
      setTimeout(() => res.status(status).json(payload), delay);
    };

    const errors = validationResult(req);
    if (!errors.isEmpty()) return finish({ error: 'Email i pavlefshëm.' }, 400);

    const email = String(req.body.email || '').trim().toLowerCase();
    try {
      const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
      if (rows.length) {
        const user = rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = hashToken(token); // Hash before DB storage
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 orë

        // Invalidate existing unused tokens for this user
        await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);
        await pool.query(
          'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
          [uuidv4(), user.id, hashedResetToken, expiresAt] // Store hash
        );

        const frontendUrl = process.env.FRONTEND_URL || 'https://rentride.al';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`; // Send plaintext in email
        sendMail(email, 'Rivendosni fjalëkalimin — Rent Ride', `
          <p>Përshëndetje, <strong>${escapeHtml(user.name)}</strong>!</p>
          <p>Keni kërkuar rivendosjen e fjalëkalimit. Klikoni linkun më poshtë:</p>
          <p><a href="${resetLink}" style="color:#2563eb">Rivendos fjalëkalimin</a></p>
          <p>Linku skudon pas 1 ore. Nëse nuk e keni kërkuar ju, injoroni këtë email.</p>
        `).catch(() => {});
      }
      return finish({ message: 'Nëse emaili ekziston, do të merrni udhëzime për rivendosjen.' });
    } catch (err) {
      console.error(err);
      return finish({ error: 'Gabim i brendshëm i serverit.' }, 500);
    }
  }
);

// ─── POST /api/auth/reset-password ───────────────────────────
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, newPassword } = req.body;
    try {
      const [rows] = await pool.query(
        'SELECT id, user_id FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
        [hashToken(token)] // Hash before lookup
      );
      if (!rows.length) return res.status(400).json({ error: 'Linku është i pavlefshëm ose ka skaduar.' });

      const { id: tokenId, user_id: userId } = rows[0];
      const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Also clear any existing lockout so user can log in immediately
      await pool.query('UPDATE users SET password = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [hash, userId]);
      await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [tokenId]);
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
      clearAuthCookies(res);

      return res.json({ message: 'Fjalëkalimi u rivendos me sukses. Mund të kyçeni tani.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
    }
  }
);

// ─── GET /api/auth/verify-email ───────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token mungon.' });

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE email_verification_token = ? AND (email_verification_expires IS NULL OR email_verification_expires > NOW())',
      [hashToken(String(token))]
    );
    if (!rows.length) return res.status(400).json({ error: 'Token i pavlefshëm ose ka skaduar.' });

    await pool.query(
      'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
      [rows[0].id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://rentride.al';
    // Redirect to the localized account page. `locale` is passed when the
    // verification email is generated so users stay in their language.
    const locale = req.query.locale === 'en' ? 'en' : 'sq';
    const accountPath = locale === 'en' ? '/en/my-account' : '/llogaria';
    return res.redirect(`${frontendUrl}${accountPath}?verified=1`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
  }
});

// ─── POST /api/auth/resend-verification ──────────────────────
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT email_verified, email FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Useri nuk u gjet.' });
    if (rows[0].email_verified) return res.status(400).json({ error: 'Emaili është tashmë i verifikuar.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
      [hashToken(verifyToken), verifyExpires, req.user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://rentride.al';
    const locale = req.body?.locale === 'en' ? 'en' : 'sq';
    const verifyLink = `${frontendUrl}/api/auth/verify-email?token=${verifyToken}&locale=${locale}`;
    sendMail(rows[0].email, 'Verifiko emailin tënd — Rent Ride', `
      <p>Klikoni linkun për të verifikuar emailin tuaj:</p>
      <p><a href="${verifyLink}" style="color:#2563eb">Verifiko emailin</a></p>
    `).catch(() => {});

    return res.json({ message: 'Emaili i verifikimit u ridërgua.' });
  } catch (err) {
    return res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
  }
});

// ─── POST /api/auth/2fa/setup ─────────────────────────────────
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(req.user.email, 'Rent Ride', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    return res.json({ tempSecret: secret, qrDataUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gabim gjatë konfigurimit të 2FA.' });
  }
});

// ─── POST /api/auth/2fa/verify-setup ─────────────────────────
router.post('/2fa/verify-setup', authenticate,
  [body('tempSecret').notEmpty(), body('otp').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'tempSecret dhe OTP janë të detyrueshme.' });

    const { tempSecret, otp } = req.body;
    try {
      const valid = authenticator.check(otp, tempSecret);
      if (!valid) return res.status(400).json({ error: 'Kodi OTP është i gabuar. Provoni sërisht.' });

      await pool.query(
        'UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?',
        [tempSecret, req.user.id]
      );

      return res.json({ message: '2FA u aktivizua me sukses.' });
    } catch (err) {
      return res.status(500).json({ error: 'Gabim gjatë aktivizimit të 2FA.' });
    }
  }
);

// ─── POST /api/auth/2fa/disable ──────────────────────────────
router.post('/2fa/disable', authenticate,
  [body('otp').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'OTP është i detyrueshëm.' });

    const { otp } = req.body;
    try {
      const [rows] = await pool.query('SELECT two_factor_secret FROM users WHERE id = ?', [req.user.id]);
      if (!rows[0]?.two_factor_secret) return res.status(400).json({ error: '2FA nuk është aktiv.' });

      const valid = authenticator.check(otp, rows[0].two_factor_secret);
      if (!valid) return res.status(400).json({ error: 'Kodi OTP është i gabuar.' });

      await pool.query(
        'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?',
        [req.user.id]
      );

      return res.json({ message: '2FA u çaktivizua.' });
    } catch (err) {
      return res.status(500).json({ error: 'Gabim gjatë çaktivizimit të 2FA.' });
    }
  }
);

module.exports = router;
