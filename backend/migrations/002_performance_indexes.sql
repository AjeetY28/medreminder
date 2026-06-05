-- Performance indexes migration
-- Addresses: cron job query path, missed-dose duplicate check, subscription expiry check

-- Composite index for the minute-level reminder cron query
-- Used by: reminderRepository.findActiveSchedulesForTime()
-- Query pattern: WHERE is_active = TRUE AND reminder_time::time = $1 AND $2 = ANY(days_of_week)
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_active_time 
  ON reminder_schedules(is_active, reminder_time) 
  WHERE is_active = TRUE;

-- Composite index for the missed-dose duplicate check
-- Used by: logRepository.checkLogExists()
-- Query pattern: WHERE reminder_schedule_id = $1 AND logged_at::date = $2::date
CREATE INDEX IF NOT EXISTS idx_medicine_logs_schedule_logged 
  ON medicine_logs(reminder_schedule_id, logged_at);

-- Index for subscription expiry cron job
-- Used by: subscriptionRepository.findExpiredActiveSubscriptions()
-- Query pattern: WHERE status = 'ACTIVE' AND end_date < CURRENT_DATE
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_end_date 
  ON subscriptions(status, end_date) 
  WHERE status = 'ACTIVE';

-- Index for payment lookup by order_id (already UNIQUE in schema, but adding for clarity)
-- Used by: paymentRepository.findByOrderId()
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
