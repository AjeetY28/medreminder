-- Migration 005: Fix Missing Enum Columns
-- Adds enum columns that were skipped during initial schema creation because the tables already existed.

-- 1. Add 'role' to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'USER';

-- 2. Add 'role' to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'ADMIN';

-- 3. Add 'status' to medicine_logs table
ALTER TABLE medicine_logs ADD COLUMN IF NOT EXISTS status log_status DEFAULT 'TAKEN';
-- Alter it to be NOT NULL now that we've set a default (table is currently empty, but this is safer)
ALTER TABLE medicine_logs ALTER COLUMN status SET NOT NULL;

-- 4. Add 'status' to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status payment_status DEFAULT 'PENDING';

-- 5. Add 'status' to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status subscription_status DEFAULT 'ACTIVE';
