const db = require('../config/db');

class PrescriptionRepository {
  async findById(id, userId) {
    const result = await db.query(
      'SELECT id, user_id, file_url, extracted_data, status, created_at, updated_at FROM prescriptions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT id, user_id, file_url, extracted_data, status, created_at, updated_at FROM prescriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getAllGlobal(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT p.id, p.user_id, p.file_url, p.extracted_data, p.status, p.created_at, p.updated_at,
              u.phone as user_phone, u.email as user_email,
              COUNT(*) OVER() AS total_count
       FROM prescriptions p
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

  async create({ userId, fileUrl, extractedData = null, status = 'extracted' }) {
    const result = await db.query(
      `INSERT INTO prescriptions (user_id, file_url, extracted_data, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, file_url, extracted_data, status, created_at`,
      [userId, fileUrl, JSON.stringify(extractedData), status]
    );
    return result.rows[0];
  }

  /**
   * Save processing log for analytics and debugging.
   * This logs EVERY prescription processing attempt with full metadata.
   */
  async createLog({ prescriptionId, userId, modelUsed, avgConfidence, medicineCount, processingTimeMs, attemptCount, qualityReport, validationErrors, status }) {
    try {
      const result = await db.query(
        `INSERT INTO prescription_logs 
         (prescription_id, user_id, model_used, avg_confidence, medicine_count, processing_time_ms, attempt_count, image_quality, validation_errors, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          prescriptionId,
          userId,
          modelUsed,
          avgConfidence,
          medicineCount,
          processingTimeMs,
          attemptCount || 1,
          JSON.stringify(qualityReport || {}),
          validationErrors || [],
          status || 'success'
        ]
      );
      return result.rows[0];
    } catch (error) {
      // Log creation should never throw — swallow and log
      console.warn(`[PrescriptionRepository] Failed to create log: ${error.message}`);
      return null;
    }
  }

  /**
   * Update prescription status (e.g., when user confirms medicines).
   */
  async updateStatus(id, userId, status) {
    const result = await db.query(
      `UPDATE prescriptions SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, status`,
      [status, id, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new PrescriptionRepository();
