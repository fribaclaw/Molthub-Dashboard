/**
 * Molthub Dashboard v2 - Settings Panel JavaScript
 * Handles 3D preview, tab switching, monitoring logs, and agent configuration
 */

// ===== CHARACTER DATA =====
const characterVariants = [
    {
        id: 'molty',
        name: 'Molty',
        role: 'Hub Administrator',
        color: 0xff3333,
        accentColor: 0xff6666,
        description: 'Red ant with computer interface'
    },
    {
        id: 'molty-cyber',
        name: 'Molty Cyber',
        role: 'Cyber Administrator',
        color: 0xff0066,
        accentColor: 0x00ffff,
        description: 'Cyberpunk variant with neon accents'
    },
    {
        id: 'molty-gold',
        name: 'Molty Gold',
        role: 'Elite Administrator',
        color: 0xff3333,
        accentColor: 0xffd700,
        description: 'Gold-trimmed elite variant'
    },
    {
        id: 'molty-dark',
        name: 'Molty Dark',
        role: 'Shadow Administrator',
        color: 0x220000,
        accentColor: 0xff3333,
        description: 'Dark mode stealth variant'
    }
];

// ===== STATE =====
let currentVariant = 0;
let previewScene, previewCamera, previewRenderer, previewMesh;
let isRunning = false;
let logUpdateInterval;
let isConnected = false;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initCharacterPreview();
    initTabs();
    initVariantSelector();
    initStartButton();
    initTokenToggle();
    initTestConnection();
    initClearButtons();
    animate();
});

// ===== THREE.JS CHARACTER PREVIEW =====
function initCharacterPreview() {
    const container = document.getElementById('characterPreview');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x0a0a15);

    // Add subtle gradient background
    const bgGeometry = new THREE.PlaneGeometry(20, 20);
    const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color1: { value: new THREE.Color(0x1a1a2e) },
            color2: { value: new THREE.Color(0x0a0a15) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec2 vUv;
            void main() {
                gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
            }
        `,
        depthWrite: false
    });
    const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
    bgPlane.position.z = -5;
    previewScene.add(bgPlane);

    // Camera
    previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    previewCamera.position.set(0, 0.5, 5);

    // Renderer
    previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    previewRenderer.setSize(width, height);
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewRenderer.shadowMap.enabled = true;
    previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(previewRenderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    previewScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(3, 4, 5);
    mainLight.castShadow = true;
    previewScene.add(mainLight);

    const rimLight = new THREE.SpotLight(0xff3333, 0.8);
    rimLight.position.set(-5, 2, -3);
    rimLight.lookAt(0, 0, 0);
    previewScene.add(rimLight);

    const fillLight = new THREE.PointLight(0xff3333, 0.4);
    fillLight.position.set(2, -2, 3);
    previewScene.add(fillLight);

    // Create initial character model
    updateCharacterVariant(0);

    // Handle resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        previewCamera.aspect = newWidth / newHeight;
        previewCamera.updateProjectionMatrix();
        previewRenderer.setSize(newWidth, newHeight);
    });
}

// ===== CHARACTER MESH GENERATOR (Molty Variants) =====
function createMoltyCharacter(variant) {
    const group = new THREE.Group();
    const char = characterVariants[variant];
    const mainColor = new THREE.Color(char.color);
    const accentColor = new THREE.Color(char.accentColor);

    // Body (thorax)
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 0.8, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: mainColor,
        roughness: 0.4,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.2;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.4,
        metalness: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.7;
    head.castShadow = true;
    group.add(head);

    // Eyes based on variant
    const eyeColors = [0x00ff00, 0x00ffff, 0xffd700, 0xff0000];
    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: eyeColors[variant] });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.75, 0.3);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.75, 0.3);
    group.add(rightEye);

    // Antennae
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5);
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const leftAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    leftAntenna.position.set(-0.2, 1.1, 0);
    leftAntenna.rotation.z = 0.3;
    leftAntenna.rotation.x = 0.3;
    group.add(leftAntenna);
    const rightAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    rightAntenna.position.set(0.2, 1.1, 0);
    rightAntenna.rotation.z = -0.3;
    rightAntenna.rotation.x = 0.3;
    group.add(rightAntenna);

    // Abdomen (rear segment)
    const abdomenGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const abdomenMaterial = new THREE.MeshStandardMaterial({
        color: mainColor,
        roughness: 0.5,
        metalness: 0.2
    });
    const abdomen = new THREE.Mesh(abdomenGeometry, abdomenMaterial);
    abdomen.position.y = -1.0;
    abdomen.scale.y = 1.2;
    abdomen.castShadow = true;
    group.add(abdomen);

    // Computer interface on chest
    const screenGeometry = new THREE.PlaneGeometry(0.4, 0.3);
    const screenColors = [0x00ff00, 0x00ffff, 0xffd700, 0xff0000];
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: screenColors[variant],
        transparent: true,
        opacity: 0.8
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.0, 0.52);
    group.add(screen);

    // Variant-specific elements
    if (variant === 1) { // Cyber variant
        // Add neon accents
        const neonGeometry = new THREE.TorusGeometry(0.55, 0.02, 8, 32);
        const neonMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const neonRing = new THREE.Mesh(neonGeometry, neonMaterial);
        neonRing.position.y = -0.2;
        neonRing.rotation.x = Math.PI / 2;
        group.add(neonRing);
    } else if (variant === 2) { // Gold variant
        // Add gold trim
        const trimGeometry = new THREE.TorusGeometry(0.45, 0.03, 8, 32);
        const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.2 });
        const trim = new THREE.Mesh(trimGeometry, trimMaterial);
        trim.position.y = 0.2;
        trim.rotation.x = Math.PI / 2;
        group.add(trim);
    }

    // Legs (6 legs for ant)
    const legGeometry = new THREE.CylinderGeometry(0.06, 0.04, 1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    for (let i = 0; i < 3; i++) {
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.6, -0.4 - i * 0.3, 0);
        leftLeg.rotation.z = 1.2;
        leftLeg.rotation.y = -0.3;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.6, -0.4 - i * 0.3, 0);
        rightLeg.rotation.z = -1.2;
        rightLeg.rotation.y = 0.3;
        group.add(rightLeg);
    }

    // Store animator function
    group.userData.animator = (time) => {
        group.rotation.y = Math.sin(time * 0.5) * 0.2;
        group.position.y = Math.sin(time * 1.5) * 0.05;
        leftAntenna.rotation.x = 0.3 + Math.sin(time * 3) * 0.1;
        rightAntenna.rotation.x = 0.3 + Math.cos(time * 3) * 0.1;
    };

    return group;
}

function updateCharacterVariant(index) {
    currentVariant = index;
    
    if (previewMesh) {
        previewScene.remove(previewMesh);
    }
    
    previewMesh = createMoltyCharacter(index);
    previewScene.add(previewMesh);
    
    // Update rim light color
    const rimLight = previewScene.children.find(child => child instanceof THREE.SpotLight);
    if (rimLight) {
        const colors = [0xff3333, 0xff0066, 0xffd700, 0xff0000];
        rimLight.color.setHex(colors[index]);
    }

    // Update dot indicators
    document.querySelectorAll('.variant-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// ===== ANIMATION LOOP =====
function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    if (previewMesh && previewMesh.userData.animator) {
        previewMesh.userData.animator(time);
    }
    
    if (previewRenderer && previewScene && previewCamera) {
        previewRenderer.render(previewScene, previewCamera);
    }
}

// ===== TAB NAVIGATION =====
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding tab pane
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ===== VARIANT SELECTOR =====
function initVariantSelector() {
    const prevBtn = document.getElementById('prevVariant');
    const nextBtn = document.getElementById('nextVariant');
    const dots = document.querySelectorAll('.variant-dot');
    
    prevBtn.addEventListener('click', () => {
        const newIndex = (currentVariant - 1 + characterVariants.length) % characterVariants.length;
        updateCharacterVariant(newIndex);
    });
    
    nextBtn.addEventListener('click', () => {
        const newIndex = (currentVariant + 1) % characterVariants.length;
        updateCharacterVariant(newIndex);
    });
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            updateCharacterVariant(index);
        });
    });
}

// ===== START BUTTON =====
function initStartButton() {
    const startBtn = document.getElementById('startBtn');
    
    startBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        
        if (isRunning) {
            startBtn.classList.add('running');
            startBtn.innerHTML = `
                <span class="start-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                </span>
                Stop
            `;
            addLogEntry('INFO', 'Agent started successfully');
            simulateGatewayEvent('connection', 'Agent process started on node');
            
            // Simulate periodic logs
            logUpdateInterval = setInterval(() => {
                if (Math.random() > 0.7) {
                    const levels = ['DEBUG', 'INFO', 'WARN'];
                    const messages = [
                        'Processing task queue',
                        'Gateway heartbeat received',
                        'Checking node status',
                        'Task completed in 245ms',
                        'Polling for new messages'
                    ];
                    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
                    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                    addLogEntry(randomLevel, randomMessage);
                }
            }, 3000);
        } else {
            startBtn.classList.remove('running');
            startBtn.innerHTML = `
                <span class="start-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </span>
                Start
            `;
            clearInterval(logUpdateInterval);
            addLogEntry('INFO', 'Agent stopped');
            simulateGatewayEvent('disconnection', 'Agent process terminated');
        }
    });
}

// ===== TOKEN TOGGLE =====
function initTokenToggle() {
    const toggleBtn = document.getElementById('toggleToken');
    const tokenInput = document.getElementById('gatewayToken');
    let isVisible = false;
    
    toggleBtn.addEventListener('click', () => {
        isVisible = !isVisible;
        tokenInput.type = isVisible ? 'text' : 'password';
        toggleBtn.style.color = isVisible ? 'var(--accent-red)' : 'var(--text-secondary)';
    });
}

// ===== TEST CONNECTION =====
function initTestConnection() {
    const testBtn = document.getElementById('testConnection');
    const statusDot = document.querySelector('.connection-status .status-dot');
    const statusText = document.querySelector('.connection-status');
    
    testBtn.addEventListener('click', () => {
        // Visual feedback
        testBtn.style.pointerEvents = 'none';
        testBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            Testing...
        `;
        
        // Simulate connection test
        setTimeout(() => {
            isConnected = !isConnected;
            
            if (isConnected) {
                statusDot.classList.remove('offline');
                statusDot.classList.add('online');
                statusText.innerHTML = '<span class="status-dot online"></span>Connected';
                testBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Connected
                `;
                addLogEntry('INFO', 'SSH connection established successfully');
                simulateGatewayEvent('connection', 'SSH connection to remote host successful');
            } else {
                statusDot.classList.remove('online');
                statusDot.classList.add('offline');
                statusText.innerHTML = '<span class="status-dot offline"></span>Disconnected';
                testBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    Test Connection
                `;
                addLogEntry('WARN', 'SSH connection test failed');
            }
            
            testBtn.style.pointerEvents = 'auto';
        }, 1500);
    });
}

// ===== LOGGING SYSTEM =====
function addLogEntry(level, message) {
    const logsContainer = document.getElementById('liveLogs');
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${level.toLowerCase()}`;
    entry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-level">[${level}]</span>
        <span class="log-message">${message}</span>
    `;
    
    logsContainer.insertBefore(entry, logsContainer.firstChild);
    
    // Limit entries
    while (logsContainer.children.length > 50) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

function simulateGatewayEvent(type, detail) {
    const eventsContainer = document.getElementById('gatewayEvents');
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    eventItem.innerHTML = `
        <span class="event-time">${timeStr}</span>
        <span class="event-type ${type.toLowerCase()}">${type.toUpperCase()}</span>
        <span class="event-detail">${detail}</span>
    `;
    
    eventsContainer.insertBefore(eventItem, eventsContainer.firstChild);
    
    // Limit entries
    while (eventsContainer.children.length > 30) {
        eventsContainer.removeChild(eventsContainer.lastChild);
    }
}

// ===== CLEAR BUTTONS =====
function initClearButtons() {
    document.getElementById('clearLogs').addEventListener('click', () => {
        document.getElementById('liveLogs').innerHTML = '';
    });
    
    document.getElementById('clearEvents').addEventListener('click', () => {
        document.getElementById('gatewayEvents').innerHTML = '';
    });
}

// ===== PRESET CHIPS =====
document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        addLogEntry('INFO', `Routing preset changed to: ${chip.textContent}`);
    });
});

// Add CSS animation for spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);
