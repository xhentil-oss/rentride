require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

async function seed() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    console.error('❌ Set ADMIN_PASSWORD env var (min 8 chars) before seeding.');
    process.exit(1);
  }
  const adminId = uuidv4();
  const hash = await bcrypt.hash(adminPassword, 12);
  await pool.query(
    'INSERT IGNORE INTO users (id, email, name, password, role, is_active, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [adminId, 'admin@rentalalb.com', 'Admin Rent Ride', hash, 'admin', 1, 'cars.view,cars.edit,reservations.view,reservations.edit,customers.view,finance.view']
  );
  console.log('✅ Admin user created: admin@rentalalb.com');

  console.log('🎉 Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
