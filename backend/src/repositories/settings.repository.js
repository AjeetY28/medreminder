const db = require('../config/db');

class SettingsRepository {
  async get(key) {
    const result = await db.query(
      'SELECT key, value, description, updated_at FROM settings WHERE key = $1',
      [key]
    );
    return result.rows[0] ? result.rows[0].value : null;
  }

  async getDetails(key) {
    const result = await db.query(
      'SELECT key, value, description, updated_at FROM settings WHERE key = $1',
      [key]
    );
    return result.rows[0] || null;
  }

  async getAll() {
    const result = await db.query('SELECT key, value, description, updated_at FROM settings');
    return result.rows;
  }

  async set(key, value, description = null) {
    const result = await db.query(
      `INSERT INTO settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, 
                     description = COALESCE($3, settings.description), 
                     updated_at = CURRENT_TIMESTAMP
       RETURNING key, value, description, updated_at`,
      [key, value, description]
    );
    return result.rows[0];
  }
}

module.exports = new SettingsRepository();
