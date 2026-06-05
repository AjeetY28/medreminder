const db = require('../config/db');

class LogRepository {
  async create({ reminderScheduleId = null, medicineId, userId, status, loggedAt = new Date() }) {
    const result = await db.query(
      `INSERT INTO medicine_logs (reminder_schedule_id, medicine_id, user_id, status, logged_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, reminder_schedule_id, medicine_id, user_id, status, logged_at`,
      [reminderScheduleId, medicineId, userId, status, loggedAt]
    );
    return result.rows[0];
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT ml.id, ml.reminder_schedule_id, ml.medicine_id, ml.user_id, ml.status, ml.logged_at,
              m.name as medicine_name, m.dosage as medicine_dosage, m.type as medicine_type
       FROM medicine_logs ml
       JOIN medicines m ON ml.medicine_id = m.id
       WHERE ml.user_id = $1
       ORDER BY ml.logged_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async getAllGlobal(limit = 100, offset = 0) {
    const result = await db.query(
      `SELECT ml.id, ml.reminder_schedule_id, ml.medicine_id, ml.user_id, ml.status, ml.logged_at,
              m.name as medicine_name, m.dosage as medicine_dosage,
              u.phone as user_phone, u.email as user_email,
              COUNT(*) OVER() AS total_count
       FROM medicine_logs ml
       JOIN medicines m ON ml.medicine_id = m.id
       LEFT JOIN users u ON ml.user_id = u.id
       ORDER BY ml.logged_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return {
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0,
      data: result.rows.map(({ total_count, ...row }) => row),
    };
  }

  async findLogsInPeriod(userId, startDate, endDate) {
    const result = await db.query(
      `SELECT ml.id, ml.reminder_schedule_id, ml.medicine_id, ml.user_id, ml.status, ml.logged_at,
              m.name as medicine_name, m.dosage as medicine_dosage
       FROM medicine_logs ml
       JOIN medicines m ON ml.medicine_id = m.id
       WHERE ml.user_id = $1 
         AND ml.logged_at >= $2::timestamp
         AND ml.logged_at <= $3::timestamp
       ORDER BY ml.logged_at ASC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }

  /**
   * Get overall adherence metrics (taken count, missed count, skipped count) for user
   */
  async getAdherenceMetrics(userId) {
    const result = await db.query(
      `SELECT 
         COUNT(*) filter (where status = 'TAKEN') as taken_count,
         COUNT(*) filter (where status = 'MISSED') as missed_count,
         COUNT(*) filter (where status = 'SKIPPED') as skipped_count,
         COUNT(*) as total_count
       FROM medicine_logs
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Check if a log entry already exists for a reminder schedule on a given date (to prevent duplicate logs)
   */
  async checkLogExists(reminderScheduleId, dateStr) {
    const result = await db.query(
      `SELECT id FROM medicine_logs 
       WHERE reminder_schedule_id = $1 
         AND logged_at::date = $2::date`,
      [reminderScheduleId, dateStr]
    );
    return result.rows.length > 0;
  }
}

module.exports = new LogRepository();
