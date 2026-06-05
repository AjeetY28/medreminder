const db = require('../config/db');

class ReminderRepository {
  async findById(id, userId) {
    const result = await db.query(
      `SELECT rs.id, rs.medicine_id, rs.user_id, rs.reminder_time, rs.days_of_week, rs.is_active, rs.created_at, rs.updated_at,
              m.name as medicine_name, m.dosage as medicine_dosage
       FROM reminder_schedules rs
       JOIN medicines m ON rs.medicine_id = m.id
       WHERE rs.id = $1 AND rs.user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId) {
    const result = await db.query(
      `SELECT rs.id, rs.medicine_id, rs.user_id, rs.reminder_time, rs.days_of_week, rs.is_active, rs.created_at, rs.updated_at,
              m.name as medicine_name, m.dosage as medicine_dosage, m.instructions as medicine_instructions
       FROM reminder_schedules rs
       JOIN medicines m ON rs.medicine_id = m.id
       WHERE rs.user_id = $1
       ORDER BY rs.reminder_time ASC`,
      [userId]
    );
    return result.rows;
  }

  async findByMedicineId(medicineId) {
    const result = await db.query(
      'SELECT id, medicine_id, user_id, reminder_time, days_of_week, is_active FROM reminder_schedules WHERE medicine_id = $1',
      [medicineId]
    );
    return result.rows;
  }

  async create({ medicineId, userId, reminderTime, daysOfWeek }) {
    const result = await db.query(
      `INSERT INTO reminder_schedules (medicine_id, user_id, reminder_time, days_of_week, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, medicine_id, user_id, reminder_time, days_of_week, is_active, created_at`,
      [medicineId, userId, reminderTime, daysOfWeek]
    );
    return result.rows[0];
  }

  async update(id, userId, { reminderTime, daysOfWeek, isActive }) {
    const result = await db.query(
      `UPDATE reminder_schedules
       SET reminder_time = COALESCE($3, reminder_time),
           days_of_week = COALESCE($4, days_of_week),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, medicine_id, user_id, reminder_time, days_of_week, is_active, updated_at`,
      [id, userId, reminderTime, daysOfWeek, isActive]
    );
    return result.rows[0] || null;
  }

  async delete(id, userId) {
    const result = await db.query(
      'DELETE FROM reminder_schedules WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all schedules active for a specific time window and day of week
   * @param {string} timeStr - Time string formatted as 'HH:MM:SS' or 'HH:MM'
   * @param {number} dayOfWeek - 1 (Monday) to 7 (Sunday)
   */
  async findActiveSchedulesForTime(timeStr, dayOfWeek) {
    const result = await db.query(
      `SELECT rs.id, rs.medicine_id, rs.user_id, rs.reminder_time, rs.days_of_week, 
              u.fcm_token, u.status as user_status,
              m.name as medicine_name, m.dosage as medicine_dosage, m.instructions as medicine_instructions
       FROM reminder_schedules rs
       JOIN medicines m ON rs.medicine_id = m.id
       JOIN users u ON rs.user_id = u.id
       WHERE rs.is_active = TRUE 
         AND u.status = 'ACTIVE'
         AND rs.reminder_time::time = $1::time
         AND $2 = ANY(rs.days_of_week)`,
      [timeStr, dayOfWeek]
    );
    return result.rows;
  }
}

module.exports = new ReminderRepository();
