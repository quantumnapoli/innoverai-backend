-- Migration: Add call summary fields to calls table
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS call_summary TEXT,
  ADD COLUMN IF NOT EXISTS detailed_call_summary TEXT;

-- Indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_calls_call_summary ON calls USING gin (to_tsvector('italian', coalesce(call_summary, '')));

SELECT 'Added call_summary and detailed_call_summary to calls' as message;


