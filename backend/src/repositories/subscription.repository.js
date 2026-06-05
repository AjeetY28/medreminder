const db = require('../config/db');

class SubscriptionRepository {
  async findActiveByUserId(userId) {
    const result = await db.query(
      `SELECT id, user_id, plan_name, status, start_date, end_date, price_paid, created_at
       FROM subscriptions 
       WHERE user_id = $1 AND status = 'ACTIVE' AND end_date >= CURRENT_DATE
       ORDER BY end_date DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async getByUserId(userId) {
    const result = await db.query(
      'SELECT id, user_id, plan_name, status, start_date, end_date, price_paid, created_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async create({ userId, planName, startDate, endDate, pricePaid }) {
    // Use a transaction to atomically expire old subscriptions and create the new one
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Mark any existing active subscriptions as EXPIRED to avoid overlap conflicts
      await client.query(
        "UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'ACTIVE'",
        [userId]
      );

      const result = await client.query(
        `INSERT INTO subscriptions (user_id, plan_name, status, start_date, end_date, price_paid)
         VALUES ($1, $2, 'ACTIVE', $3, $4, $5)
         RETURNING id, user_id, plan_name, status, start_date, end_date, price_paid, created_at`,
        [userId, planName, startDate, endDate, pricePaid]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(id, status) {
    const result = await db.query(
      'UPDATE subscriptions SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, status',
      [id, status]
    );
    return result.rows[0] || null;
  }

  /**
   * Find subscriptions that have passed their end_date but are still marked as ACTIVE
   */
  async findExpiredActiveSubscriptions() {
    const result = await db.query(
      `SELECT id, user_id, plan_name, end_date 
       FROM subscriptions 
       WHERE status = 'ACTIVE' AND end_date < CURRENT_DATE`
    );
    return result.rows;
  }
}

module.exports = new SubscriptionRepository();
