const db = require('../config/db');

class PaymentRepository {
  async findByOrderId(orderId) {
    const result = await db.query(
      'SELECT id, user_id, order_id, transaction_id, amount, status, payu_response, created_at, updated_at FROM payments WHERE order_id = $1',
      [orderId]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT id, user_id, order_id, transaction_id, amount, status, payu_response, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getAllGlobal(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT p.id, p.user_id, p.order_id, p.transaction_id, p.amount, p.status, p.payu_response, p.created_at, p.updated_at,
              u.phone as user_phone, u.email as user_email,
              COUNT(*) OVER() AS total_count
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return {
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0,
      data: result.rows.map(({ total_count, ...row }) => row),
    };
  }

  async create({ userId, orderId, amount, status = 'PENDING' }) {
    const result = await db.query(
      `INSERT INTO payments (user_id, order_id, amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, order_id, amount, status, created_at`,
      [userId, orderId, amount, status]
    );
    return result.rows[0];
  }

  async update(orderId, { transactionId, status, payuResponse }) {
    const result = await db.query(
      `UPDATE payments
       SET transaction_id = COALESCE($2, transaction_id),
           status = COALESCE($3, status),
           payu_response = COALESCE($4, payu_response),
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $1
       RETURNING id, user_id, order_id, transaction_id, amount, status, updated_at`,
      [orderId, transactionId, status, payuResponse]
    );
    return result.rows[0] || null;
  }
}

module.exports = new PaymentRepository();
