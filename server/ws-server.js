/**
 * Molthub Dashboard v2 - WebSocket Server
 * Socket.io implementation for real-time multi-agent world
 * 
 * Features:
 * - Agent position syncing (x, y, z coordinates)
 * - Speech bubble broadcast system
 * - Anvil interaction events
 * - User authentication/connection tracking
 */

const { Server } = require('socket.io');

// Store connected clients and their agent data
const connectedAgents = new Map(); // socketId -> agent data
const activeSpeechBubbles = new Map(); // agentId -> { message, timestamp, timeout }
const anvilQueue = []; // Users waiting to use the anvil
let currentAnvilUser = null;

let io = null;

// Agent types and validation
const VALID_AGENT_TYPES = ['ant', 'warrior', 'mage', 'mystic', 'ninja', 'rogue'];
const WORLD_BOUNDS = {
    x: { min: -50, max: 50 },
    y: { min: 0, max: 20 },
    z: { min: -50, max: 50 }
};

// Rate limiting
const rateLimits = new Map(); // socketId -> { lastUpdate, count }
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_UPDATES_PER_WINDOW = 30;

/**
 * Initialize WebSocket server
 */
function initWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', handleConnection);

    // Start background cleanup tasks
    startCleanupTasks();

    console.log('[WS] WebSocket server initialized');
    return io;
}

/**
 * Handle new socket connection
 */
function handleConnection(socket) {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Initialize rate limit tracking
    rateLimits.set(socket.id, { lastUpdate: Date.now(), count: 0 });

    // Send current world state to new client
    sendWorldState(socket);

    // Authentication handlers
    socket.on('authenticate', (data) => handleAuthentication(socket, data));
    socket.on('agent:register', (data) => handleAgentRegister(socket, data));
    
    // Position syncing
    socket.on('agent:move', (data) => handleAgentMove(socket, data));
    socket.on('agent:jump', (data) => handleAgentJump(socket, data));
    socket.on('agent:teleport', (data) => handleAgentTeleport(socket, data));
    
    // Speech bubble system
    socket.on('speech:show', (data) => handleSpeechShow(socket, data));
    socket.on('speech:hide', (data) => handleSpeechHide(socket, data));
    
    // Anvil interaction
    socket.on('anvil:request', () => handleAnvilRequest(socket));
    socket.on('anvil:release', () => handleAnvilRelease(socket));
    socket.on('anvil:work', (data) => handleAnvilWork(socket, data));
    
    // Social interactions
    socket.on('agent:wave', () => handleAgentWave(socket));
    socket.on('agent:dance', () => handleAgentDance(socket));
    socket.on('agent:emote', (data) => handleAgentEmote(socket, data));
    
    // Disconnection handler
    socket.on('disconnect', (reason) => handleDisconnect(socket, reason));

    // Error handler
    socket.on('error', (error) => {
        console.error(`[WS] Socket error for ${socket.id}:`, error);
    });
}

/**
 * Handle client authentication
 */
function handleAuthentication(socket, data) {
    const { username, token } = data || {};
    
    console.log(`[WS] Authentication attempt from ${socket.id}: ${username || 'anonymous'}`);
    
    // Simple token validation (in production, use JWT)
    const sessionId = generateSessionId();
    
    socket.emit('auth:success', {
        sessionId,
        username: username || `Agent_${socket.id.substr(0, 6)}`,
        serverTime: Date.now()
    });

    // Store connection info
    connectedAgents.set(socket.id, {
        socketId: socket.id,
        username: username || `Agent_${socket.id.substr(0, 6)}`,
        authenticated: true,
        sessionId,
        connectedAt: Date.now(),
        lastActivity: Date.now()
    });
}

/**
 * Handle agent registration with character selection
 */
function handleAgentRegister(socket, data) {
    const { agentId, agentType, displayName, color } = data || {};
    
    // Validate agent type
    if (!VALID_AGENT_TYPES.includes(agentType)) {
        socket.emit('agent:error', { 
            error: 'Invalid agent type',
            validTypes: VALID_AGENT_TYPES 
        });
        return;
    }

    const agent = connectedAgents.get(socket.id) || {};
    
    // Update agent data
    agent.agentId = agentId || socket.id;
    agent.agentType = agentType;
    agent.displayName = displayName || agent.username || `Agent_${socket.id.substr(0, 6)}`;
    agent.color = color || '#ff3333';
    agent.position = { x: 0, y: 0, z: 0 };
    agent.rotation = { x: 0, y: 0, z: 0 };
    agent.isMoving = false;
    agent.isJumping = false;
    agent.registeredAt = Date.now();
    agent.lastActivity = Date.now();

    connectedAgents.set(socket.id, agent);

    console.log(`[WS] Agent registered: ${agent.displayName} (${agent.agentType})`);

    // Confirm registration
    socket.emit('agent:registered', {
        agentId: agent.agentId,
        position: agent.position,
        message: `Welcome, ${agent.displayName}!`
    });

    // Notify all other clients about new agent
    socket.broadcast.emit('agent:joined', {
        socketId: socket.id,
        agentId: agent.agentId,
        agentType: agent.agentType,
        displayName: agent.displayName,
        color: agent.color,
        position: agent.position
    });

    // Send list of existing agents to new client
    const existingAgents = Array.from(connectedAgents.entries())
        .filter(([id, _]) => id !== socket.id)
        .map(([id, data]) => ({
            socketId: id,
            agentId: data.agentId,
            agentType: data.agentType,
            displayName: data.displayName,
            color: data.color,
            position: data.position
        }));
    
    socket.emit('world:agents', existingAgents);
}

/**
 * Handle agent movement update
 */
function handleAgentMove(socket, data) {
    if (!checkRateLimit(socket.id)) {
        socket.emit('agent:rateLimited', { 
            message: 'Too many move updates',
            retryAfter: RATE_LIMIT_WINDOW 
        });
        return;
    }

    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) {
        socket.emit('agent:error', { error: 'Agent not registered' });
        return;
    }

    const { x, y, z, rotationY, velocity } = data || {};

    // Validate position within world bounds
    const newPosition = {
        x: clamp(x ?? agent.position.x, WORLD_BOUNDS.x.min, WORLD_BOUNDS.x.max),
        y: clamp(y ?? agent.position.y, WORLD_BOUNDS.y.min, WORLD_BOUNDS.y.max),
        z: clamp(z ?? agent.position.z, WORLD_BOUNDS.z.min, WORLD_BOUNDS.z.max)
    };

    // Update agent position
    agent.position = newPosition;
    if (rotationY !== undefined) agent.rotation.y = rotationY;
    agent.isMoving = velocity && (Math.abs(velocity.x) > 0.01 || Math.abs(velocity.z) > 0.01);
    agent.lastActivity = Date.now();

    // Broadcast to all other clients (throttle for performance)
    socket.broadcast.emit('agent:moved', {
        socketId: socket.id,
        agentId: agent.agentId,
        position: newPosition,
        rotationY: agent.rotation.y,
        isMoving: agent.isMoving,
        velocity
    });
}

/**
 * Handle agent jump
 */
function handleAgentJump(socket, data) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    agent.isJumping = true;
    agent.lastActivity = Date.now();

    // Broadcast jump event
    io.emit('agent:jumped', {
        socketId: socket.id,
        agentId: agent.agentId,
        position: agent.position
    });

    // Reset jumping state after animation
    setTimeout(() => {
        const current = connectedAgents.get(socket.id);
        if (current) current.isJumping = false;
    }, 1000);
}

/**
 * Handle agent teleport
 */
function handleAgentTeleport(socket, data) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    const { x, y, z } = data || {};

    // Validate and set new position
    agent.position = {
        x: clamp(x ?? 0, WORLD_BOUNDS.x.min, WORLD_BOUNDS.x.max),
        y: clamp(y ?? 0, WORLD_BOUNDS.y.min, WORLD_BOUNDS.y.max),
        z: clamp(z ?? 0, WORLD_BOUNDS.z.min, WORLD_BOUNDS.z.max)
    };
    agent.lastActivity = Date.now();

    // Broadcast teleport to all clients
    io.emit('agent:teleported', {
        socketId: socket.id,
        agentId: agent.agentId,
        position: agent.position
    });
}

/**
 * Handle speech bubble display
 */
function handleSpeechShow(socket, data) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    const { message, duration = 5000, style = 'default' } = data || {};

    if (!message || message.length > 200) {
        socket.emit('speech:error', { error: 'Invalid message (max 200 chars)' });
        return;
    }

    // Clean message to prevent XSS
    const cleanMessage = sanitizeMessage(message);

    // Clear previous timeout if exists
    const previous = activeSpeechBubbles.get(agent.agentId);
    if (previous && previous.timeout) {
        clearTimeout(previous.timeout);
    }

    // Set auto-hide timeout
    const timeout = setTimeout(() => {
        hideSpeechBubble(agent.agentId);
    }, duration);

    // Store speech bubble
    activeSpeechBubbles.set(agent.agentId, {
        message: cleanMessage,
        style,
        timestamp: Date.now(),
        duration,
        timeout
    });

    agent.lastActivity = Date.now();

    // Broadcast to all clients
    io.emit('speech:shown', {
        socketId: socket.id,
        agentId: agent.agentId,
        displayName: agent.displayName,
        message: cleanMessage,
        style,
        duration,
        timestamp: Date.now()
    });
}

/**
 * Handle speech bubble hide
 */
function handleSpeechHide(socket, data) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    hideSpeechBubble(agent.agentId);
}

/**
 * Hide speech bubble and notify clients
 */
function hideSpeechBubble(agentId) {
    const bubble = activeSpeechBubbles.get(agentId);
    if (bubble && bubble.timeout) {
        clearTimeout(bubble.timeout);
    }
    
    activeSpeechBubbles.delete(agentId);
    io.emit('speech:hidden', { agentId });
}

/**
 * Handle anvil use request
 */
function handleAnvilRequest(socket) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) {
        socket.emit('anvil:error', { error: 'Agent not registered' });
        return;
    }

    // Check if already in queue or using
    const inQueue = anvilQueue.find(a => a.socketId === socket.id);
    if (currentAnvilUser?.socketId === socket.id || inQueue) {
        socket.emit('anvil:error', { error: 'Already in anvil queue' });
        return;
    }

    if (!currentAnvilUser) {
        // Anvil is free, grant access
        grantAnvilAccess(socket.id);
    } else {
        // Add to queue
        anvilQueue.push({
            socketId: socket.id,
            agentId: agent.agentId,
            displayName: agent.displayName,
            requestedAt: Date.now()
        });

        socket.emit('anvil:queued', {
            position: anvilQueue.length,
            estimatedWait: anvilQueue.length * 30 // rough estimate
        });

        // Notify current user someone is waiting
        const currentSocket = io.sockets.sockets.get(currentAnvilUser.socketId);
        if (currentSocket) {
            currentSocket.emit('anvil:waiting', {
                queueLength: anvilQueue.length
            });
        }
    }
}

/**
 * Handle anvil release
 */
function handleAnvilRelease(socket) {
    if (currentAnvilUser?.socketId !== socket.id) {
        socket.emit('anvil:error', { error: 'Not currently using anvil' });
        return;
    }

    releaseAnvil();
}

/**
 * Handle anvil work action
 */
function handleAnvilWork(socket, data) {
    if (currentAnvilUser?.socketId !== socket.id) {
        socket.emit('anvil:error', { error: 'Not currently using anvil' });
        return;
    }

    const { action, data: workData } = data || {};
    const agent = connectedAgents.get(socket.id);

    // Broadcast anvil work to all clients
    io.emit('anvil:working', {
        socketId: socket.id,
        agentId: agent.agentId,
        displayName: agent.displayName,
        action,
        data: workData,
        timestamp: Date.now()
    });

    // Simulate work completion after delay
    if (action === 'forge' || action === 'craft') {
        setTimeout(() => {
            socket.emit('anvil:complete', {
                action,
                result: 'success',
                item: workData?.item || 'unknown'
            });
        }, 2000);
    }
}

/**
 * Grant anvil access to next user in queue
 */
function grantAnvilAccess(socketId) {
    const agent = connectedAgents.get(socketId);
    if (!agent) return;

    currentAnvilUser = {
        socketId,
        agentId: agent.agentId,
        displayName: agent.displayName,
        grantedAt: Date.now()
    };

    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit('anvil:granted', {
            timeout: 300000, // 5 minutes max use time
            message: 'You have access to the anvil'
        });
    }

    // Broadcast to all clients
    io.emit('anvil:occupied', {
        agentId: agent.agentId,
        displayName: agent.displayName
    });

    // Set timeout for automatic release
    setTimeout(() => {
        if (currentAnvilUser?.socketId === socketId) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('anvil:timeout', { message: 'Anvil session expired' });
            }
            releaseAnvil();
        }
    }, 300000);
}

/**
 * Release anvil and grant to next in queue
 */
function releaseAnvil() {
    currentAnvilUser = null;
    io.emit('anvil:released', { timestamp: Date.now() });

    // Grant access to next in queue
    if (anvilQueue.length > 0) {
        const next = anvilQueue.shift();
        grantAnvilAccess(next.socketId);
        
        // Notify queue update to all waiting users
        anvilQueue.forEach((queued, index) => {
            const socket = io.sockets.sockets.get(queued.socketId);
            if (socket) {
                socket.emit('anvil:queued', {
                    position: index + 1,
                    estimatedWait: (index + 1) * 30
                });
            }
        });
    }
}

/**
 * Handle agent wave gesture
 */
function handleAgentWave(socket) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    agent.lastActivity = Date.now();
    
    io.emit('agent:waved', {
        socketId: socket.id,
        agentId: agent.agentId,
        displayName: agent.displayName
    });
}

/**
 * Handle agent dance
 */
function handleAgentDance(socket) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    agent.lastActivity = Date.now();
    
    io.emit('agent:danced', {
        socketId: socket.id,
        agentId: agent.agentId,
        displayName: agent.displayName
    });
}

/**
 * Handle generic emote
 */
function handleAgentEmote(socket, data) {
    const agent = connectedAgents.get(socket.id);
    if (!agent || !agent.agentId) return;

    const { emote } = data || {};
    const validEmotes = ['wave', 'dance', 'sit', 'point', 'cheer', 'facepalm'];

    if (!validEmotes.includes(emote)) {
        socket.emit('agent:error', { error: 'Invalid emote', validEmotes });
        return;
    }

    agent.lastActivity = Date.now();
    
    io.emit('agent:emoted', {
        socketId: socket.id,
        agentId: agent.agentId,
        displayName: agent.displayName,
        emote
    });
}

/**
 * Handle client disconnection
 */
function handleDisconnect(socket, reason) {
    console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);

    const agent = connectedAgents.get(socket.id);
    
    if (agent) {
        // Remove speech bubble
        if (agent.agentId) {
            hideSpeechBubble(agent.agentId);
        }

        // Release anvil if using
        if (currentAnvilUser?.socketId === socket.id) {
            releaseAnvil();
        }

        // Remove from anvil queue
        const queueIndex = anvilQueue.findIndex(a => a.socketId === socket.id);
        if (queueIndex !== -1) {
            anvilQueue.splice(queueIndex, 1);
        }

        // Notify other clients
        socket.broadcast.emit('agent:left', {
            socketId: socket.id,
            agentId: agent.agentId,
            displayName: agent.displayName
        });
    }

    // Cleanup
    connectedAgents.delete(socket.id);
    rateLimits.delete(socket.id);
}

/**
 * Send current world state to client
 */
function sendWorldState(socket) {
    const agents = Array.from(connectedAgents.entries()).map(([id, data]) => ({
        socketId: id,
        agentId: data.agentId,
        agentType: data.agentType,
        displayName: data.displayName,
        color: data.color,
        position: data.position,
        isMoving: data.isMoving
    }));

    const speechBubbles = Array.from(activeSpeechBubbles.entries()).map(([agentId, data]) => ({
        agentId,
        message: data.message,
        style: data.style,
        timestamp: data.timestamp,
        remaining: data.duration - (Date.now() - data.timestamp)
    }));

    socket.emit('world:state', {
        serverTime: Date.now(),
        worldBounds: WORLD_BOUNDS,
        agents,
        speechBubbles,
        anvil: {
            occupied: !!currentAnvilUser,
            currentUser: currentAnvilUser?.displayName || null,
            queueLength: anvilQueue.length
        }
    });
}

/**
 * Check rate limit for socket
 */
function checkRateLimit(socketId) {
    const now = Date.now();
    const limit = rateLimits.get(socketId);
    
    if (!limit) return true;

    if (now - limit.lastUpdate > RATE_LIMIT_WINDOW) {
        limit.lastUpdate = now;
        limit.count = 1;
        return true;
    }

    limit.count++;
    return limit.count <= MAX_UPDATES_PER_WINDOW;
}

/**
 * Sanitize message to prevent XSS
 */
function sanitizeMessage(message) {
    return message
        .replace(/[<>]/g, '')
        .substring(0, 200)
        .trim();
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start background cleanup tasks
 */
function startCleanupTasks() {
    // Clean up inactive agents every 30 seconds
    setInterval(() => {
        const now = Date.now();
        const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        for (const [socketId, agent] of connectedAgents.entries()) {
            if (now - agent.lastActivity > INACTIVE_THRESHOLD) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('session:expired', { 
                        reason: 'Inactive for too long',
                        inactiveTime: now - agent.lastActivity
                    });
                    socket.disconnect(true);
                }
            }
        }
    }, 30000);
}

/**
 * Get WebSocket server statistics
 */
function getStats() {
    return {
        connectedClients: connectedAgents.size,
        registeredAgents: Array.from(connectedAgents.values()).filter(a => a.agentId).length,
        activeSpeechBubbles: activeSpeechBubbles.size,
        anvilQueueLength: anvilQueue.length,
        anvilOccupied: !!currentAnvilUser,
        currentAnvilUser: currentAnvilUser?.displayName || null
    };
}

/**
 * Broadcast to all connected clients
 */
function broadcast(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

module.exports = {
    initWebSocket,
    getStats,
    broadcast,
    get connectedAgents() { return connectedAgents; }
};
