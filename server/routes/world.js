/**
 * World API Routes
 * REST endpoints for world state and management
 */

const express = require('express');
const router = express.Router();
const { getStats, broadcast } = require('../ws-server');

// World bounds configuration
const WORLD_BOUNDS = {
    x: { min: -50, max: 50 },
    y: { min: 0, max: 20 },
    z: { min: -50, max: 50 }
};

// GET /api/world/state - Get current world state
router.get('/state', (req, res) => {
    const stats = getStats();
    
    res.json({
        serverTime: Date.now(),
        worldBounds: WORLD_BOUNDS,
        stats,
        features: {
            positionSync: true,
            speechBubbles: true,
            anvilInteractions: true,
            socialEmotes: true
        }
    });
});

// GET /api/world/bounds - Get world boundaries
router.get('/bounds', (req, res) => {
    res.json(WORLD_BOUNDS);
});

// POST /api/world/broadcast - Admin broadcast to all clients
router.post('/broadcast', (req, res) => {
    const { message, type = 'notification' } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }

    broadcast('world:broadcast', {
        type,
        message,
        timestamp: Date.now()
    });

    res.json({ success: true, message: 'Broadcast sent' });
});

// GET /api/world/anvil - Get anvil status
router.get('/anvil', (req, res) => {
    const stats = getStats();
    
    res.json({
        occupied: stats.anvilOccupied,
        currentUser: stats.currentAnvilUser,
        queueLength: stats.anvilQueueLength
    });
});

module.exports = router;
