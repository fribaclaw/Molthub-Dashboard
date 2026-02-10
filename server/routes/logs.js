/**
 * Logs API Routes
 * GET /api/logs - Get logs with optional filtering
 * GET /api/logs/live - Get recent logs for live feed
 * POST /api/logs - Add new log entry
 * DELETE /api/logs - Clear old logs
 */

const express = require('express');
const router = express.Router();
const { logs } = require('../db/database');

// GET /api/logs - Get logs with filtering
router.get('/', (req, res) => {
    try {
        const {
            limit = 100,
            offset = 0,
            level,
            agentId,
            since
        } = req.query;
        
        const options = {
            limit: Math.min(parseInt(limit) || 100, 1000), // Max 1000
            offset: parseInt(offset) || 0
        };
        
        if (level && ['debug', 'info', 'warn', 'error'].includes(level)) {
            options.level = level;
        }
        
        if (agentId) {
            options.agentId = agentId;
        }
        
        if (since) {
            const sinceTimestamp = parseInt(since);
            if (!isNaN(sinceTimestamp)) {
                options.since = sinceTimestamp;
            }
        }
        
        const logEntries = logs.getAll(options);
        
        res.json({
            success: true,
            count: logEntries.length,
            logs: logEntries.map(log => ({
                ...log,
                metadata: log.metadata ? JSON.parse(log.metadata) : null
            }))
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs'
        });
    }
});

// GET /api/logs/live - Get recent logs for live feed (last 50)
router.get('/live', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const since = req.query.since ? parseInt(req.query.since) : null;
        
        let logEntries;
        if (since && !isNaN(since)) {
            // Get logs since timestamp (for polling)
            logEntries = logs.getSince(since);
        } else {
            // Get recent logs
            logEntries = logs.getRecent(limit);
        }
        
        res.json({
            success: true,
            count: logEntries.length,
            timestamp: Math.floor(Date.now() / 1000),
            logs: logEntries.map(log => ({
                ...log,
                metadata: log.metadata ? JSON.parse(log.metadata) : null
            }))
        });
    } catch (error) {
        console.error('Error fetching live logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live logs'
        });
    }
});

// GET /api/logs/stats - Get log statistics
router.get('/stats', (req, res) => {
    try {
        const stats = logs.getStats();
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error fetching log stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch log statistics'
        });
    }
});

// POST /api/logs - Add new log entry
router.post('/', (req, res) => {
    try {
        const {
            agentId,
            level = 'info',
            message,
            source = 'api',
            metadata
        } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Log message is required'
            });
        }
        
        if (!['debug', 'info', 'warn', 'error'].includes(level)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid log level. Must be debug, info, warn, or error'
            });
        }
        
        const logEntry = {
            agentId,
            level,
            message,
            source,
            metadata: metadata || null,
            timestamp: Math.floor(Date.now() / 1000)
        };
        
        const result = logs.add(logEntry);
        
        res.status(201).json({
            success: true,
            message: 'Log entry added',
            logId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error adding log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add log entry'
        });
    }
});

// DELETE /api/logs - Clear old logs
router.delete('/', (req, res) => {
    try {
        const daysToKeep = parseInt(req.query.days) || 7;
        
        if (daysToKeep < 1) {
            return res.status(400).json({
                success: false,
                error: 'Must keep at least 1 day of logs'
            });
        }
        
        const result = logs.clearOld(daysToKeep);
        
        res.json({
            success: true,
            message: `Cleared logs older than ${daysToKeep} days`,
            deletedCount: result.changes
        });
    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear logs'
        });
    }
});

module.exports = router;
