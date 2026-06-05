const { admin, isInitialized } = require('../config/firebase');
const logger = require('../config/logger');
const db = require('../config/db');

class NotificationService {
  /**
   * Send a general push notification and record it in database
   * @param {string} userId - User UUID
   * @param {string} fcmToken - Device registration token
   * @param {string} title - Notification title
   * @param {string} body - Notification body content
   * @param {string} type - Notification class ('REMINDER', 'MISSED', 'SYSTEM')
   * @param {Object} [data={}] - Key-value payload for client actions
   */
  async sendPush(userId, fcmToken, title, body, type, data = {}) {
    // Insert notification record and capture its PK for atomic status updates
    let notificationId = null;
    try {
      const insertResult = await db.query(
        `INSERT INTO notifications (user_id, title, body, type, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         RETURNING id`,
        [userId, title, body, type]
      );
      notificationId = insertResult.rows[0].id;
    } catch (dbError) {
      logger.error(`Failed to log notification in DB: %o`, dbError);
    }

    if (!fcmToken) {
      logger.warn(`No FCM token available for User ${userId}. Skipping push dispatch.`);
      if (notificationId) {
        await db.query("UPDATE notifications SET status = 'FAILED' WHERE id = $1", [notificationId]);
      }
      return false;
    }

    if (!isInitialized()) {
      logger.info(`[FCM SIMULATOR] Dispatching Notification to user ${userId} (Token: ${fcmToken.substring(0, 10)}...)\nTitle: "${title}"\nBody: "${body}"\nData: %j`, data);
      if (notificationId) {
        await db.query("UPDATE notifications SET status = 'SENT' WHERE id = $1", [notificationId]);
      }
      return true;
    }

    try {
      const message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          type,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard Android click handler flag
        },
      };

      const response = await admin.messaging().send(message);
      logger.debug(`FCM Success Response: ${response}`);

      if (notificationId) {
        await db.query("UPDATE notifications SET status = 'SENT' WHERE id = $1", [notificationId]);
      }
      return true;
    } catch (error) {
      logger.error(`FCM Dispatch failed for user ${userId}: %o`, error);
      if (notificationId) {
        await db.query("UPDATE notifications SET status = 'FAILED' WHERE id = $1", [notificationId]);
      }
      return false;
    }
  }

  /**
   * Helper to send medicine dose reminders
   */
  async sendMedicineReminder(userId, fcmToken, medicineName, dosage, instructions) {
    const title = '⏰ Time for your medicine!';
    let body = `Please take ${dosage} of ${medicineName}.`;
    if (instructions) {
      body += ` (${instructions})`;
    }
    return this.sendPush(userId, fcmToken, title, body, 'REMINDER', { medicineName });
  }

  /**
   * Helper to notify patient about a missed dose
   */
  async sendMissedDoseWarning(userId, fcmToken, medicineName) {
    const title = '⚠️ Missed Medicine Alert';
    const body = `You missed your scheduled dose of ${medicineName}. Please log it as taken or skipped as soon as possible.`;
    return this.sendPush(userId, fcmToken, title, body, 'MISSED', { medicineName });
  }

  /**
   * Helper to notify family members about patient's missed dose
   */
  async notifyFamilyOfMissedDose(familyMemberName, familyPhone, patientName, medicineName) {
    // In production, integrate SMS API to send alert SMS
    // Example: sendSMS(familyPhone, `Hello ${familyMemberName}, ${patientName} has missed their dose of ${medicineName}.`);
    logger.info(`[SMS ALERTER] Sent to Guardian ${familyMemberName} (${familyPhone}): "Alert: ${patientName} missed their dose of ${medicineName}."`);
    return true;
  }
}

module.exports = new NotificationService();
