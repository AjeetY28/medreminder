require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical order ensures 001 runs before 002

    console.log(`Found ${files.length} migration file(s):`);
    files.forEach(f => console.log(`  → ${f}`));
    console.log('');

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Running migration: ${file}...`);
      await db.query(sql);
      console.log(`  ✅ ${file} completed successfully`);
    }

    console.log('\n======================================================');
    console.log(' SUCCESS: All database migrations completed!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Migration execution failed:', err);
    process.exit(1);
  }
}

runMigrations();
