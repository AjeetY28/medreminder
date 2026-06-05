const db = require('../config/db');

class AdminRepository {
  async findByEmail(email) {
    const result = await db.query(
      'SELECT id, email, password_hash, role, created_at, updated_at FROM admin_users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await db.query(
      'SELECT id, email, role, created_at, updated_at FROM admin_users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create({ email, passwordHash }) {
    const result = await db.query(
      `INSERT INTO admin_users (email, password_hash, role)
       VALUES ($1, $2, 'ADMIN')
       RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );
    return result.rows[0];
  }

  async getDashboardStats() {
    // Single query with sub-selects — replaces 6 sequential round-trips
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE')::int AS active_users,
        (SELECT COUNT(*) FROM users WHERE status = 'BLOCKED')::int AS blocked_users,
        COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'SUCCESS'), 0)::float AS total_revenue,
        (SELECT COUNT(*) FROM prescriptions)::int AS total_prescriptions,
        (SELECT COUNT(*) FILTER (WHERE status = 'TAKEN') FROM medicine_logs)::int AS taken,
        (SELECT COUNT(*) FILTER (WHERE status = 'MISSED') FROM medicine_logs)::int AS missed,
        (SELECT COUNT(*) FILTER (WHERE status = 'SKIPPED') FROM medicine_logs)::int AS skipped,
        (SELECT COUNT(*) FROM medicine_logs)::int AS total_logs
    `);

    const row = result.rows[0];
    const totalLogs = row.total_logs;
    const adherenceRate = totalLogs > 0 ? Math.round((row.taken / totalLogs) * 100) : 100;

    return {
      users: {
        total: row.total_users,
        active: row.active_users,
        blocked: row.blocked_users,
      },
      totalRevenue: row.total_revenue,
      totalPrescriptions: row.total_prescriptions,
      reminders: {
        totalLogs,
        takenCount: row.taken,
        missedCount: row.missed,
        skippedCount: row.skipped,
        adherenceRatePercent: adherenceRate,
      }
    };
  }
}

module.exports = new AdminRepository();
