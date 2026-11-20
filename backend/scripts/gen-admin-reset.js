/**
 * Gjeneron hash bcrypt + komandën SQL për të bërë reset admin-in.
 *
 * Përdorim:
 *   node backend/scripts/gen-admin-reset.js "FJALEKALIMI_YT" "email.i.ri@shembull.com" ["email.i.vjeter@shembull.com"]
 *
 * Email-i i vjetër (opsional) është ai që kërkohet për UPDATE; nëse mungon,
 * përdoret i njëjti email.
 *
 * Kopjo SQL-në që del në output te phpMyAdmin (skeda SQL) dhe ekzekutoje.
 * Fjalëkalimi NUK printohet — mos e ruaj në historikun e terminalit.
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
const newEmail = process.argv[3];
const oldEmail = process.argv[4] || newEmail;

if (!password || password.length < 12 || !newEmail) {
  console.error('❌ Përdorim: node backend/scripts/gen-admin-reset.js "FjalekalimiYt (min 12)" "email@shembull.com" ["email.i.vjeter@shembull.com"]');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const esc = (s) => String(s).replace(/'/g, "''");

console.log('\n✅ Hash bcrypt u gjenerua.\n');
console.log('────────────────────────────────────────────────────────');
console.log('OPSIONI A — Nëse admini ekziston (rekomandohet UPDATE):');
console.log('────────────────────────────────────────────────────────');
console.log(
  `UPDATE users\n` +
  `SET email = '${esc(newEmail)}',\n` +
  `    password = '${hash}',\n` +
  `    is_active = 1\n` +
  `WHERE email = '${esc(oldEmail)}';`
);
console.log('\n────────────────────────────────────────────────────────');
console.log('OPSIONI B — Nëse s\'ka admin, krijo një të ri (INSERT):');
console.log('────────────────────────────────────────────────────────');
console.log(
  `INSERT INTO users (id, email, name, password, role, is_active, permissions)\n` +
  `VALUES (UUID(), '${esc(newEmail)}', 'Admin Rent Ride', '${hash}', 'admin', 1,\n` +
  `        'cars.view,cars.edit,reservations.view,reservations.edit,customers.view,finance.view');`
);
console.log('\nEmail i ri:', newEmail, '\n');
