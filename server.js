const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

require('dotenv').config();

const app = express();
app.use(helmet());

// Temporary Content Security Policy to allow Tailwind CDN and inline scripts/styles
// NOTE: For production hardening, remove 'unsafe-inline' and serve compiled CSS/JS from same origin
app.use((req, res, next) => {
    // Relaxed CSP to allow CDN + data: fonts while we self-host; will tighten later
    // Allow dashboard and backend API endpoints in connect-src via env or defaults
    const extraConnect = process.env.CSP_CONNECT_SRC || "https://innoverai-production-06cb.up.railway.app https://innoverai-backend-production.up.railway.app https://dashboard.innoverai.com https://api.innoverai.com";
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; connect-src 'self' https://api.retellai.com https://sqr.co " + extraConnect + "; frame-ancestors 'none';");
    // Override COEP/COOP set by edge to allow loading third-party CDN resources during transition
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    next();
});

// CORS configurazione: permetti solo i domini usati dall'applicazione
const allowedOrigins = [
    'https://innoverai.com',
    'https://dashboard.innoverai.com',
    'https://innoverai-production-06cb.up.railway.app',
    'https://api.innoverai.com',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1:8000',
    // aggiungi altri origin se necessario
];

app.use(cors({
    origin: function(origin, callback) {
        // Permetti richieste senza origin (es. curl, server-side)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: origin not allowed'));
    },
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true
}));

// Rispondi alle preflight requests
app.options('*', cors());

app.use(express.json());

// Serve static frontend in production if present
const path = require('path');
const fs = require('fs');
// Prefer serving static files from server/public for landing page
const frontendDist = path.join(__dirname, 'public');

// Host configuration for dashboard (allows dashboard.innoverai.com to serve the dashboard
// files while landing remains on the root domain). Can be overridden via env.
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || 'dashboard.innoverai.com';
const dashboardDist = path.join(__dirname, 'public', 'dashboard');

// Auto-detect presence of index.html and enable static serving in production or when explicitly enabled
try {
    const indexExists = fs.existsSync(path.join(frontendDist, 'index.html'));
    if (indexExists && (process.env.SERVE_STATIC === 'true' || process.env.NODE_ENV === 'production')) {
        console.log('📦 Serving frontend static files from', frontendDist);

        // If a request comes for the dashboard host, serve the dashboard static files
        if (fs.existsSync(dashboardDist)) {
            // If root path requested on dashboard host, serve dashboard index directly
            app.use((req, res, next) => {
                const host = (req.headers.host || '').split(':')[0];
                if (host === DASHBOARD_HOST && (req.path === '/' || req.path === '')) {
                    return res.sendFile(path.join(dashboardDist, 'index.html'));
                }
                return next();
            });

            // Serve other static assets from dashboard dist when host matches
            app.use((req, res, next) => {
                const host = (req.headers.host || '').split(':')[0];
                if (host === DASHBOARD_HOST) {
                    return express.static(dashboardDist)(req, res, next);
                }
                return next();
            });
        }

        // Default static for landing / other hosts
        app.use(express.static(frontendDist));
    } else {
        console.log('ℹ️ Frontend index.html not found or static serving not enabled (SERVE_STATIC not set / not production)');
    }
} catch (e) {
    console.error('Error checking frontend index.html:', e);
}

// PostgreSQL connection (Railway auto-provides DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

async function initDb() {
    const client = await pool.connect();
    try {
        // Create tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT,
                agent_id TEXT
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS knowledge (
                id SERIAL PRIMARY KEY,
                owner_username TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                created_at BIGINT NOT NULL,
                updated_at BIGINT
            );
        `);

        await client.query(`
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
        `);

        // Index per performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time);
        `);

        console.log('✅ Database tables initialized');

        // Ensure demo users exist
        const usersToEnsure = [
            { username: 'demo', password: 'demo', role: 'demo', name: 'Demo User' },
            { username: 'admin', password: 'jament78#@', role: 'admin', name: 'Admin' },
            { username: 'marco', password: 'esposito2025', role: 'client', name: 'Marco Esposito', agent_id: 'agent_0c73985e38f6110dbec24596c1' }
        ];

        for (const u of usersToEnsure) {
            const exists = await client.query('SELECT * FROM users WHERE username = $1', [u.username]);
            const hash = bcrypt.hashSync(u.password, 10);
            const agentId = u.agent_id || null;

            if (exists.rows.length === 0) {
                await client.query(
                    'INSERT INTO users (username, password_hash, role, name, agent_id) VALUES ($1, $2, $3, $4, $5)',
                    [u.username, hash, u.role, u.name, agentId]
                );
                console.log('Created user', u.username, 'agent:', agentId);
            } else {
                await client.query(
                    'UPDATE users SET password_hash = $1, role = $2, name = $3, agent_id = $4 WHERE username = $5',
                    [hash, u.role, u.name, agentId, u.username]
                );
                console.log('Updated user', u.username, 'agent:', agentId);
            }
        }
    } finally {
        client.release();
    }
}

// Initialize DB on startup
initDb().catch(err => {
    console.error('❌ Database initialization error:', err);
    // Don't crash the process: allow the server to start so the front-end (if served)
    // can still respond and we can inspect logs. In production you may want to
    // implement a retry/backoff strategy or exit depending on requirements.
});

// Auth endpoints
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const row = result.rows[0];
        const ok = bcrypt.compareSync(password, row.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        // Include agent_id in token if present
        const payload = { username: row.username, role: row.role, name: row.name };
        if (row.agent_id) payload.agent_id = row.agent_id;

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

        // Trigger Retell sync in background (don't wait for it to complete)
        if (process.env.RETELL_KEY) {
            setImmediate(async () => {
                try {
                    console.log(`[LOGIN] Triggering Retell sync for user ${username}...`);
                    const retellResp = await fetch('https://api.retellai.com/v2/list-calls', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.RETELL_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ limit: 1000 })
                    });
                    if (retellResp.ok) {
                        const retellCalls = await retellResp.json();
                        console.log(`[LOGIN] Syncing ${retellCalls.length} calls...`);
                        
                        // For non-admin users, only sync calls matching their agent_id
                        let callsToSync = retellCalls;
                        const userAgentId = row.agent_id;
                        if (row.role !== 'admin' && userAgentId) {
                            callsToSync = retellCalls.filter(call => call.agent_id === userAgentId);
                            console.log(`[LOGIN] Filtering to user's agent (${userAgentId}): ${callsToSync.length} calls`);
                        }
                        
                        for (const call of callsToSync) {
                            const call_id = call.call_id;
                            if (!call_id) continue;
                            let startTime = null;
                            let endTime = null;
                            if (call.start_time) {
                                const startMs = typeof call.start_time === 'string' ? parseInt(call.start_time) : call.start_time;
                                if (!isNaN(startMs)) startTime = new Date(startMs).toISOString();
                            }
                            if (call.end_time) {
                                const endMs = typeof call.end_time === 'string' ? parseInt(call.end_time) : call.end_time;
                                if (!isNaN(endMs)) endTime = new Date(endMs).toISOString();
                            }
                            const durationSecs = call.duration_ms ? Math.round(call.duration_ms / 1000) : null;
                            // Use the agent_id from the call (from Retell)
                            const agentId = call.agent_id || null;
                            const agentName = call.agent_name || null;
                            const transcript = call.transcript || '';
                            const callAnalysis = call.call_analysis || {};
                            const callSummary = callAnalysis.call_summary || null;
                            const detailedSummary = callAnalysis.custom_analysis_data?.detailed_call_summary || null;
                            const totalCost = call.total_cost || null;
                            const existing = await pool.query('SELECT id FROM calls WHERE call_id = $1', [call_id]);
                            const now = Date.now();
                            if (existing.rows.length > 0) {
                                await pool.query(`UPDATE calls SET from_number=$1, to_number=$2, start_time=$3, end_time=$4, duration_seconds=$5, direction=$6, status=$7, agent_id=$8, retell_agent_id=$9, retell_agent_name=$10, retell_call_status=$11, retell_transcript=$12, retell_total_cost=$13, call_summary=$14, detailed_call_summary=$15, updated_at=$16 WHERE call_id=$17`, [call.from, call.to, startTime, endTime, durationSecs, call.direction || 'inbound', call.status || 'completed', agentId, agentId, agentName, call.status || 'completed', transcript, totalCost, callSummary, detailedSummary, now, call_id]);
                            } else {
                                await pool.query(`INSERT INTO calls (call_id, from_number, to_number, start_time, end_time, duration_seconds, direction, status, agent_id, retell_agent_id, retell_agent_name, retell_call_status, retell_transcript, retell_total_cost, call_summary, detailed_call_summary, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [call_id, call.from, call.to, startTime, endTime, durationSecs, call.direction || 'inbound', call.status || 'completed', agentId, agentId, agentName, call.status || 'completed', transcript, totalCost, callSummary, detailedSummary, now, now]);
                            }
                        }
                        console.log(`[LOGIN] Retell sync completed - synced ${callsToSync.length} calls`);
                    }
                } catch (e) {
                    console.error('[LOGIN] Retell sync background error:', e.message);
                }
            });
        }

        res.json({ token, username: row.username, role: row.role, name: row.name, agent_id: row.agent_id || null });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Users management (admin)
app.get('/api/users', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await pool.query('SELECT username, role, name, agent_id FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user (admin) - can assign agent_id
app.post('/api/users', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { username, password, role, name, agent_id } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'username,password,role required' });

    try {
        const hash = bcrypt.hashSync(password, 10);
        await pool.query(
            'INSERT INTO users (username, password_hash, role, name, agent_id) VALUES ($1, $2, $3, $4, $5)',
            [username, hash, role, name || '', agent_id || null]
        );
        return res.json({ ok: true, username });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

// Update user (admin)
app.put('/api/users/:username', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const target = req.params.username;
    const { password, role, name, agent_id } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [target]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (password) {
            updates.push(`password_hash = $${paramIndex++}`);
            values.push(bcrypt.hashSync(password, 10));
        }
        if (role) {
            updates.push(`role = $${paramIndex++}`);
            values.push(role);
        }
        if (name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (typeof agent_id !== 'undefined') {
            updates.push(`agent_id = $${paramIndex++}`);
            values.push(agent_id);
        }

        if (updates.length === 0) return res.json({ ok: true });

        values.push(target);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE username = $${paramIndex}`,
            values
        );
        return res.json({ ok: true });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Knowledge base CRUD - scoped by owner
app.get('/api/kb', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const result = await pool.query('SELECT * FROM knowledge ORDER BY created_at DESC');
            return res.json(result.rows);
        }
        const result = await pool.query(
            'SELECT * FROM knowledge WHERE owner_username = $1 ORDER BY created_at DESC',
            [req.user.username]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get KB error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/kb', authMiddleware, async (req, res) => {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const now = Date.now();

    try {
        const result = await pool.query(
            'INSERT INTO knowledge (owner_username, title, content, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.username, title, content || '', now]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Create KB error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/kb/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { title, content } = req.body;
    const now = Date.now();

    try {
        const existing = await pool.query('SELECT * FROM knowledge WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const row = existing.rows[0];
        if (req.user.role !== 'admin' && row.owner_username !== req.user.username) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await pool.query(
            'UPDATE knowledge SET title = $1, content = $2, updated_at = $3 WHERE id = $4',
            [title || row.title, content || row.content, now, id]
        );

        const updated = await pool.query('SELECT * FROM knowledge WHERE id = $1', [id]);
        res.json(updated.rows[0]);
    } catch (err) {
        console.error('Update KB error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/kb/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);

    try {
        const existing = await pool.query('SELECT * FROM knowledge WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const row = existing.rows[0];
        if (req.user.role !== 'admin' && row.owner_username !== req.user.username) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await pool.query('DELETE FROM knowledge WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete KB error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Calls endpoints
// GET /api/calls - Recupera chiamate filtrate per utente
app.get('/api/calls', authMiddleware, async (req, res) => {
    try {
        // PUNTO 1: Rimosso limit di default - prendi TUTTE le chiamate
        const { limit, offset = 0, agent_id } = req.query;
        
        let query = 'SELECT * FROM calls';
        const params = [];
        const conditions = [];
        
        // Se l'utente non è admin, filtra per agent_id dell'utente
        if (req.user.role !== 'admin' && req.user.agent_id) {
            conditions.push(`agent_id = $${params.length + 1}`);
            params.push(req.user.agent_id);
        }
        
        // Filtro aggiuntivo per agent_id se specificato
        if (agent_id && req.user.role === 'admin') {
            conditions.push(`agent_id = $${params.length + 1}`);
            params.push(agent_id);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Ordina per start_time (data reale chiamata), fallback su created_at se NULL
        query += ` ORDER BY COALESCE(start_time, end_time, to_timestamp(created_at::bigint/1000)) DESC`;
        if (limit) {
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), parseInt(offset));
        }
        
        const result = await pool.query(query, params);
        res.json({ data: result.rows, count: result.rows.length });
    } catch (err) {
        console.error('Get calls error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sync-retell - Sincronizza le chiamate da Retell API nel database
app.post('/api/sync-retell', authMiddleware, async (req, res) => {
    try {
        const RETELL_KEY = process.env.RETELL_KEY;
        if (!RETELL_KEY) {
            return res.status(400).json({ error: 'RETELL_KEY not configured' });
        }

        console.log('[SYNC-RETELL] Starting sync from Retell API...');
        
        // Fetch calls from Retell
        const retellResp = await fetch('https://api.retellai.com/v2/list-calls', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RETELL_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 1000 })
        });

        if (!retellResp.ok) {
            console.error('[SYNC-RETELL] Retell API error:', retellResp.status);
            return res.status(500).json({ error: 'Retell API error', status: retellResp.status });
        }

        const retellCalls = await retellResp.json();
        console.log(`[SYNC-RETELL] Fetched ${retellCalls.length} calls from Retell`);

        let imported = 0;
        let updated = 0;

        // Upsert each call
        for (const call of retellCalls) {
            const call_id = call.call_id;
            if (!call_id) continue;

            // Extract call times (convert from milliseconds to ISO string if needed)
            let startTime = null;
            let endTime = null;
            if (call.start_time) {
                const startMs = typeof call.start_time === 'string' ? parseInt(call.start_time) : call.start_time;
                if (!isNaN(startMs)) {
                    startTime = new Date(startMs).toISOString();
                }
            }
            if (call.end_time) {
                const endMs = typeof call.end_time === 'string' ? parseInt(call.end_time) : call.end_time;
                if (!isNaN(endMs)) {
                    endTime = new Date(endMs).toISOString();
                }
            }

            // Calculate duration
            let durationSecs = call.duration_ms ? Math.round(call.duration_ms / 1000) : null;

            // Get agent info
            const agentId = call.agent_id || null;
            const agentName = call.agent_name || null;

            // Get transcript
            const transcript = call.transcript || '';

            // Get summaries
            const callAnalysis = call.call_analysis || {};
            const callSummary = callAnalysis.call_summary || null;
            const detailedSummary = callAnalysis.custom_analysis_data?.detailed_call_summary || null;

            // Get cost
            const totalCost = call.total_cost || null;

            // Check if call exists
            const existing = await pool.query('SELECT id FROM calls WHERE call_id = $1', [call_id]);
            const now = Date.now();

            if (existing.rows.length > 0) {
                // UPDATE
                await pool.query(`
                    UPDATE calls SET
                        from_number = $1,
                        to_number = $2,
                        start_time = $3,
                        end_time = $4,
                        duration_seconds = $5,
                        direction = $6,
                        status = $7,
                        agent_id = $8,
                        retell_agent_id = $9,
                        retell_agent_name = $10,
                        retell_call_status = $11,
                        retell_transcript = $12,
                        retell_total_cost = $13,
                        call_summary = $14,
                        detailed_call_summary = $15,
                        updated_at = $16
                    WHERE call_id = $17
                `, [
                    call.from, call.to, startTime, endTime, durationSecs,
                    call.direction || 'inbound', call.status || 'completed',
                    agentId, agentId, agentName, call.status || 'completed',
                    transcript, totalCost, callSummary, detailedSummary, now, call_id
                ]);
                updated++;
            } else {
                // INSERT
                await pool.query(`
                    INSERT INTO calls (
                        call_id, from_number, to_number, start_time, end_time,
                        duration_seconds, direction, status, agent_id,
                        retell_agent_id, retell_agent_name, retell_call_status,
                        retell_transcript, retell_total_cost, call_summary,
                        detailed_call_summary, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9,
                        $10, $11, $12, $13, $14, $15, $16, $17, $18
                    )
                `, [
                    call_id, call.from, call.to, startTime, endTime,
                    durationSecs, call.direction || 'inbound', call.status || 'completed', agentId,
                    agentId, agentName, call.status || 'completed',
                    transcript, totalCost, callSummary, detailedSummary, now, now
                ]);
                imported++;
            }
        }

        console.log(`[SYNC-RETELL] Done: imported=${imported}, updated=${updated}`);
        res.json({ ok: true, imported, updated, total: retellCalls.length });
    } catch (err) {
        console.error('[SYNC-RETELL] Error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// POST /api/calls - Inserisce o aggiorna una chiamata
app.post('/api/calls', authMiddleware, async (req, res) => {
    try {
            const {
            call_id,
            retell_call_id,
            from_number,
            to_number,
            start_time,
            end_time,
            duration_seconds,
            direction,
            status,
            agent_id,
            cost_per_minute,
            retell_agent_id,
            retell_agent_name,
            retell_call_status,
            retell_transcript,
            retell_total_cost,
            retell_llm_latency_ms,
            retell_recording_url,
            call_summary,
            detailed_call_summary
        } = req.body;
        
        // Use retell_call_id if provided, otherwise use call_id
        const uniqueId = retell_call_id || call_id;
        if (!uniqueId) {
            return res.status(400).json({ error: 'call_id or retell_call_id is required' });
        }
        
        const now = Date.now();
        
        // Verifica se la chiamata esiste già usando retell_call_id (UNIQUE key)
        const existing = await pool.query('SELECT id FROM calls WHERE retell_call_id = $1 OR call_id = $1', [uniqueId]);
        
        if (existing.rows.length > 0) {
            // UPDATE
            await pool.query(`
                UPDATE calls SET
                    call_id = $1,
                    retell_call_id = $2,
                    from_number = $3,
                    to_number = $4,
                    start_time = $5,
                    end_time = $6,
                    duration_seconds = $7,
                    direction = $8,
                    status = $9,
                    agent_id = $10,
                    cost_per_minute = $11,
                    retell_agent_id = $12,
                    retell_agent_name = $13,
                    retell_call_status = $14,
                    retell_transcript = $15,
                    retell_total_cost = $16,
                    retell_llm_latency_ms = $17,
                    retell_recording_url = $18,
                    call_summary = $19,
                    detailed_call_summary = $20,
                    updated_at = $21
                WHERE retell_call_id = $22 OR call_id = $22
            `, [
                uniqueId, uniqueId, from_number, to_number, start_time, end_time, duration_seconds,
                direction, status, agent_id, cost_per_minute,
                retell_agent_id, retell_agent_name, retell_call_status,
                retell_transcript, retell_total_cost, retell_llm_latency_ms,
                retell_recording_url, call_summary, detailed_call_summary, now, uniqueId
            ]);
            
            res.json({ ok: true, updated: true, call_id: uniqueId });
        } else {
            // INSERT
            await pool.query(`
                INSERT INTO calls (
                    call_id, retell_call_id, from_number, to_number, start_time, end_time,
                    duration_seconds, direction, status, agent_id, cost_per_minute,
                    retell_agent_id, retell_agent_name, retell_call_status,
                    retell_transcript, retell_total_cost, retell_llm_latency_ms,
                    retell_recording_url, call_summary, detailed_call_summary, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                )
            `, [
                uniqueId, uniqueId, from_number, to_number, start_time, end_time,
                duration_seconds, direction, status, agent_id, cost_per_minute,
                retell_agent_id, retell_agent_name, retell_call_status,
                retell_transcript, retell_total_cost, retell_llm_latency_ms,
                retell_recording_url, call_summary, detailed_call_summary, now, now
            ]);
            
            res.json({ ok: true, created: true, call_id: uniqueId });
        }
    } catch (err) {
        console.error('Insert/Update call error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// DELETE /api/calls - Elimina tutte le chiamate (per reset)
app.delete('/api/calls', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can delete all calls' });
    }
    
    try {
        await pool.query('DELETE FROM calls');
        res.json({ ok: true, message: 'All calls deleted' });
    } catch (err) {
        console.error('Delete all calls error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Expose a small safe configuration object to the frontend (no secrets)
app.get('/config', (req, res) => {
    try {
        // Build canonical base URL for API/APP. Prefer explicit BASE_URL_APP, then service URL, then public domain.
        let baseHost = process.env.BASE_URL_APP || process.env.RAILWAY_SERVICE_INNOVERAI_URL || process.env.RAILWAY_PUBLIC_DOMAIN || null;
        if (baseHost && !baseHost.startsWith('http')) {
            // If it's just a domain (e.g. api.innoverai.com), prefix with https://
            baseHost = `https://${baseHost}`;
        }

        const safeConfig = {
            // API_URL: public API base URL (with scheme)
            API_URL: baseHost,
            RETELL_BASE_URL: process.env.RETELL_BASE_URL || 'https://api.retellai.com',
            BASE_URL_APP: baseHost
            // NOTE: do NOT expose RETELL_API_KEY or SERVICE_API_KEY here
        };
        res.json(safeConfig);
    } catch (err) {
        console.error('Config endpoint error:', err);
        res.status(500).json({ error: 'Unable to read config' });
    }
});

// Admin-only endpoint to run migrations present in migrations/ directory
app.post('/admin/run-migrations', authMiddleware, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can run migrations' });
        }

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            if (!sql || sql.trim().length === 0) continue;
            console.log(`🛠 Running migration: ${file}`);
            // Run statements - may contain multiple commands
            await pool.query(sql);
        }

        res.json({ ok: true, ran: files });
    } catch (err) {
        console.error('Migration run error:', err);
        res.status(500).json({ error: 'Migration failed', details: err.message });
    }
});

// Serve a minimal health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

// SPA fallback: serve index.html for unknown routes (ONLY for non-API routes)
// This must be AFTER all API routes
// `frontendDist` is declared earlier in the file; reuse it here
try {
    const indexExists = require('fs').existsSync(path.join(frontendDist, 'index.html'));
    if (indexExists && (process.env.SERVE_STATIC === 'true' || process.env.NODE_ENV === 'production')) {
        app.get('*', (req, res) => {
            // Don't serve index.html for API routes or static files
            const pathStr = req.path || '';
            
            // Exclude API routes
            if (pathStr.startsWith('/api/')) {
                return res.status(404).json({ error: 'Not found' });
            }
            
            // Exclude specific routes
            if (pathStr === '/health' || pathStr === '/config') {
                return res.status(404).json({ error: 'Not found' });
            }
            
            // Exclude static directories (these are handled by express.static above)
            if (pathStr.startsWith('/public/') || pathStr.startsWith('/assets/') || pathStr.startsWith('/dashboard/')) {
                return res.status(404).json({ error: 'Not found' });
            }
            
            // Exclude common static file extensions
            const staticExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.css', '.js', '.json', '.woff', '.woff2', '.ttf', '.eot'];
            if (staticExtensions.some(ext => pathStr.toLowerCase().endsWith(ext))) {
                return res.status(404).json({ error: 'Not found' });
            }
            
            const indexPath = path.join(frontendDist, 'index.html');
            res.sendFile(indexPath);
        });
    }
} catch (e) {
    console.error('Error setting up SPA fallback:', e);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Server listening on port', PORT));
