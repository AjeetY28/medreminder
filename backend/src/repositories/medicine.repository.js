const db = require('../config/db');

class MedicineRepository {
  _mapToDTO(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      medicineName: row.name,
      strength: row.dosage,
      dosagePattern: row.instructions,
      form: row.type,
      stock: row.stock,
      unit: row.unit,
      expiryDate: row.expiry_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(row.user_phone ? { userPhone: row.user_phone } : {}),
      ...(row.user_email ? { userEmail: row.user_email } : {})
    };
  }

  async findById(id, userId) {
    const result = await db.query(
      'SELECT id, user_id, name, dosage, instructions, type, stock, unit, expiry_date, created_at, updated_at FROM medicines WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] ? this._mapToDTO(result.rows[0]) : null;
  }

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT id, user_id, name, dosage, instructions, type, stock, unit, expiry_date, created_at, updated_at FROM medicines WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(row => this._mapToDTO(row));
  }

  async getAllGlobal(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT m.id, m.user_id, m.name, m.dosage, m.instructions, m.type, m.stock, m.unit, m.expiry_date, m.created_at,
              u.phone as user_phone, u.email as user_email,
              COUNT(*) OVER() AS total_count
       FROM medicines m
       LEFT JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return {
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0,
      data: result.rows.map(({ total_count, ...row }) => this._mapToDTO(row)),
    };
  }

  async create({ userId, medicineName, strength = null, dosagePattern = null, form = null, stock = 0, unit = null, expiryDate = null }) {
    const result = await db.query(
      `INSERT INTO medicines (user_id, name, dosage, instructions, type, stock, unit, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, name, dosage, instructions, type, stock, unit, expiry_date, created_at`,
      [userId, medicineName, strength, dosagePattern, form, stock, unit, expiryDate]
    );
    return this._mapToDTO(result.rows[0]);
  }

  async update(id, userId, { medicineName, strength, dosagePattern, form, stock, unit, expiryDate }) {
    const result = await db.query(
      `UPDATE medicines
       SET name = COALESCE($3, name),
           dosage = COALESCE($4, dosage),
           instructions = COALESCE($5, instructions),
           type = COALESCE($6, type),
           stock = COALESCE($7, stock),
           unit = COALESCE($8, unit),
           expiry_date = COALESCE($9, expiry_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, name, dosage, instructions, type, stock, unit, expiry_date, updated_at`,
      [id, userId, medicineName, strength, dosagePattern, form, stock, unit, expiryDate]
    );
    return result.rows[0] ? this._mapToDTO(result.rows[0]) : null;
  }

  async updateStock(id, change) {
    const result = await db.query(
      'UPDATE medicines SET stock = GREATEST(0, stock + $2), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, stock',
      [id, change]
    );
    return result.rows[0] ? { id: result.rows[0].id, medicineName: result.rows[0].name, stock: result.rows[0].stock } : null;
  }

  async delete(id, userId) {
    const result = await db.query(
      'DELETE FROM medicines WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new MedicineRepository();

