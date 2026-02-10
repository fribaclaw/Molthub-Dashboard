/**
 * Molthub Dashboard Server v2
 * Express + Socket.IO + better-sqlite3 REST API
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import routes
const agentsRouter = require('./routes/agents');
const configRouter = require('./routes/config');
const logsRouter = require('./routes/logs');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Import database
const { logs, agents } = require('./db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// ===== API ROUTES =====

// Health check (Railway format)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0'
    });
});

// API Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// API Info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Molthub Dashboard v2',
        version: '2.0.0',
        description: '3D agent hub interface with character selection, world exploration, and agent configuration',
        nodeEnv: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});

// Character data API
app.get('/api/characters', (req, res) => {
    const characters = [
        { id: 'codex', name: 'Codex', role: 'Code Assistant', color: 0xc0c0c0, accentColor: 0xe0e0e0, description: 'Silver armor warrior of code', type: 'warrior', abilities: ['code-review', 'refactor', 'debug'] },
        { id: 'claude', name: 'Claude', role: 'Creative Assistant', color: 0x8b4513, accentColor: 0xff6b35, description: 'Brown tunic sage', type: 'mage', abilities: ['creative-write', 'analyze', 'summarize'] },
        { id: 'gemini', name: 'Gemini', role: 'Dual Core AI', color: 0x9d4edd, accentColor: 0xffd700, description: 'Purple and gold mystic', type: 'mystic', abilities: ['multimodal', 'translate', 'code-gen'] },
        { id: 'qwen', name: 'Qwen', role: 'Ninja Assistant', color: 0x7b2cbf, accentColor: 0x9d4edd, description: 'Purple-clad ninja', type: 'ninja', abilities: ['fast-inference', 'reasoning', 'math'] },
        { id: 'cursor', name: 'Cursor', role: 'Editor Agent', color: 0x2d2d2d, accentColor: 0x00ff88, description: 'Black hooded editor', type: 'rogue', abilities: ['inline-edit', 'predict', 'multi-file'] },
        { id: 'molty', name: 'Molty', role: 'Hub Administrator', color: 0xff3333, accentColor: 0xff6666, description: 'Red ant with computer interface', type: 'ant', abilities: ['admin', 'gateway', 'monitor'] }
    ];
    res.json(characters);
});

// World/Space data API
app.get('/api/worlds', (req, res) => {
    const worlds = [
        { id: 'dev-space', name: 'Development Space', description: 'Code editor and debugging environment', color: '#00ff88', accentGlow: 'rgba(0, 255, 136, 0.3)', agents: ['codex', 'cursor'], tasks: 3, active: true },
        { id: 'creative-lab', name: 'Creative Lab', description: 'Writing and creative collaboration', color: '#ff6b35', accentGlow: 'rgba(255, 107, 53, 0.3)', agents: ['claude'], tasks: 1, active: false },
        { id: 'mystic-realm', name: 'Mystic Realm', description: 'Multimodal and translation tasks', color: '#9d4edd', accentGlow: 'rgba(157, 78, 221, 0.3)', agents: ['gemini'], tasks: 5, active: false },
        { id: 'ninja-dojo', name: 'Ninja Dojo', description: 'Fast reasoning and math problems', color: '#7b2cbf', accentGlow: 'rgba(123, 44, 191, 0.3)', agents: ['qwen'], tasks: 2, active: false }
    ];
    res.json(worlds);
});

// Settings API
let userSettings = {
    theme: 'dark',
    soundEnabled: true,
    notifications: true,
    autoUpdate: false,
    selectedCharacter: 'molty',
    accentColor: '#ff3333',
    animations: true,
    language: 'en',
    defaultAgent: 'molty',
    maxAgents: 3
};

app.get('/api/settings', (req, res) => {
    res.json(userSettings);
});

app.post('/api/settings', (req, res) => {
    userSettings = { ...userSettings, ...req.body };
    logs.add({
        level: 'info',
        message: 'Settings updated',
        source: 'api',
        metadata: { settings: userSettings }
    });
    res.json({ success: true, settings: userSettings });
});

// Existing API Routes
app.use('/api/agents', agentsRouter);
app.use('/api/config', configRouter);
app.use('/api/logs', logsRouter);

// Catch-all for API 404s
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// Serve index.html for all other routes (SPA support) - exclude file extensions
app.get('*', (req, res) => {
    // Check if the request is for a file with extension
    if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(errorHandler);

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    logs.add({
        level: 'info',
        message: `Client connected: ${socket.id}`,
        source: 'socket'
    });
    
    // Send initial data
    socket.emit('init', { message: 'Connected to Molthub Dashboard v2' });
    
    // Agent status updates
    socket.on('agent-action', (data) => {
        console.log('Agent action:', data);
        logs.add({
            level: 'info',
            message: `Agent action: ${data.type}`,
            source: 'socket',
            metadata: data
        });
        // Broadcast to all clients
        io.emit('agent-update', {
            ...data,
            timestamp: new Date().toISOString()
        });
    });
    
    // Recruit agent
    socket.on('recruit-agent', (characterId) => {
        console.log('Recruiting agent:', characterId);
        logs.add({
            level: 'info',
            message: `Agent recruited: ${characterId}`,
            source: 'socket'
        });
        io.emit('notification', {
            type: 'success',
            message: `${characterId} has been recruited!`,
            timestamp: new Date().toISOString()
        });
    });
    
    // Disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     ⚡ Molthub Dashboard v2 ⚡         ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Server running on port ${PORT}         ║`);
    console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(21)} ║`);
    console.log(`║  Health check: /health                 ║`);
    console.log(`║  Socket.IO: Enabled                    ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('📡 API Endpoints:');
    console.log('  GET  /health              - Railway health check');
    console.log('  GET  /api/info            - API info');
    console.log('  GET  /api/characters      - Character data');
    console.log('  GET  /api/worlds          - World data');
    console.log('  GET  /api/settings        - User settings');
    console.log('  POST /api/settings        - Update settings');
    console.log('  GET  /api/agents          - Agent management');
    console.log('  GET  /api/logs            - System logs');
    console.log('────────────────────────────────');
    
    // Add startup log entry
    logs.add({
        level: 'info',
        message: `Server started on port ${PORT}`,
        source: 'system',
        metadata: { port: PORT, version: '2.0.0', socketio: true }
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down gracefully...');
    logs.add({
        level: 'info',
        message: 'Server shutting down',
        source: 'system'
    });
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    logs.add({
        level: 'info',
        message: 'Server shutting down (SIGINT)',
        source: 'system'
    });
    server.close(() => {
        process.exit(0);
    });
});

module.exports = { app, server, io };
