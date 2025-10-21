-- Migration: Create calls table
-- Run this on your PostgreSQL database

CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    call_id TEXT UNIQUE NOT NULL,
    from_number TEXT,
    to_number TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    direction TEXT,
    status TEXT,
    agent_id TEXT,
    cost_per_minute DECIMAL(10,4),
    retell_agent_id TEXT,
    retell_agent_name TEXT,
    retell_call_status TEXT,
    retell_transcript TEXT,
    retell_total_cost DECIMAL(10,4),
    retell_llm_latency_ms INTEGER,
    retell_recording_url TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time);

-- Verify table creation
SELECT 'Table calls created successfully!' as message;

