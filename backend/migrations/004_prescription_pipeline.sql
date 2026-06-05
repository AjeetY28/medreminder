-- Migration 002: Prescription Pipeline Enhancement
-- Adds status tracking and processing logs for the production-grade extraction pipeline.

-- ─── Add status column to prescriptions table ───
-- Values: 'extracted' (AI successfully extracted), 'needs_manual_review' (all models failed),
--         'user_confirmed' (user reviewed and confirmed medicines)
ALTER TABLE prescriptions 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'extracted';

-- ─── Processing Logs Table ───
-- Every prescription processing attempt is logged here for debugging and analytics.
-- This enables: model performance comparison, quality trend analysis, failure debugging.
CREATE TABLE IF NOT EXISTS prescription_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_used VARCHAR(50) NOT NULL,        -- 'gemini-2.5-flash', 'gemini-2.0-flash', 'gpt-4o', 'all_failed'
    avg_confidence DECIMAL(3,2),            -- 0.00 to 1.00
    medicine_count INT DEFAULT 0,
    processing_time_ms INT DEFAULT 0,
    attempt_count INT DEFAULT 1,            -- How many models were tried before success
    image_quality JSONB,                    -- { score, isBlurry, isDark, wasRotated, originalWidth, originalHeight }
    validation_errors TEXT[],               -- ['count_mismatch', 'low_confidence', 'empty_medicine_names']
    status VARCHAR(30) DEFAULT 'success',   -- 'success', 'validation_failed', 'all_models_failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prescription_logs_prescription_id ON prescription_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_logs_user_id ON prescription_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_prescription_logs_model_used ON prescription_logs(model_used);
CREATE INDEX IF NOT EXISTS idx_prescription_logs_created_at ON prescription_logs(created_at);
