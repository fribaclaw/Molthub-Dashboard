/**
 * Auth API Routes
 * Authentication and session management endpoints
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory token store (use database in production)
const activeTokens = new Map();

// POST /api/auth/login - Simple login (demo purposes)
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Demo authentication - accept any username with password "demo"
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store token
    activeTokens.set(token, {
        username,
        sessionId,
        createdAt: Date.now()
    });

    res.json({
        success: true,
        token,
        sessionId,
        username,
        message: 'Login successful'
    });
});

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
    const { token } = req.body;
    
    if (token && activeTokens.has(token)) {
        activeTokens.delete(token);
    }

    res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/verify - Verify token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const session = activeTokens.get(token);
    res.json({
        valid: true,
        username: session.username,
        sessionId: session.sessionId
    });
});

module.exports = router;
