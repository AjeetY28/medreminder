const db = require('../config/db');

class UserRepository {
  async findById(id) {
    const result = await db.query(
      'SELECT id, name, phone, email, google_id, apple_id, role, status, fcm_token, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByPhone(phone) {
    const result = await db.query(
      'SELECT id, name, phone, email, google_id, apple_id, role, status, fcm_token, created_at, updated_at FROM users WHERE phone = $1',
      [phone]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const result = await db.query(
      'SELECT id, name, phone, email, google_id, apple_id, role, status, fcm_token, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findByGoogleId(googleId) {
    const result = await db.query(
      'SELECT id, name, phone, email, google_id, apple_id, role, status, fcm_token, created_at, updated_at FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
  }

  async findByAppleId(appleId) {
    const result = await db.query(
      'SELECT id, name, phone, email, google_id, apple_id, role, status, fcm_token, created_at, updated_at FROM users WHERE apple_id = $1',
      [appleId]
    );
    return result.rows[0] || null;
  }

  async create({ phone = null, email = null, googleId = null, appleId = null, name = null, role = 'USER' }) {
    const result = await db.query(
      `INSERT INTO users (phone, email, google_id, apple_id, name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
       RETURNING id, name, phone, email, google_id, apple_id, role, status, created_at`,
      [phone, email, googleId, appleId, name, role]
    );
    return result.rows[0];
  }

  async update(id, { phone, email, fcmToken, status, name }) {
    const result = await db.query(
      `UPDATE users
       SET phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           fcm_token = COALESCE($4, fcm_token),
           status = COALESCE($5, status),
           name = COALESCE($6, name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, phone, email, google_id, apple_id, role, status, fcm_token, updated_at`,
      [id, phone, email, fcmToken, status, name]
    );
    return result.rows[0] || null;
  }

  async updateName(id, name) {
    const result = await db.query(
      `UPDATE users SET name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1
       RETURNING id, name, phone, email, role, status`,
      [id, name]
    );
    return result.rows[0] || null;
  }

  async updateFcmToken(id, fcmToken) {
    const result = await db.query(
      'UPDATE users SET fcm_token = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, fcm_token',
      [id, fcmToken]
    );
    return result.rows[0] || null;
  }

  async getPaginated(limit = 10, offset = 0) {
    // Single query with window function — replaces separate COUNT + SELECT
    const result = await db.query(
      `SELECT id, name, phone, email, google_id, apple_id, role, status, fcm_token, created_at, updated_at,
              COUNT(*) OVER() AS total_count
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return {
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0,
      users: result.rows.map(({ total_count, ...row }) => row),
    };
  }

  async block(id) {
    const result = await db.query(
      "UPDATE users SET status = 'BLOCKED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, status",
      [id]
    );
    return result.rows[0] || null;
  }

  async unblock(id) {
    const result = await db.query(
      "UPDATE users SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, status",
      [id]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }
}

module.exports = new UserRepository();
