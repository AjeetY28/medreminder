const medicineRepository = require('../repositories/medicine.repository');
const logRepository = require('../repositories/log.repository');
const logger = require('../config/logger');

class MedicineController {
  async getMedicines(req, res, next) {
    try {
      const userId = req.user.id;
      const medicines = await medicineRepository.findByUserId(userId);
      
      return res.status(200).json({
        success: true,
        data: medicines
      });
    } catch (error) {
      logger.error('Error in getMedicines controller: %o', error);
      next(error);
    }
  }

  async getMedicine(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const medicine = await medicineRepository.findById(id, userId);

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: medicine
      });
    } catch (error) {
      logger.error('Error in getMedicine controller: %o', error);
      next(error);
    }
  }

  async createMedicine(req, res, next) {
    try {
      const userId = req.user.id;
      const { 
        medicineName, name,
        strength, dosage,
        dosagePattern, instructions,
        form, type,
        stock, unit, expiryDate 
      } = req.body;

      const medicine = await medicineRepository.create({
        userId,
        medicineName: medicineName || name,
        strength: strength || dosage,
        dosagePattern: dosagePattern || instructions,
        form: form || type,
        stock,
        unit,
        expiryDate
      });

      return res.status(201).json({
        success: true,
        message: 'Medicine record created successfully',
        data: medicine
      });
    } catch (error) {
      logger.error('Error in createMedicine controller: %o', error);
      next(error);
    }
  }

  async updateMedicine(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { 
        medicineName, name,
        strength, dosage,
        dosagePattern, instructions,
        form, type,
        stock, unit, expiryDate 
      } = req.body;

      const medicine = await medicineRepository.update(id, userId, {
        medicineName: medicineName || name,
        strength: strength || dosage,
        dosagePattern: dosagePattern || instructions,
        form: form || type,
        stock,
        unit,
        expiryDate
      });

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine updated successfully',
        data: medicine
      });
    } catch (error) {
      logger.error('Error in updateMedicine controller: %o', error);
      next(error);
    }
  }

  async deleteMedicine(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const deleted = await medicineRepository.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Medicine deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteMedicine controller: %o', error);
      next(error);
    }
  }

  // --- Medicine Adherence Intake Logging ---

  async logIntake(req, res, next) {
    try {
      const userId = req.user.id;
      const { medicineId, reminderScheduleId, status } = req.body;

      if (!medicineId || !status) {
        return res.status(400).json({
          success: false,
          message: 'medicineId and status (TAKEN, MISSED, SKIPPED) are required'
        });
      }

      // Verify medicine belongs to user
      const medicine = await medicineRepository.findById(medicineId, userId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      const log = await logRepository.create({
        reminderScheduleId,
        medicineId,
        userId,
        status
      });

      // If medicine is logged as TAKEN and has stock, decrement stock by 1
      if (status === 'TAKEN' && medicine.stock > 0) {
        await medicineRepository.updateStock(medicineId, -1);
      }

      return res.status(201).json({
        success: true,
        message: `Dose logged successfully as ${status}`,
        data: log
      });
    } catch (error) {
      logger.error('Error in logIntake controller: %o', error);
      next(error);
    }
  }

  async getLogs(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit, offset } = req.query;

      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      const logs = await logRepository.findByUserId(userId, parsedLimit, parsedOffset);
      const metrics = await logRepository.getAdherenceMetrics(userId);

      return res.status(200).json({
        success: true,
        metrics,
        data: logs
      });
    } catch (error) {
      logger.error('Error in getLogs controller: %o', error);
      next(error);
    }
  }
}

module.exports = new MedicineController();
