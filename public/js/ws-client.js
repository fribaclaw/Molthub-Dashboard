/**
 * Molthub Dashboard v2 - WebSocket Client
 * Handles real-time communication with the server
 */

class MolthubWebSocket {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.authenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.callbacks = {};
        this.localAgent = null;
        this.remoteAgents = new Map(); // socketId -> agent data
        this.speechBubbles = new Map(); // agentId -> bubble data
        this.anvilStatus = { occupied: false, queuePosition: 0 };
    }

    /**
     * Initialize WebSocket connection
     */
    connect(serverUrl = '') {
        const url = serverUrl || window.location.origin;
        
        console.log('[WS Client] Connecting to:', url);
        
        // Connect using Socket.IO
        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay
        });

        this.setupEventHandlers();
        
        return this;
    }

    /**
     * Setup Socket.IO event handlers
     */
    setupEventHandlers() {
        // Connection events
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
        this.socket.on('connect_error', (error) => this.handleError(error));

        // Authentication events
        this.socket.on('auth:success', (data) => this.handleAuthSuccess(data));

        // Agent registration
        this.socket.on('agent:registered', (data) => this.handleAgentRegistered(data));
        this.socket.on('agent:error', (data) => this.handleError(data));

        // World state
        this.socket.on('world:state', (data) => this.handleWorldState(data));
        this.socket.on('world:agents', (data) => this.handleWorldAgents(data));

        // Agent events
        this.socket.on('agent:joined', (data) => this.handleAgentJoined(data));
        this.socket.on('agent:left', (data) => this.handleAgentLeft(data));
        this.socket.on('agent:moved', (data) => this.handleAgentMoved(data));
        this.socket.on('agent:jumped', (data) => this.handleAgentJumped(data));
        this.socket.on('agent:teleported', (data) => this.handleAgentTeleported(data));
        this.socket.on('agent:waved', (data) => this.handleAgentWaved(data));
        this.socket.on('agent:danced', (data) => this.handleAgentDanced(data));
        this.socket.on('agent:emoted', (data) => this.handleAgentEmoted(data));

        // Speech bubble events
        this.socket.on('speech:shown', (data) => this.handleSpeechShown(data));
        this.socket.on('speech:hidden', (data) => this.handleSpeechHidden(data));

        // Anvil events
        this.socket.on('anvil:granted', (data) => this.handleAnvilGranted(data));
        this.socket.on('anvil:queued', (data) => this.handleAnvilQueued(data));
        this.socket.on('anvil:occupied', (data) => this.handleAnvilOccupied(data));
        this.socket.on('anvil:released', (data) => this.handleAnvilReleased(data));
        this.socket.on('anvil:working', (data) => this.handleAnvilWorking(data));
        this.socket.on('anvil:complete', (data) => this.handleAnvilComplete(data));
        this.socket.on('anvil:error', (data) => this.handleAnvilError(data));

        // System events
        this.socket.on('world:broadcast', (data) => this.handleBroadcast(data));
        this.socket.on('session:expired', (data) => this.handleSessionExpired(data));
    }

    /**
     * Handle successful connection
     */
    handleConnect() {
        console.log('[WS Client] Connected:', this.socket.id);
        this.connected = true;
        this.reconnectAttempts = 0;
        
        this.emit('connected', { socketId: this.socket.id });

        // Auto-authenticate after connection
        this.authenticate();
    }

    /**
     * Handle disconnection
     */
    handleDisconnect(reason) {
        console.log('[WS Client] Disconnected:', reason);
        this.connected = false;
        this.authenticated = false;
        
        this.emit('disconnected', { reason });
    }

    /**
     * Handle connection errors
     */
    handleError(error) {
        console.error('[WS Client] Error:', error);
        this.emit('error', error);
    }

    /**
     * Authenticate with the server
     */
    authenticate(username = null) {
        if (!this.connected) {
            console.warn('[WS Client] Cannot authenticate: not connected');
            return;
        }

        const authData = {
            username: username || this.generateUsername(),
            timestamp: Date.now()
        };

        this.socket.emit('authenticate', authData);
    }

    /**
     * Handle authentication success
     */
    handleAuthSuccess(data) {
        console.log('[WS Client] Authenticated:', data.username);
        this.authenticated = true;
        this.emit('authenticated', data);
    }

    /**
     * Register agent with selected character
     */
    registerAgent(agentData) {
        if (!this.connected) {
            console.warn('[WS Client] Cannot register: not connected');
            return;
        }

        this.socket.emit('agent:register', {
            agentId: agentData.id,
            agentType: agentData.type,
            displayName: agentData.name,
            color: '#' + agentData.color.toString(16).padStart(6, '0')
        });
    }

    /**
     * Handle agent registration confirmation
     */
    handleAgentRegistered(data) {
        console.log('[WS Client] Agent registered:', data);
        this.localAgent = {
            agentId: data.agentId,
            position: data.position
        };
        this.emit('agentRegistered', data);
    }

    /**
     * Update agent position
     */
    updatePosition(x, y, z, rotationY = null, velocity = null) {
        if (!this.connected || !this.localAgent) return;

        this.socket.emit('agent:move', {
            x, y, z,
            rotationY,
            velocity
        });
    }

    /**
     * Perform jump action
     */
    jump() {
        if (!this.connected || !this.localAgent) return;
        this.socket.emit('agent:jump');
    }

    /**
     * Teleport to a new position
     */
    teleport(x, y, z) {
        if (!this.connected || !this.localAgent) return;
        this.socket.emit('agent:teleport', { x, y, z });
    }

    /**
     * Send emote
     */
    sendEmote(emote) {
        if (!this.connected || !this.localAgent) return;
        this.socket.emit('agent:emote', { emote });
    }

    /**
     * Show speech bubble
     */
    showSpeechBubble(message, duration = 5000, style = 'default') {
        if (!this.connected || !this.localAgent) return;
        
        this.socket.emit('speech:show', {
            message,
            duration,
            style
        });
    }

    /**
     * Hide speech bubble
     */
    hideSpeechBubble() {
        if (!this.connected || !this.localAgent) return;
        this.socket.emit('speech:hide');
    }

    /**
     * Request anvil access
     */
    requestAnvil() {
        if (!this.connected) return;
        this.socket.emit('anvil:request');
    }

    /**
     * Release anvil
     */
    releaseAnvil() {
        if (!this.connected) return;
        this.socket.emit('anvil:release');
    }

    /**
     * Perform anvil work
     */
    anvilWork(action, data) {
        if (!this.connected) return;
        this.socket.emit('anvil:work', { action, data });
    }

    /**
     * Handle world state from server
     */
    handleWorldState(data) {
        console.log('[WS Client] World state received:', data);
        
        // Store remote agents
        data.agents.forEach(agent => {
            this.remoteAgents.set(agent.socketId, agent);
        });

        // Store speech bubbles
        data.speechBubbles.forEach(bubble => {
            this.speechBubbles.set(bubble.agentId, bubble);
        });

        // Update anvil status
        this.anvilStatus = {
            occupied: data.anvil.occupied,
            currentUser: data.anvil.currentUser,
            queueLength: data.anvil.queueLength
        };

        this.emit('worldState', data);
    }

    /**
     * Handle list of existing agents
     */
    handleWorldAgents(data) {
        data.forEach(agent => {
            this.remoteAgents.set(agent.socketId, agent);
        });
        this.emit('worldAgents', data);
    }

    /**
     * Handle new agent joining
     */
    handleAgentJoined(data) {
        console.log('[WS Client] Agent joined:', data.displayName);
        this.remoteAgents.set(data.socketId, data);
        this.emit('agentJoined', data);
    }

    /**
     * Handle agent leaving
     */
    handleAgentLeft(data) {
        console.log('[WS Client] Agent left:', data.displayName);
        this.remoteAgents.delete(data.socketId);
        this.speechBubbles.delete(data.agentId);
        this.emit('agentLeft', data);
    }

    /**
     * Handle agent movement
     */
    handleAgentMoved(data) {
        const agent = this.remoteAgents.get(data.socketId);
        if (agent) {
            agent.position = data.position;
            agent.rotationY = data.rotationY;
            agent.isMoving = data.isMoving;
        }
        this.emit('agentMoved', data);
    }

    /**
     * Handle agent jump
     */
    handleAgentJumped(data) {
        this.emit('agentJumped', data);
    }

    /**
     * Handle agent teleport
     */
    handleAgentTeleported(data) {
        const agent = this.remoteAgents.get(data.socketId);
        if (agent) {
            agent.position = data.position;
        }
        this.emit('agentTeleported', data);
    }

    /**
     * Handle agent wave
     */
    handleAgentWaved(data) {
        this.emit('agentWaved', data);
    }

    /**
     * Handle agent dance
     */
    handleAgentDanced(data) {
        this.emit('agentDanced', data);
    }

    /**
     * Handle agent emote
     */
    handleAgentEmoted(data) {
        this.emit('agentEmoted', data);
    }

    /**
     * Handle speech bubble shown
     */
    handleSpeechShown(data) {
        this.speechBubbles.set(data.agentId, data);
        this.emit('speechShown', data);
    }

    /**
     * Handle speech bubble hidden
     */
    handleSpeechHidden(data) {
        this.speechBubbles.delete(data.agentId);
        this.emit('speechHidden', data);
    }

    /**
     * Handle anvil access granted
     */
    handleAnvilGranted(data) {
        this.anvilStatus.occupied = true;
        this.anvilStatus.hasAccess = true;
        this.emit('anvilGranted', data);
    }

    /**
     * Handle anvil queued
     */
    handleAnvilQueued(data) {
        this.anvilStatus.queuePosition = data.position;
        this.emit('anvilQueued', data);
    }

    /**
     * Handle anvil occupied
     */
    handleAnvilOccupied(data) {
        this.anvilStatus.occupied = true;
        this.anvilStatus.currentUser = data.displayName;
        this.emit('anvilOccupied', data);
    }

    /**
     * Handle anvil released
     */
    handleAnvilReleased(data) {
        this.anvilStatus.occupied = false;
        this.anvilStatus.hasAccess = false;
        this.anvilStatus.currentUser = null;
        this.emit('anvilReleased', data);
    }

    /**
     * Handle anvil working
     */
    handleAnvilWorking(data) {
        this.emit('anvilWorking', data);
    }

    /**
     * Handle anvil work complete
     */
    handleAnvilComplete(data) {
        this.emit('anvilComplete', data);
    }

    /**
     * Handle anvil error
     */
    handleAnvilError(data) {
        console.error('[WS Client] Anvil error:', data.error);
        this.emit('anvilError', data);
    }

    /**
     * Handle server broadcast
     */
    handleBroadcast(data) {
        this.emit('broadcast', data);
    }

    /**
     * Handle session expired
     */
    handleSessionExpired(data) {
        console.warn('[WS Client] Session expired:', data.reason);
        this.authenticated = false;
        this.emit('sessionExpired', data);
    }

    /**
     * Event subscription system
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
        return this;
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.callbacks[event]) return;
        const index = this.callbacks[event].indexOf(callback);
        if (index > -1) {
            this.callbacks[event].splice(index, 1);
        }
        return this;
    }

    /**
     * Emit event to all listeners
     */
    emit(event, data) {
        if (!this.callbacks[event]) return;
        this.callbacks[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('[WS Client] Error in event handler:', error);
            }
        });
    }

    /**
     * Get all remote agents
     */
    getRemoteAgents() {
        return Array.from(this.remoteAgents.values());
    }

    /**
     * Get specific remote agent
     */
    getRemoteAgent(socketId) {
        return this.remoteAgents.get(socketId);
    }

    /**
     * Get active speech bubbles
     */
    getSpeechBubbles() {
        return Array.from(this.speechBubbles.values());
    }

    /**
     * Get anvil status
     */
    getAnvilStatus() {
        return this.anvilStatus;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.authenticated;
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    /**
     * Generate random username
     */
    generateUsername() {
        const adjectives = ['Agile', 'Brave', 'Clever', 'Swift', 'Mighty', 'Wise'];
        const nouns = ['Ant', 'Warrior', 'Mage', 'Ninja', 'Rogue', 'Mystic'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}${noun}_${Math.floor(Math.random() * 1000)}`;
    }
}

// Create global instance
window.molthubWS = new MolthubWebSocket();
