const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminRepository = require('../repositories/admin.repository');
const userRepository = require('../repositories/user.repository');
const logRepository = require('../repositories/log.repository');
const medicineRepository = require('../repositories/medicine.repository');
const prescriptionRepository = require('../repositories/prescription.repository');
const paymentRepository = require('../repositories/payment.repository');
const notificationService = require('../services/notification.service');
const db = require('../config/db');
const reportService = require('../services/report.service');
const logger = require('../config/logger');

class AdminController {
  /**
   * Dedicated Admin dashboard login route
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'email and password are required'
        });
      }

      const admin = await adminRepository.findByEmail(email);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid administrative email or password'
        });
      }

      // Validate bcrypt password hash
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid administrative email or password'
        });
      }

      // Issue signed administrative JWT token
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: 'ADMIN' },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Admin authentication successful',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role
          },
          token
        }
      });
    } catch (error) {
      logger.error('Error in admin login controller: %o', error);
      next(error);
    }
  }

  /**
   * Get operational dashboard data
   */
  async getDashboard(req, res, next) {
    try {
      const stats = await adminRepository.getDashboardStats();
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in admin getDashboard controller: %o', error);
      next(error);
    }
  }

  /**
   * Get list of registered users
   */
  async getUsers(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 10;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      const result = await userRepository.getPaginated(parsedLimit, parsedOffset);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in admin getUsers controller: %o', error);
      next(error);
    }
  }

  /**
   * Block a user account from using the app
   */
  async blockUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userRepository.block(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User account has been blocked successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in admin blockUser controller: %o', error);
      next(error);
    }
  }

  /**
   * Unblock a blocked user account
   */
  async unblockUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userRepository.unblock(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User account has been activated/unblocked successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in admin unblockUser controller: %o', error);
      next(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userRepository.delete(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User account deleted successfully'
      });
    } catch (error) {
      logger.error('Error in admin deleteUser controller: %o', error);
      next(error);
    }
  }

  /**
   * Export user log records to CSV file
   */
  async exportLogsCSV(req, res, next) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId query parameter is required to compile report'
        });
      }

      // Fetch all logs for the specified user
      const logs = await logRepository.findByUserId(userId, 5000, 0); // retrieve up to 5k logs
      
      const csv = reportService.exportLogsToCSV(logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=adherence_report_${userId}_${Date.now()}.csv`);
      return res.status(200).send(csv);
    } catch (error) {
      logger.error('Error in exportLogsCSV controller: %o', error);
      next(error);
    }
  }

  /**
   * Export user log records to styled Excel sheet
   */
  async exportLogsExcel(req, res, next) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId query parameter is required to compile report'
        });
      }

      const logs = await logRepository.findByUserId(userId, 5000, 0);
      const buffer = await reportService.exportLogsToExcel(logs);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=adherence_report_${userId}_${Date.now()}.xlsx`);
      return res.status(200).send(buffer);
    } catch (error) {
      logger.error('Error in exportLogsExcel controller: %o', error);
      next(error);
    }
  }

  async getMedicines(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      const result = await medicineRepository.getAllGlobal(parsedLimit, parsedOffset);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in admin getMedicines: %o', error);
      next(error);
    }
  }

  async getLogs(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      const result = await logRepository.getAllGlobal(parsedLimit, parsedOffset);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in admin getLogs: %o', error);
      next(error);
    }
  }

  async getPrescriptions(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      const result = await prescriptionRepository.getAllGlobal(parsedLimit, parsedOffset);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in admin getPrescriptions: %o', error);
      next(error);
    }
  }

  async broadcastNotification(req, res, next) {
    try {
      const { title, body } = req.body;
      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: 'title and body are required'
        });
      }

      const usersRes = await db.query(
        "SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL AND status = 'ACTIVE'"
      );
      const users = usersRes.rows;

      logger.info(`Broadcasting notification to ${users.length} active users.`);
      
      // Batch notifications — send 50 concurrently per batch to avoid overwhelming FCM/DB
      const BATCH_SIZE = 50;
      let successCount = 0;

      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(u => notificationService.sendPush(u.id, u.fcm_token, title, body, 'SYSTEM'))
        );
        successCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      }

      return res.status(200).json({
        success: true,
        message: `Broadcast complete. Dispatched to ${successCount} of ${users.length} active users.`
      });
    } catch (error) {
      logger.error('Error in admin broadcastNotification: %o', error);
      next(error);
    }
  }

  async customNotification(req, res, next) {
    try {
      const { userId, title, body } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({
          success: false,
          message: 'userId, title, and body are required'
        });
      }

      const userRes = await db.query("SELECT fcm_token FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const fcmToken = userRes.rows[0].fcm_token;
      const success = await notificationService.sendPush(userId, fcmToken, title, body, 'SYSTEM');

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to dispatch custom push notification'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Custom push notification dispatched successfully'
      });
    } catch (error) {
      logger.error('Error in admin customNotification: %o', error);
      next(error);
    }
  }

  async getPayments(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      const result = await paymentRepository.getAllGlobal(parsedLimit, parsedOffset);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in admin getPayments: %o', error);
      next(error);
    }
  }
}

module.exports = new AdminController();
