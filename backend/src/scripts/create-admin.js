require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function createAdmin() {
  const email = process.argv[2] || 'admin@medireminder.ai';
  const password = process.argv[3] || 'admin123';

  if (!email || !password) {
    console.error('Usage: node create-admin.js <email> <password>');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await db.query(
      `INSERT INTO admin_users (email, password_hash, role) 
       VALUES ($1, $2, 'ADMIN') 
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, hash]
    );

    console.log(`\n======================================================`);
    console.log(` SUCCESS: Admin user created/updated successfully!`);
    console.log(` Email: ${email}`);
    console.log(` Password: ${password}`);
    console.log(`======================================================\n`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user in database:', err);
    process.exit(1);
  }
}

createAdmin();
