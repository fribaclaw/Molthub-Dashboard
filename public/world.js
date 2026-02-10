/**
 * Molthub Dashboard v2 - World Page
 * 3D world/space exploration with Socket.IO integration
 */

// ===== WORLD DATA =====
const worlds = [
    {
        id: 'dev-space',
        name: 'Development Space',
        description: 'Code editor and debugging environment',
        icon: '💻',
        color: '#00ff88',
        accentGlow: 'rgba(0, 255, 136, 0.3)',
        agents: ['codex', 'cursor'],
        tasks: 3,
        active: true
    },
    {
        id: 'creative-lab',
        name: 'Creative Lab',
        description: 'Writing and creative collaboration',
        icon: '🎨',
        color: '#ff6b35',
        accentGlow: 'rgba(255, 107, 53, 0.3)',
        agents: ['claude'],
        tasks: 1,
        active: false
    },
    {
        id: 'mystic-realm',
        name: 'Mystic Realm',
        description: 'Multimodal and translation tasks',
        icon: '🔮',
        color: '#9d4edd',
        accentGlow: 'rgba(157, 78, 221, 0.3)',
        agents: ['gemini'],
        tasks: 5,
        active: false
    },
    {
        id: 'ninja-dojo',
        name: 'Ninja Dojo',
        description: 'Fast reasoning and math problems',
        icon: '⚔️',
        color: '#7b2cbf',
        accentGlow: 'rgba(123, 44, 191, 0.3)',
        agents: ['qwen'],
        tasks: 2,
        active: false
    }
];

// ===== STATE =====
let selectedWorld = worlds[0];
let worldScene, worldCamera, worldRenderer, worldMesh;
let socket;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    renderWorldGrid();
    initWorldPreview();
    selectWorld(worlds[0].id);
    animate();
});

// ===== SOCKET.IO =====
function initSocket() {
    socket = io();
    
    socket.on('init', (data) => {
        console.log('Socket connected:', data);
    });
    
    socket.on('agent-update', (data) => {
        console.log('Agent update:', data);
    });
    
    socket.on('notification', (data) => {
        console.log('Notification:', data);
    });
}

// ===== WORLD GRID =====
function renderWorldGrid() {
    const grid = document.getElementById('worldGrid');
    
    worlds.forEach(world => {
        const card = createWorldCard(world);
        grid.appendChild(card);
    });
}

function createWorldCard(world) {
    const card = document.createElement('div');
    card.className = 'world-card';
    card.dataset.world = world.id;
    card.style.setProperty('--accent-color', world.color);
    card.style.setProperty('--accent-glow', world.accentGlow);
    
    if (world.active) card.classList.add('active');
    if (world.id === selectedWorld.id) card.classList.add('selected');
    
    const agentsHtml = world.agents.map((agent, i) => 
        `<span class="agent-badge" style="z-index: ${world.agents.length - i}">${agent.charAt(0).toUpperCase()}</span>`
    ).join('');
    
    card.innerHTML = `
        <div class="world-icon" style="background: ${world.color}20; box-shadow: 0 4px 15px ${world.accentGlow}">
            ${world.icon}
        </div>
        <h3>${world.name}</h3>
        <p>${world.description}</p>
        <div class="world-agents">
            ${agentsHtml}
        </div>
    `;
    
    card.addEventListener('click', () => selectWorld(world.id));
    
    return card;
}

function selectWorld(worldId) {
    selectedWorld = worlds.find(w => w.id === worldId);
    
    // Update UI
    document.querySelectorAll('.world-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.world === worldId) {
            card.classList.add('selected');
        }
    });
    
    // Update preview panel
    document.getElementById('selectedWorldName').textContent = selectedWorld.name;
    document.getElementById('selectedWorldDesc').textContent = selectedWorld.description;
    document.getElementById('activeAgentsCount').textContent = selectedWorld.agents.length;
    document.getElementById('tasksRunning').textContent = selectedWorld.tasks;
    
    // Update 3D preview
    updateWorldPreview();
    
    // Update button
    const enterBtn = document.getElementById('enterWorldBtn');
    enterBtn.textContent = 'Enter Space';
    enterBtn.style.background = selectedWorld.color;
    enterBtn.style.boxShadow = `0 4px 15px ${selectedWorld.accentGlow}`;
}

// ===== THREE.JS WORLD PREVIEW =====
function initWorldPreview() {
    const container = document.getElementById('worldPreviewContainer');
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 300;
    
    // Scene
    worldScene = new THREE.Scene();
    worldScene.background = new THREE.Color(0x0a0a15);
    
    // Add starfield
    createStarfield();
    
    // Camera
    worldCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    worldCamera.position.set(0, 0, 8);
    
    // Renderer
    worldRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    worldRenderer.setSize(width, height);
    worldRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(worldRenderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    worldScene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(3, 3, 5);
    worldScene.add(mainLight);
    
    // Initial world mesh
    createWorldMesh();
    
    // Button handler
    document.getElementById('enterWorldBtn').addEventListener('click', () => {
        if (socket) {
            socket.emit('agent-action', {
                type: 'enter-world',
                world: selectedWorld.id,
                user: 'user'
            });
        }
        alert(`Entering ${selectedWorld.name}...`);
    });
}

function createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    for (let i = 0; i < 1000; i++) {
        vertices.push(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100
        );
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    const stars = new THREE.Points(geometry, material);
    worldScene.add(stars);
    
    // Store for animation
    worldScene.userData.stars = stars;
}

function createWorldMesh() {
    if (worldMesh) {
        worldScene.remove(worldMesh);
    }
    
    const group = new THREE.Group();
    const color = new THREE.Color(selectedWorld.color);
    
    // Central platform
    const platformGeometry = new THREE.CylinderGeometry(2, 2.3, 0.3, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.7,
        metalness: 0.3
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1;
    group.add(platform);
    
    // Platform rings
    const ring1Geometry = new THREE.TorusGeometry(2.2, 0.05, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.6
    });
    const ring1 = new THREE.Mesh(ring1Geometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -0.85;
    group.add(ring1);
    
    const ring2 = ring1.clone();
    ring2.scale.set(1.1, 1.1, 1);
    ring2.position.y = -0.8;
    group.add(ring2);
    
    // World core - different shapes based on world type
    const coreColor = color.clone();
    coreColor.multiplyScalar(0.8);
    
    let core;
    switch(selectedWorld.id) {
        case 'dev-space':
            // Cube for dev
            core = createCubeCore(coreColor);
            break;
        case 'creative-lab':
            // Sphere for creative
            core = createSphereCore(coreColor);
            break;
        case 'mystic-realm':
            // Octahedron for mystic
            core = createMysticCore(coreColor);
            break;
        case 'ninja-dojo':
            // Pyramid/diamond for ninja
            core = createNinjaCore(coreColor);
            break;
        default:
            core = createSphereCore(coreColor);
    }
    
    group.add(core);
    
    // Floating particles
    for (let i = 0; i < 8; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        const angle = (i / 8) * Math.PI * 2;
        const radius = 3;
        particle.position.x = Math.cos(angle) * radius;
        particle.position.z = Math.sin(angle) * radius;
        particle.position.y = Math.sin(i * 1.5) * 0.5;
        particle.userData.orbitIndex = i;
        particle.userData.baseY = particle.position.y;
        
        group.add(particle);
    }
    
    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: color }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
                gl_FragColor = vec4(color, 1.0) * intensity * 0.5;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    worldMesh = group;
    worldScene.add(worldMesh);
}

function createCubeCore(color) {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add wireframe
    const wireGeometry = new THREE.EdgesGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const wireframe = new THREE.LineSegments(wireGeometry, wireMaterial);
    mesh.add(wireframe);
    
    mesh.userData.animator = (time) => {
        mesh.rotation.x = time * 0.5;
        mesh.rotation.y = time * 0.3;
    };
    
    return mesh;
}

function createSphereCore(color) {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.4
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add rings
    const ringGeometry = new THREE.TorusGeometry(1.5, 0.03, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2 + (i * 0.5);
        ring.rotation.y = i * 1;
        ring.userData.orbitIndex = i;
        mesh.add(ring);
    }
    
    mesh.userData.animator = (time) => {
        mesh.rotation.y = time * 0.2;
        mesh.children.forEach((ring, i) => {
            ring.rotation.z = time * (0.3 + i * 0.1);
        });
    };
    
    return mesh;
}

function createMysticCore(color) {
    const geometry = new THREE.OctahedronGeometry(1.2, 0);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.2,
        metalness: 0.6
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.userData.animator = (time) => {
        mesh.rotation.x = time * 0.4;
        mesh.rotation.y = time * 0.6;
        mesh.position.y = Math.sin(time * 2) * 0.2;
    };
    
    return mesh;
}

function createNinjaCore(color) {
    const geometry = new THREE.ConeGeometry(1, 2, 4);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.userData.animator = (time) => {
        mesh.rotation.y = time * 0.8;
        mesh.material.emissive = new THREE.Color(color);
        mesh.material.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.2;
    };
    
    return mesh;
}

function updateWorldPreview() {
    createWorldMesh();
}

// ===== ANIMATION LOOP =====
function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    // Animate starfield
    if (worldScene && worldScene.userData.stars) {
        worldScene.userData.stars.rotation.y = time * 0.02;
    }
    
    // Animate world rings
    if (worldMesh) {
        worldMesh.children.forEach(child => {
            if (child.geometry && child.geometry.type === 'TorusGeometry') {
                if (child.position.y > -0.82) {
                    child.rotation.z += 0.005;
                }
            }
        });
        
        // Animate core
        const core = worldMesh.children.find(c => c.userData.animator);
        if (core) {
            core.userData.animator(time);
        }
        
        // Animate particles
        worldMesh.children.forEach(child => {
            if (child.userData.orbitIndex !== undefined && child.geometry.type === 'SphereGeometry') {
                const i = child.userData.orbitIndex;
                const angle = time * 0.3 + (i * Math.PI * 2 / 8);
                const radius = 3;
                child.position.x = Math.cos(angle) * radius;
                child.position.z = Math.sin(angle) * radius;
                child.position.y = child.userData.baseY + Math.sin(time * 2 + i) * 0.3;
            }
        });
    }
    
    if (worldRenderer && worldScene && worldCamera) {
        worldRenderer.render(worldScene, worldCamera);
    }
}

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => {
    if (worldCamera && worldRenderer) {
        const container = document.getElementById('worldPreviewContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        worldCamera.aspect = width / height;
        worldCamera.updateProjectionMatrix();
        worldRenderer.setSize(width, height);
    }
});
