/**
 * Gjeneron hash bcrypt + komandën SQL për të bërë reset admin-in.
 *
 * Përdorim:
 *   node backend/scripts/gen-admin-reset.js "FJALEKALIMI_YT"
 *
 * Opsionale (email i ri / email i vjetër që kërkohet për UPDATE):
 *   node backend/scripts/gen-admin-reset.js "FJALEKALIMI_YT" "andrikurti471@gmail.com" "admin@rentalalb.com"
 *
 * Kopjo SQL-në që del në output te phpMyAdmin (skeda SQL) dhe ekzekutoje.
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
const newEmail = process.argv[3] || 'andrikurti471@gmail.com';
const oldEmail = process.argv[4] || 'admin@rentalalb.com';

if (!password || password.length < 8) {
  console.error('❌ Jep një fjalëkalim me të paktën 8 karaktere:');
  console.error('   node backend/scripts/gen-admin-reset.js "FjalekalimiYt123"');
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
console.log('\nEmail i ri:', newEmail);
console.log('Fjalëkalimi:', password, '(ruaje diku të sigurt)\n');
