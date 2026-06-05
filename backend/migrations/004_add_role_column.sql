-- Migration 004: Add role column to users table
-- The initial schema defines it but the live DB is missing it.
-- The user_role type already exists from 001_initial_schema.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'USER';
