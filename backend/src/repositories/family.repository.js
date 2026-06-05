const db = require('../config/db');

class FamilyRepository {
  async findById(id, userId) {
    const result = await db.query(
      'SELECT id, user_id, name, phone, email, relationship, notify_on_missed, created_at, updated_at FROM family_members WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT id, user_id, name, phone, email, relationship, notify_on_missed, created_at, updated_at FROM family_members WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async create({ userId, name, phone, email = null, relationship = null, notifyOnMissed = true }) {
    const result = await db.query(
      `INSERT INTO family_members (user_id, name, phone, email, relationship, notify_on_missed)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, phone, email, relationship, notify_on_missed, created_at`,
      [userId, name, phone, email, relationship, notifyOnMissed]
    );
    return result.rows[0];
  }

  async delete(id, userId) {
    const result = await db.query(
      'DELETE FROM family_members WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new FamilyRepository();
