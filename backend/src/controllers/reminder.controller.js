const reminderRepository = require('../repositories/reminder.repository');
const medicineRepository = require('../repositories/medicine.repository');
const logger = require('../config/logger');

class ReminderController {
  async getReminders(req, res, next) {
    try {
      const userId = req.user.id;
      const reminders = await reminderRepository.findByUserId(userId);
      
      return res.status(200).json({
        success: true,
        data: reminders
      });
    } catch (error) {
      logger.error('Error in getReminders controller: %o', error);
      next(error);
    }
  }

  async createReminder(req, res, next) {
    try {
      const userId = req.user.id;
      const { medicineId, reminderTime, daysOfWeek } = req.body;

      // Verify medicine belongs to user
      const medicine = await medicineRepository.findById(medicineId, userId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Associated medicine not found'
        });
      }

      const reminder = await reminderRepository.create({
        medicineId,
        userId,
        reminderTime,
        daysOfWeek
      });

      return res.status(201).json({
        success: true,
        message: 'Reminder schedule created successfully',
        data: reminder
      });
    } catch (error) {
      logger.error('Error in createReminder controller: %o', error);
      next(error);
    }
  }

  async updateReminder(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { reminderTime, daysOfWeek, isActive } = req.body;

      const reminder = await reminderRepository.update(id, userId, {
        reminderTime,
        daysOfWeek,
        isActive
      });

      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder schedule not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Reminder schedule updated successfully',
        data: reminder
      });
    } catch (error) {
      logger.error('Error in updateReminder controller: %o', error);
      next(error);
    }
  }

  async deleteReminder(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const deleted = await reminderRepository.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Reminder schedule not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Reminder schedule deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteReminder controller: %o', error);
      next(error);
    }
  }
}

module.exports = new ReminderController();
