#!/usr/bin/env node
/**
 * One-off sync script to pull calls from Retell and upsert into Postgres DB.
 * Run inside Railway project environment so env vars (RETELL_API_KEY, DATABASE_URL) are available.
 */
const { Pool } = require('pg');

const fetch = global.fetch || require('node-fetch');

async function main() {
    const retellBase = process.env.RETELL_BASE_URL || 'https://api.retellai.com';
    const apiKey = process.env.RETELL_API_KEY;
    const agentId = process.env.RETELL_AGENT_ID || process.env.RETELL_AGENT || process.env.AGENT_ID;

    if (!apiKey) {
        console.error('RETELL_API_KEY not set in environment. Aborting.');
        process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not set in environment. Aborting.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        console.log('🔌 Fetching calls from Retell...');

        const endpoint = `${retellBase}/v2/list-calls`;
        const body = { limit: 200 };
        if (agentId) body.filter_criteria = { agent_id: [agentId] };

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
            timeout: 20000
        });

        if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`Retell API error ${resp.status}: ${t}`);
        }

        const retellCalls = await resp.json();
        if (!Array.isArray(retellCalls)) {
            console.warn('Retell returned non-array, aborting.');
            console.log(retellCalls);
            process.exit(0);
        }

        console.log(`✅ Retrieved ${retellCalls.length} calls from Retell`);

        // Map and upsert
        for (const rc of retellCalls) {
            const mapped = mapCall(rc, agentId);
            await upsertCall(pool, mapped);
        }

        console.log('✅ Sync complete');
    } catch (err) {
        console.error('❌ Sync error:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

function mapCall(retellCall, fallbackAgentId) {
    const startTime = retellCall.start_timestamp ? new Date(retellCall.start_timestamp) : new Date();
    const endTime = retellCall.end_timestamp ? new Date(retellCall.end_timestamp) : null;
    let durationSeconds = 0;
    if (retellCall.duration_ms) durationSeconds = Math.round(retellCall.duration_ms / 1000);
    else if (endTime && startTime) durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime())/1000));

    let direction = 'inbound';
    if (retellCall.call_type === 'phone_call') direction = retellCall.from_number ? 'inbound' : 'outbound';

    const status = mapStatus(retellCall);

    return {
        call_id: retellCall.call_id || `retell_${Date.now()}`,
        from_number: retellCall.from_number || null,
        to_number: retellCall.to_number || null,
        start_time: startTime.toISOString(),
        end_time: endTime ? endTime.toISOString() : null,
        duration_seconds: durationSeconds,
        direction,
        status,
        agent_id: retellCall.agent_id || fallbackAgentId || null,
        cost_per_minute: null,
        retell_agent_id: retellCall.agent_id || null,
        retell_agent_name: retellCall.agent_name || null,
        retell_call_status: retellCall.call_status || null,
        retell_transcript: retellCall.transcript || null,
        retell_total_cost: retellCall.total_cost || null,
        retell_llm_latency_ms: retellCall.llm_latency_ms || null,
        retell_recording_url: retellCall.recording_url || null
    };
}

function mapStatus(retellCall) {
    const s = retellCall.call_status;
    if (!s) return 'completed';
    switch (s) {
        case 'ended':
            if (retellCall.duration_ms && retellCall.duration_ms > 5000) return 'completed';
            return 'failed';
        case 'ongoing':
        case 'calling':
        case 'registered':
            return 'in_progress';
        case 'error':
        case 'cancelled':
            return 'failed';
        default:
            return 'completed';
    }
}

async function upsertCall(pool, call) {
    const client = await pool.connect();
    try {
        const existing = await client.query('SELECT id FROM calls WHERE call_id = $1', [call.call_id]);
        const now = Date.now();
        if (existing.rows.length > 0) {
            await client.query(`UPDATE calls SET
                from_number = $1, to_number = $2, start_time = $3, end_time = $4,
                duration_seconds = $5, direction = $6, status = $7, agent_id = $8,
                cost_per_minute = $9, retell_agent_id = $10, retell_agent_name = $11,
                retell_call_status = $12, retell_transcript = $13, retell_total_cost = $14,
                retell_llm_latency_ms = $15, retell_recording_url = $16, updated_at = $17
                WHERE call_id = $18`, [
                call.from_number, call.to_number, call.start_time, call.end_time,
                call.duration_seconds, call.direction, call.status, call.agent_id,
                call.cost_per_minute, call.retell_agent_id, call.retell_agent_name,
                call.retell_call_status, call.retell_transcript, call.retell_total_cost,
                call.retell_llm_latency_ms, call.retell_recording_url, now, call.call_id
            ]);
            console.log('Updated', call.call_id);
        } else {
            await client.query(`INSERT INTO calls (
                call_id, from_number, to_number, start_time, end_time,
                duration_seconds, direction, status, agent_id, cost_per_minute,
                retell_agent_id, retell_agent_name, retell_call_status,
                retell_transcript, retell_total_cost, retell_llm_latency_ms,
                retell_recording_url, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
            `, [
                call.call_id, call.from_number, call.to_number, call.start_time, call.end_time,
                call.duration_seconds, call.direction, call.status, call.agent_id, call.cost_per_minute,
                call.retell_agent_id, call.retell_agent_name, call.retell_call_status,
                call.retell_transcript, call.retell_total_cost, call.retell_llm_latency_ms,
                call.retell_recording_url, now, now
            ]);
            console.log('Inserted', call.call_id);
        }
    } catch (e) {
        console.error('DB upsert error for', call.call_id, e.message);
    } finally {
        client.release();
    }
}

main();


