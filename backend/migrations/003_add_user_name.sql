-- Add 'name' column to users table for storing customer display name
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
