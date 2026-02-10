/**
 * Agent Configuration API Routes
 * GET /api/config/:agentId - Get agent configuration
 * POST /api/config/:agentId - Save agent configuration
 */

const express = require('express');
const router = express.Router();
const { agents, configs } = require('../db/database');

// GET /api/config/:agentId - Get agent configuration
router.get('/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        
        // Verify agent exists
        const agent = agents.getById(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        const config = configs.getByAgentId(agentId);
        
        if (!config) {
            return res.json({
                success: true,
                config: null,
                message: 'No configuration found for this agent'
            });
        }
        
        // Mask sensitive data in response
        const sanitizedConfig = {
            ...config,
            gateway_token: config.gateway_token ? '***masked***' : null,
            ssh_key_path: config.ssh_key_path || null
        };
        
        res.json({
            success: true,
            config: sanitizedConfig
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch configuration'
        });
    }
});

// POST /api/config/:agentId - Save agent configuration
router.post('/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        
        // Verify agent exists
        const agent = agents.getById(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        const {
            ssh_host,
            ssh_port,
            ssh_username,
            ssh_key_path,
            ssh_password,
            gateway_url,
            gateway_token,
            auto_connect
        } = req.body;
        
        // Validate SSH port if provided
        if (ssh_port !== undefined) {
            const port = parseInt(ssh_port);
            if (isNaN(port) || port < 1 || port > 65535) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid SSH port. Must be between 1 and 65535'
                });
            }
        }
        
        // Validate gateway URL if provided
        if (gateway_url && gateway_url.trim()) {
            try {
                new URL(gateway_url);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid gateway URL format'
                });
            }
        }
        
        // Build config object with only provided fields
        const config = {};
        
        if (ssh_host !== undefined) config.ssh_host = ssh_host || null;
        if (ssh_port !== undefined) config.ssh_port = parseInt(ssh_port) || 22;
        if (ssh_username !== undefined) config.ssh_username = ssh_username || null;
        if (ssh_key_path !== undefined) config.ssh_key_path = ssh_key_path || null;
        if (gateway_url !== undefined) config.gateway_url = gateway_url || null;
        if (gateway_token !== undefined) config.gateway_token = gateway_token || null;
        if (auto_connect !== undefined) config.auto_connect = auto_connect ? 1 : 0;
        
        // Save configuration
        const result = configs.save(agentId, config);
        
        // Get updated config
        const updatedConfig = configs.getByAgentId(agentId);
        
        // Sanitize response
        const sanitizedConfig = {
            ...updatedConfig,
            gateway_token: updatedConfig.gateway_token ? '***saved***' : null
        };
        
        res.json({
            success: true,
            message: 'Configuration saved successfully',
            config: sanitizedConfig
        });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save configuration'
        });
    }
});

// DELETE /api/config/:agentId - Delete agent configuration
router.delete('/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        
        // Verify agent exists
        const agent = agents.getById(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        configs.delete(agentId);
        
        res.json({
            success: true,
            message: 'Configuration deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete configuration'
        });
    }
});

module.exports = router;
