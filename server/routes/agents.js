/**
 * Agents API Routes
 * REST endpoints for agent management
 */

const express = require('express');
const router = express.Router();
const { connectedAgents } = require('../ws-server');

// GET /api/agents - List all connected agents
router.get('/', (req, res) => {
    const agents = Array.from(connectedAgents.entries()).map(([socketId, data]) => ({
        socketId,
        agentId: data.agentId,
        agentType: data.agentType,
        displayName: data.displayName,
        color: data.color,
        position: data.position,
        isMoving: data.isMoving,
        isJumping: data.isJumping,
        connectedAt: data.connectedAt,
        lastActivity: data.lastActivity
    }));

    res.json({
        count: agents.length,
        agents
    });
});

// GET /api/agents/:id - Get specific agent details
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    // Find by agentId or socketId
    let agent = null;
    for (const [socketId, data] of connectedAgents.entries()) {
        if (data.agentId === id || socketId === id) {
            agent = { socketId, ...data };
            break;
        }
    }

    if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
});

// GET /api/agents/stats/overview - Get agent statistics
router.get('/stats/overview', (req, res) => {
    const agents = Array.from(connectedAgents.values());
    
    const typeDistribution = agents.reduce((acc, agent) => {
        acc[agent.agentType] = (acc[agent.agentType] || 0) + 1;
        return acc;
    }, {});

    const stats = {
        totalConnected: agents.length,
        registeredAgents: agents.filter(a => a.agentId).length,
        authenticatedAgents: agents.filter(a => a.authenticated).length,
        typeDistribution,
        averageSessionLength: 0 // Would need historical data
    };

    res.json(stats);
});

module.exports = router;
