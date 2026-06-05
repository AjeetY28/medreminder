const cron = require('node-cron');
const logger = require('../config/logger');
const reminderRepository = require('../repositories/reminder.repository');
const logRepository = require('../repositories/log.repository');
const familyRepository = require('../repositories/family.repository');
const subscriptionRepository = require('../repositories/subscription.repository');
const notificationService = require('./notification.service');
const db = require('../config/db');

class CronService {
  start() {
    logger.info('Initializing cron job schedulers...');

    // 1. Medicine Reminder Job: Run EVERY MINUTE (* * * * *)
    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}:00`;
        
        let dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
        if (dayOfWeek === 0) dayOfWeek = 7; // Convert Sunday to 7 to match SQL schema

        logger.debug(`[Reminder Cron] Running check for Time: ${timeStr}, Day: ${dayOfWeek}`);

        const schedules = await reminderRepository.findActiveSchedulesForTime(timeStr, dayOfWeek);
        
        if (schedules.length > 0) {
          logger.info(`[Reminder Cron] Found ${schedules.length} active schedule(s) for trigger.`);
          for (const schedule of schedules) {
            await notificationService.sendMedicineReminder(
              schedule.user_id,
              schedule.fcm_token,
              schedule.medicine_name,
              schedule.medicine_dosage,
              schedule.medicine_instructions
            );
          }
        }
      } catch (error) {
        logger.error('Error executing minute-level medicine reminder cron: %o', error);
      }
    });

    // 2. Missed Dose Alerter: Run EVERY HOUR at minute 0 (0 * * * *)
    // Checks for reminders triggered 1 hour ago that were never logged by the user.
    cron.schedule('0 * * * *', async () => {
      try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        const hours = String(oneHourAgo.getHours()).padStart(2, '0');
        const minutes = String(oneHourAgo.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}:00`;
        
        let dayOfWeek = oneHourAgo.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;

        logger.info(`[Adherence Cron] Checking for missed doses from one hour ago (${timeStr})`);

        const pastSchedules = await reminderRepository.findActiveSchedulesForTime(timeStr, dayOfWeek);
        
        if (pastSchedules.length === 0) return;

        const dateStr = oneHourAgo.toISOString().split('T')[0];

        // Batch-check which schedules already have logs for this date (single query)
        const scheduleIds = pastSchedules.map(s => s.id);
        const existingLogsResult = await db.query(
          `SELECT DISTINCT reminder_schedule_id FROM medicine_logs 
           WHERE reminder_schedule_id = ANY($1) 
             AND logged_at::date = $2::date`,
          [scheduleIds, dateStr]
        );
        const loggedScheduleIds = new Set(existingLogsResult.rows.map(r => r.reminder_schedule_id));

        // Process only schedules that have NO logs
        const missedSchedules = pastSchedules.filter(s => !loggedScheduleIds.has(s.id));
        
        if (missedSchedules.length === 0) return;

        logger.warn(`[Adherence Cron] ${missedSchedules.length} missed dose(s) detected.`);

        // Pre-fetch family members for all unique user IDs in one batch
        const uniqueUserIds = [...new Set(missedSchedules.map(s => s.user_id))];
        const familyMap = new Map();
        for (const uid of uniqueUserIds) {
          const members = await familyRepository.findByUserId(uid);
          familyMap.set(uid, members.filter(m => m.notify_on_missed === true));
        }

        // Process each missed schedule
        for (const schedule of missedSchedules) {
          logger.warn(`[Adherence Cron] Schedule ${schedule.id} missed by User ${schedule.user_id}`);
          
          // 1. Create a MISSED medicine log record
          await logRepository.create({
            reminderScheduleId: schedule.id,
            medicineId: schedule.medicine_id,
            userId: schedule.user_id,
            status: 'MISSED',
            loggedAt: oneHourAgo
          });

          // 2. Send missed dose push warning to patient
          await notificationService.sendMissedDoseWarning(
            schedule.user_id,
            schedule.fcm_token,
            schedule.medicine_name
          );

          // 3. Notify family members who opted-in (user details already in schedule join)
          const notifyMembers = familyMap.get(schedule.user_id) || [];
          if (notifyMembers.length > 0) {
            const patientName = schedule.fcm_token ? (schedule.user_id) : 'Your family member';
            
            // Send family notifications in parallel
            await Promise.allSettled(
              notifyMembers.map(member =>
                notificationService.notifyFamilyOfMissedDose(
                  member.name,
                  member.phone,
                  patientName,
                  schedule.medicine_name
                )
              )
            );
          }
        }
      } catch (error) {
        logger.error('Error executing hourly missed-dose detection cron: %o', error);
      }
    });

    // 3. Subscription Status Expiry Check: Run EVERY DAY AT MIDNIGHT (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('[Subscription Cron] Checking for expired subscriptions...');
        
        const expiredActiveSubscriptions = await subscriptionRepository.findExpiredActiveSubscriptions();
        
        if (expiredActiveSubscriptions.length > 0) {
          logger.info(`[Subscription Cron] Found ${expiredActiveSubscriptions.length} subscriptions to expire.`);
          for (const sub of expiredActiveSubscriptions) {
            await subscriptionRepository.updateStatus(sub.id, 'EXPIRED');
            logger.info(`[Subscription Cron] Expired subscription ${sub.id} for User ${sub.user_id}`);
          }
        } else {
          logger.info('[Subscription Cron] No active subscriptions found that need expiration.');
        }
      } catch (error) {
        logger.error('Error executing daily subscription check cron: %o', error);
      }
    });

    logger.info('All cron scheduler daemons active.');
  }
}

module.exports = new CronService();
