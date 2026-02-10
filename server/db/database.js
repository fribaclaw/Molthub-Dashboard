/**
 * Molthub Dashboard Database
 * better-sqlite3 integration for agents, configs, and logs
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'molthub.db');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initSchema() {
    // Agents table - stores connected agents
    db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT,
            type TEXT DEFAULT 'default',
            color TEXT,
            accent_color TEXT,
            description TEXT,
            status TEXT DEFAULT 'offline',
            last_seen INTEGER,
            created_at INTEGER DEFAULT (unixepoch()),
            updated_at INTEGER DEFAULT (unixepoch())
        )
    `);

    // Agent configurations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL UNIQUE,
            ssh_host TEXT,
            ssh_port INTEGER DEFAULT 22,
            ssh_username TEXT,
            ssh_key_path TEXT,
            gateway_url TEXT,
            gateway_token TEXT,
            auto_connect BOOLEAN DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch()),
            updated_at INTEGER DEFAULT (unixepoch()),
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        )
    `);

    // Logs table - stores gateway logs
    db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            level TEXT NOT NULL DEFAULT 'info',
            message TEXT NOT NULL,
            source TEXT,
            metadata TEXT,
            timestamp INTEGER DEFAULT (unixepoch()),
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        )
    `);

    // Create indexes for better query performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON logs(agent_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_configs_agent_id ON agent_configs(agent_id)`);

    // Insert default agents if not exists
    const defaultAgents = [
        { id: 'codex', name: 'Codex', role: 'Code Assistant', type: 'warrior', color: '#c0c0c0', accent_color: '#e0e0e0', description: 'Silver armor warrior of code' },
        { id: 'claude', name: 'Claude', role: 'Creative Assistant', type: 'mage', color: '#8b4513', accent_color: '#ff6b35', description: 'Brown tunic sage' },
        { id: 'gemini', name: 'Gemini', role: 'Dual Core AI', type: 'mystic', color: '#9d4edd', accent_color: '#ffd700', description: 'Purple and gold mystic' },
        { id: 'qwen', name: 'Qwen', role: 'Ninja Assistant', type: 'ninja', color: '#7b2cbf', accent_color: '#9d4edd', description: 'Purple-clad ninja' },
        { id: 'cursor', name: 'Cursor', role: 'Editor Agent', type: 'rogue', color: '#2d2d2d', accent_color: '#00ff88', description: 'Black hooded editor' },
        { id: 'molty', name: 'Molty', role: 'Hub Administrator', type: 'ant', color: '#ff3333', accent_color: '#ff6666', description: 'Red ant with computer interface' }
    ];

    const insertAgent = db.prepare(`
        INSERT OR IGNORE INTO agents (id, name, role, type, color, accent_color, description, status)
        VALUES (@id, @name, @role, @type, @color, @accent_color, @description, 'online')
    `);

    const insertConfig = db.prepare(`
        INSERT OR IGNORE INTO agent_configs (agent_id, auto_connect)
        VALUES (@agent_id, 0)
    `);

    for (const agent of defaultAgents) {
        insertAgent.run(agent);
        insertConfig.run({ agent_id: agent.id });
    }

    console.log('Database schema initialized');
}

// Run initialization
initSchema();

// Agent operations
const agents = {
    // Get all agents
    getAll: () => {
        return db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all();
    },

    // Get agent by ID
    getById: (id) => {
        return db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    },

    // Create new agent
    create: (agent) => {
        const stmt = db.prepare(`
            INSERT INTO agents (id, name, role, type, color, accent_color, description, status)
            VALUES (@id, @name, @role, @type, @color, @accent_color, @description, @status)
        `);
        const result = stmt.run(agent);
        
        // Create empty config for new agent
        db.prepare('INSERT INTO agent_configs (agent_id) VALUES (?)').run(agent.id);
        
        return result;
    },

    // Update agent
    update: (id, updates) => {
        const fields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
        const stmt = db.prepare(`
            UPDATE agents SET ${fields}, updated_at = unixepoch()
            WHERE id = @id
        `);
        return stmt.run({ ...updates, id });
    },

    // Delete agent
    delete: (id) => {
        return db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    },

    // Update agent status
    updateStatus: (id, status) => {
        return db.prepare(`
            UPDATE agents SET status = ?, last_seen = unixepoch(), updated_at = unixepoch()
            WHERE id = ?
        `).run(status, id);
    }
};

// Agent configuration operations
const configs = {
    // Get config by agent ID
    getByAgentId: (agentId) => {
        return db.prepare('SELECT * FROM agent_configs WHERE agent_id = ?').get(agentId);
    },

    // Update or create config
    save: (agentId, config) => {
        const existing = configs.getByAgentId(agentId);
        
        if (existing) {
            const fields = Object.keys(config).map(key => `${key} = @${key}`).join(', ');
            const stmt = db.prepare(`
                UPDATE agent_configs SET ${fields}, updated_at = unixepoch()
                WHERE agent_id = @agentId
            `);
            return stmt.run({ ...config, agentId });
        } else {
            const fields = Object.keys(config);
            const placeholders = fields.map(f => `@${f}`).join(', ');
            const columns = ['agent_id', ...fields].join(', ');
            const stmt = db.prepare(`
                INSERT INTO agent_configs (${columns}, created_at, updated_at)
                VALUES (@agentId, ${placeholders}, unixepoch(), unixepoch())
            `);
            return stmt.run({ ...config, agentId });
        }
    },

    // Delete config
    delete: (agentId) => {
        return db.prepare('DELETE FROM agent_configs WHERE agent_id = ?').run(agentId);
    }
};

// Log operations
const logs = {
    // Get all logs with optional filters
    getAll: ({ limit = 100, offset = 0, level, agentId, since } = {}) => {
        let query = 'SELECT * FROM logs WHERE 1=1';
        const params = [];

        if (level) {
            query += ' AND level = ?';
            params.push(level);
        }

        if (agentId) {
            query += ' AND agent_id = ?';
            params.push(agentId);
        }

        if (since) {
            query += ' AND timestamp > ?';
            params.push(since);
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return db.prepare(query).all(...params);
    },

    // Get recent logs (for live feed)
    getRecent: (limit = 50) => {
        return db.prepare(`
            SELECT l.*, a.name as agent_name 
            FROM logs l
            LEFT JOIN agents a ON l.agent_id = a.id
            ORDER BY l.timestamp DESC 
            LIMIT ?
        `).all(limit);
    },

    // Get logs since timestamp (for polling)
    getSince: (timestamp) => {
        return db.prepare(`
            SELECT l.*, a.name as agent_name 
            FROM logs l
            LEFT JOIN agents a ON l.agent_id = a.id
            WHERE l.timestamp > ?
            ORDER BY l.timestamp ASC
        `).all(timestamp);
    },

    // Add new log entry
    add: (log) => {
        const stmt = db.prepare(`
            INSERT INTO logs (agent_id, level, message, source, metadata, timestamp)
            VALUES (@agentId, @level, @message, @source, @metadata, @timestamp)
        `);
        return stmt.run({
            agentId: log.agentId || null,
            level: log.level || 'info',
            message: log.message,
            source: log.source || 'system',
            metadata: log.metadata ? JSON.stringify(log.metadata) : null,
            timestamp: log.timestamp || Math.floor(Date.now() / 1000)
        });
    },

    // Clear old logs
    clearOld: (daysToKeep = 7) => {
        const cutoff = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);
        return db.prepare('DELETE FROM logs WHERE timestamp < ?').run(cutoff);
    },

    // Get log stats
    getStats: () => {
        return db.prepare(`
            SELECT 
                level,
                COUNT(*) as count
            FROM logs
            WHERE timestamp > unixepoch() - 86400
            GROUP BY level
        `).all();
    }
};

// Cleanup function
function close() {
    db.close();
}

module.exports = {
    db,
    agents,
    configs,
    logs,
    close
};
