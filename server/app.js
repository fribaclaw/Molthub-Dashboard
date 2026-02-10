/**
 * Molthub Dashboard Server v2
 * Express + better-sqlite3 REST API
 */

const express = require('express');
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
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// API Routes
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

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 Molthub Dashboard Server v2');
    console.log('═══════════════════════════════');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('\n📡 API Endpoints:');
    console.log('  GET  /api/health          - Health check');
    console.log('  GET  /api/agents          - List all agents');
    console.log('  GET  /api/agents/:id      - Get specific agent');
    console.log('  POST /api/agents          - Create new agent');
    console.log('  GET  /api/config/:agentId - Get agent configuration');
    console.log('  POST /api/config/:agentId - Save agent configuration');
    console.log('  GET  /api/logs            - Get logs (with filters)');
    console.log('  GET  /api/logs/live       - Get recent logs for live feed');
    console.log('  GET  /api/logs/stats      - Get log statistics');
    console.log('────────────────────────────────');
    
    // Add startup log entry
    logs.add({
        level: 'info',
        message: `Server started on port ${PORT}`,
        source: 'system',
        metadata: { port: PORT, version: '2.0.0' }
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
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    logs.add({
        level: 'info',
        message: 'Server shutting down (SIGINT)',
        source: 'system'
    });
    process.exit(0);
});

module.exports = app;
