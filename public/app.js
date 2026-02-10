/**
 * Molthub Dashboard v2 - Three.js Character Selection
 * Phase 1: Basic Three.js Foundation + Character Selection
 */

// ===== CHARACTER DATA =====
const characters = [
    {
        id: 'codex',
        name: 'Codex',
        role: 'Code Assistant',
        color: 0xc0c0c0,
        accentColor: 0xe0e0e0,
        description: 'Silver armor warrior of code',
        type: 'warrior'
    },
    {
        id: 'claude',
        name: 'Claude',
        role: 'Creative Assistant',
        color: 0x8b4513,
        accentColor: 0xff6b35,
        description: 'Brown tunic sage',
        type: 'mage'
    },
    {
        id: 'gemini',
        name: 'Gemini',
        role: 'Dual Core AI',
        color: 0x9d4edd,
        accentColor: 0xffd700,
        description: 'Purple and gold mystic',
        type: 'mystic'
    },
    {
        id: 'qwen',
        name: 'Qwen',
        role: 'Ninja Assistant',
        color: 0x7b2cbf,
        accentColor: 0x9d4edd,
        description: 'Purple-clad ninja',
        type: 'ninja'
    },
    {
        id: 'cursor',
        name: 'Cursor',
        role: 'Editor Agent',
        color: 0x2d2d2d,
        accentColor: 0x00ff88,
        description: 'Black hooded editor',
        type: 'rogue'
    },
    {
        id: 'molty',
        name: 'Molty',
        role: 'Hub Administrator',
        color: 0xff3333,
        accentColor: 0xff6666,
        description: 'Red ant with computer interface',
        type: 'ant'
    }
];

// ===== STATE =====
let selectedCharacter = characters[5]; // Default to Molty
let previewScene, previewCamera, previewRenderer, previewMesh;
let thumbnailScenes = [];
let isAnimating = true;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCharacterGrid();
    initPreviewPanel();
    initSocket();
    animate();
});

// ===== SOCKET.IO =====
let socket;

function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to Molthub server');
    });
    
    socket.on('init', (data) => {
        console.log('Server says:', data.message);
    });
    
    socket.on('agent-update', (data) => {
        console.log('Agent update received:', data);
    });
    
    socket.on('notification', (data) => {
        console.log('Notification:', data);
        showNotification(data.message, data.type || 'info');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff3333' : '#0099ff'};
        color: #0a0a0f;
        font-weight: 600;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== NAVIGATION =====
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            
            // Update active nav button
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${sectionId}-section`) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// ===== CHARACTER GRID =====
function initCharacterGrid() {
    const grid = document.getElementById('characterGrid');
    
    characters.forEach((char, index) => {
        const card = createCharacterCard(char, index);
        grid.appendChild(card);
        
        // Create thumbnail 3D scene for each character
        createThumbnailScene(char, card.querySelector('.character-thumbnail'));
    });
    
    // Select default character
    selectCharacter(selectedCharacter.id);
}

function createCharacterCard(char, index) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.character = char.id;
    if (char.id === selectedCharacter.id) {
        card.classList.add('selected');
    }
    
    card.innerHTML = `
        <div class="character-thumbnail" id="thumb-${char.id}"></div>
        <div class="character-info">
            <div class="character-name">${char.name}</div>
            <div class="character-role">${char.role}</div>
        </div>
    `;
    
    card.addEventListener('click', () => selectCharacter(char.id));
    
    return card;
}

function selectCharacter(charId) {
    selectedCharacter = characters.find(c => c.id === charId);
    
    // Update UI
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.character === charId) {
            card.classList.add('selected');
        }
    });
    
    // Update preview panel
    document.getElementById('selectedCharacterName').textContent = selectedCharacter.name;
    document.getElementById('selectedCharacterRole').textContent = selectedCharacter.role;
    
    // Update 3D preview
    updatePreviewModel(selectedCharacter);
}

// ===== THREE.JS THUMBNAIL SCENES =====
function createThumbnailScene(char, container) {
    const width = container.clientWidth || 200;
    const height = container.clientHeight || 120;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12121a);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(char.color, 0.5);
    pointLight.position.set(-2, 1, 3);
    scene.add(pointLight);
    
    // Create character mesh
    const mesh = createCharacterMesh(char, true);
    scene.add(mesh);
    
    // Store for animation
    thumbnailScenes.push({
        scene,
        camera,
        renderer,
        mesh,
        char,
        time: Math.random() * Math.PI * 2
    });
}

// ===== THREE.JS PREVIEW PANEL =====
function initPreviewPanel() {
    const container = document.getElementById('previewContainer');
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 400;
    
    // Scene
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x0a0a15);
    
    // Add gradient background effect
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
    previewCamera.position.set(0, 0, 6);
    
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
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    previewScene.add(mainLight);
    
    const rimLight = new THREE.SpotLight(0xff3333, 0.8);
    rimLight.position.set(-5, 2, -3);
    rimLight.lookAt(0, 0, 0);
    previewScene.add(rimLight);
    
    const fillLight = new THREE.PointLight(selectedCharacter.color, 0.6);
    fillLight.position.set(2, -2, 3);
    previewScene.add(fillLight);
    
    // Create initial character model
    previewMesh = createCharacterMesh(selectedCharacter, false);
    previewScene.add(previewMesh);
    
    // Recruit button handler
    document.getElementById('recruitBtn').addEventListener('click', () => {
        alert(`Recruited ${selectedCharacter.name}!`);
    });
}

function updatePreviewModel(char) {
    if (previewMesh) {
        previewScene.remove(previewMesh);
    }
    previewMesh = createCharacterMesh(char, false);
    previewScene.add(previewMesh);
    
    // Update rim light color
    const rimLight = previewScene.children.find(child => child instanceof THREE.SpotLight);
    if (rimLight) {
        rimLight.color.setHex(char.color);
    }
}

// ===== CHARACTER MESH GENERATORS =====
function createCharacterMesh(char, isThumbnail) {
    const group = new THREE.Group();
    
    switch (char.type) {
        case 'ant':
            createAntCharacter(group, char, isThumbnail);
            break;
        case 'warrior':
            createWarriorCharacter(group, char, isThumbnail);
            break;
        case 'mage':
            createMageCharacter(group, char, isThumbnail);
            break;
        case 'mystic':
            createMysticCharacter(group, char, isThumbnail);
            break;
        case 'ninja':
            createNinjaCharacter(group, char, isThumbnail);
            break;
        case 'rogue':
            createRogueCharacter(group, char, isThumbnail);
            break;
        default:
            createDefaultCharacter(group, char, isThumbnail);
    }
    
    return group;
}

// Molty - Red Ant Character
function createAntCharacter(group, char, isThumbnail) {
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
    
    // Eyes (glowing)
    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
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
    abdomen.position.y = -0.8;
    abdomen.scale.y = 1.2;
    abdomen.castShadow = true;
    group.add(abdomen);
    
    // Computer interface on chest
    const screenGeometry = new THREE.PlaneGeometry(0.4, 0.3);
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.2, 0.52);
    group.add(screen);
    
    // Legs (6 legs for ant)
    const legGeometry = new THREE.CylinderGeometry(0.06, 0.04, 1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    for (let i = 0; i < 3; i++) {
        // Left legs
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.6, -0.2 - i * 0.3, 0);
        leftLeg.rotation.z = 1.2;
        leftLeg.rotation.y = -0.3;
        group.add(leftLeg);
        
        // Right legs
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.6, -0.2 - i * 0.3, 0);
        rightLeg.rotation.z = -1.2;
        rightLeg.rotation.y = 0.3;
        group.add(rightLeg);
    }
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            group.rotation.y = Math.sin(time * 0.5) * 0.2;
            group.position.y = Math.sin(time * 1.5) * 0.1;
            // Animate antennae
            leftAntenna.rotation.x = 0.3 + Math.sin(time * 3) * 0.1;
            rightAntenna.rotation.x = 0.3 + Math.cos(time * 3) * 0.1;
        };
    }
}

// Codex - Silver Warrior
function createWarriorCharacter(group, char, isThumbnail) {
    const armorColor = new THREE.Color(0xc0c0c0);
    const darkMetal = new THREE.Color(0x444444);
    
    // Torso armor
    const torsoGeometry = new THREE.BoxGeometry(0.8, 1, 0.5);
    const armorMaterial = new THREE.MeshStandardMaterial({
        color: armorColor,
        roughness: 0.3,
        metalness: 0.8
    });
    const torso = new THREE.Mesh(torsoGeometry, armorMaterial);
    torso.castShadow = true;
    group.add(torso);
    
    // Chest plate
    const chestGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.1);
    const chestPlate = new THREE.Mesh(chestGeometry, armorMaterial);
    chestPlate.position.set(0, 0.2, 0.3);
    group.add(chestPlate);
    
    // Shoulder pads
    const shoulderGeometry = new THREE.SphereGeometry(0.35, 12, 12);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
    leftShoulder.position.set(-0.5, 0.5, 0);
    group.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
    rightShoulder.position.set(0.5, 0.5, 0);
    group.add(rightShoulder);
    
    // Helmet
    const helmetGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const helmet = new THREE.Mesh(helmetGeometry, armorMaterial);
    helmet.position.y = 0.9;
    helmet.castShadow = true;
    group.add(helmet);
    
    // Visor
    const visorGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.2);
    const visorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 0.9, 0.35);
    group.add(visor);
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            group.rotation.y = time * 0.3;
        };
    }
}

// Claude - Brown Tunic Mage
function createMageCharacter(group, char, isThumbnail) {
    const tunicColor = new THREE.Color(0x8b4513);
    const accentColor = new THREE.Color(0xff6b35);
    
    // Robe body
    const robeGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    const robeMaterial = new THREE.MeshStandardMaterial({
        color: tunicColor,
        roughness: 0.8,
        metalness: 0.1
    });
    const robe = new THREE.Mesh(robeGeometry, robeMaterial);
    robe.position.y = -0.2;
    robe.castShadow = true;
    group.add(robe);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffccaa,
        roughness: 0.5
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.6;
    group.add(head);
    
    // Hood
    const hoodGeometry = new THREE.SphereGeometry(0.45, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hood = new THREE.Mesh(hoodGeometry, robeMaterial);
    hood.position.y = 0.6;
    group.add(hood);
    
    // Staff
    const staffGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2.5);
    const staffMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const staff = new THREE.Mesh(staffGeometry, staffMaterial);
    staff.position.set(0.8, 0, 0.3);
    staff.rotation.x = 0.2;
    group.add(staff);
    
    // Gem on staff
    const gemGeometry = new THREE.OctahedronGeometry(0.15);
    const gemMaterial = new THREE.MeshBasicMaterial({ color: accentColor });
    const gem = new THREE.Mesh(gemGeometry, gemMaterial);
    gem.position.set(0.8, 1.2, 0.5);
    group.add(gem);
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            group.position.y = Math.sin(time) * 0.05;
            gem.rotation.y = time;
            gem.material.color.setHSL((time * 0.1) % 1, 1, 0.5);
        };
    }
}

// Gemini - Purple/Gold Mystic
function createMysticCharacter(group, char, isThumbnail) {
    const purpleColor = new THREE.Color(0x9d4edd);
    const goldColor = new THREE.Color(0xffd700);
    
    // Flowing robes
    const robeGeometry = new THREE.CylinderGeometry(0.3, 0.6, 1.4, 8);
    const robeMaterial = new THREE.MeshStandardMaterial({
        color: purpleColor,
        roughness: 0.6,
        metalness: 0.3
    });
    const robe = new THREE.Mesh(robeGeometry, robeMaterial);
    robe.position.y = -0.1;
    robe.castShadow = true;
    group.add(robe);
    
    // Gold trim
    const trimGeometry = new THREE.TorusGeometry(0.32, 0.03, 8, 16);
    const trimMaterial = new THREE.MeshStandardMaterial({
        color: goldColor,
        roughness: 0.2,
        metalness: 1
    });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.position.y = 0.5;
    trim.rotation.x = Math.PI / 2;
    group.add(trim);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.32, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffddaa,
        roughness: 0.4
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.65;
    group.add(head);
    
    // Crown
    const crownGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6);
    const crown = new THREE.Mesh(crownGeometry, trimMaterial);
    crown.position.y = 0.95;
    group.add(crown);
    
    // Orbs floating around
    for (let i = 0; i < 3; i++) {
        const orbGeometry = new THREE.SphereGeometry(0.12, 12, 12);
        const orbMaterial = new THREE.MeshBasicMaterial({ color: goldColor });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.userData.orbitIndex = i;
        orb.userData.orbitRadius = 1;
        group.add(orb);
    }
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            group.rotation.y = Math.sin(time * 0.3) * 0.2;
            // Animate orbs
            group.children.forEach(child => {
                if (child.userData.orbitIndex !== undefined) {
                    const i = child.userData.orbitIndex;
                    const angle = time + (i * Math.PI * 2 / 3);
                    child.position.x = Math.cos(angle) * child.userData.orbitRadius;
                    child.position.z = Math.sin(angle) * child.userData.orbitRadius;
                    child.position.y = 0.5 + Math.sin(time * 2 + i) * 0.2;
                }
            });
        };
    }
}

// Qwen - Purple Ninja
function createNinjaCharacter(group, char, isThumbnail) {
    const ninjaPurple = new THREE.Color(0x7b2cbf);
    const darkPurple = new THREE.Color(0x4a148c);
    
    // Ninja suit
    const suitGeometry = new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8);
    const suitMaterial = new THREE.MeshStandardMaterial({
        color: ninjaPurple,
        roughness: 0.7
    });
    const suit = new THREE.Mesh(suitGeometry, suitMaterial);
    suit.position.y = -0.1;
    suit.castShadow = true;
    group.add(suit);
    
    // Hood
    const hoodGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const hood = new THREE.Mesh(hoodGeometry, suitMaterial);
    hood.position.y = 0.65;
    group.add(hood);
    
    // Mask/face visible area
    const faceGeometry = new THREE.CircleGeometry(0.25, 16);
    const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xffccaa });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(0, 0.6, 0.32);
    group.add(face);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.65, 0.35);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.65, 0.35);
    group.add(rightEye);
    
    // Scarf/cape flowing
    const scarfGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.1);
    const scarfMaterial = new THREE.MeshStandardMaterial({
        color: darkPurple,
        roughness: 0.8
    });
    const scarf = new THREE.Mesh(scarfGeometry, scarfMaterial);
    scarf.position.set(0, 0.3, -0.4);
    scarf.rotation.x = 0.3;
    group.add(scarf);
    
    // Katana on back
    const katanaGeometry = new THREE.BoxGeometry(0.08, 1.5, 0.05);
    const katanaMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.9,
        roughness: 0.1
    });
    const katana = new THREE.Mesh(katanaGeometry, katanaMaterial);
    katana.position.set(0, 0.2, -0.5);
    katana.rotation.z = 0.2;
    group.add(katana);
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            group.rotation.y = Math.sin(time * 0.5) * 0.3;
            scarf.rotation.x = 0.3 + Math.sin(time * 3) * 0.1;
        };
    }
}

// Cursor - Black Hooded Rogue
function createRogueCharacter(group, char, isThumbnail) {
    const blackColor = new THREE.Color(0x1a1a1a);
    const cursorGreen = new THREE.Color(0x00ff88);
    
    // Dark cloak
    const cloakGeometry = new THREE.ConeGeometry(0.5, 1.6, 8);
    const cloakMaterial = new THREE.MeshStandardMaterial({
        color: blackColor,
        roughness: 0.9
    });
    const cloak = new THREE.Mesh(cloakGeometry, cloakMaterial);
    cloak.position.y = -0.15;
    cloak.castShadow = true;
    group.add(cloak);
    
    // Hood
    const hoodGeometry = new THREE.SphereGeometry(0.38, 16, 16);
    const hood = new THREE.Mesh(hoodGeometry, cloakMaterial);
    hood.position.y = 0.65;
    group.add(hood);
    
    // Glowing cursor icon on chest
    const cursorGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.02);
    const cursorMaterial = new THREE.MeshBasicMaterial({ 
        color: cursorGreen,
        transparent: true,
        opacity: 0.9
    });
    const cursorIcon = new THREE.Mesh(cursorGeometry, cursorMaterial);
    cursorIcon.position.set(0, 0.2, 0.45);
    group.add(cursorIcon);
    
    // Glowing eyes in shadow
    const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: cursorGreen });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 0.7, 0.3);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 0.7, 0.3);
    group.add(rightEye);
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            group.rotation.y = Math.sin(time * 0.4) * 0.15;
            // Pulse effect on cursor icon
            cursorIcon.material.opacity = 0.7 + Math.sin(time * 4) * 0.2;
        };
    }
}

function createDefaultCharacter(group, char, isThumbnail) {
    const geometry = new THREE.IcosahedronGeometry(0.6, 1);
    const material = new THREE.MeshStandardMaterial({
        color: char.color,
        roughness: 0.5,
        metalness: 0.3,
        flatShading: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    group.add(mesh);
    
    if (!isThumbnail) {
        group.userData.animator = (time) => {
            mesh.rotation.x = time * 0.3;
            mesh.rotation.y = time * 0.5;
        };
    }
}

// ===== ANIMATION LOOP =====
function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    // Animate thumbnails
    thumbnailScenes.forEach(({ scene, camera, renderer, mesh, time: offset }) => {
        if (mesh && mesh.userData.animator) {
            mesh.userData.animator(time + offset);
        } else {
            mesh.rotation.y = time * 0.5 + offset;
        }
        renderer.render(scene, camera);
    });
    
    // Animate preview
    if (previewMesh && previewMesh.userData.animator) {
        previewMesh.userData.animator(time);
    }
    if (previewRenderer && previewScene && previewCamera) {
        previewRenderer.render(previewScene, previewCamera);
    }
}

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => {
    // Update preview camera
    if (previewCamera && previewRenderer) {
        const container = document.getElementById('previewContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        previewCamera.aspect = width / height;
        previewCamera.updateProjectionMatrix();
        previewRenderer.setSize(width, height);
    }
    
    // Update thumbnails
    thumbnailScenes.forEach(({ camera, renderer }, index) => {
        const container = document.getElementById(`thumb-${characters[index].id}`);
        if (container) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    });
});

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', (e) => {
    const currentIndex = characters.findIndex(c => c.id === selectedCharacter.id);
    let newIndex = currentIndex;
    
    switch (e.key) {
        case 'ArrowRight':
            newIndex = (currentIndex + 1) % characters.length;
            break;
        case 'ArrowLeft':
            newIndex = (currentIndex - 1 + characters.length) % characters.length;
            break;
        case 'ArrowDown':
            newIndex = (currentIndex + 3) % characters.length;
            break;
        case 'ArrowUp':
            newIndex = (currentIndex - 3 + characters.length) % characters.length;
            break;
        case 'Enter':
            document.getElementById('recruitBtn').click();
            return;
    }
    
    if (newIndex !== currentIndex) {
        selectCharacter(characters[newIndex].id);
    }
});

// ===== WEBSOCKET INTEGRATION =====
let wsConnected = false;

function initWebSocket() {
    // Connect to WebSocket server
    molthubWS.connect()
        .on('connected', () => {
            console.log('[App] WebSocket connected');
            wsConnected = true;
            updateConnectionStatus();
        })
        .on('authenticated', (data) => {
            console.log('[App] Authenticated as:', data.username);
            // Register agent when character is selected
            if (selectedCharacter) {
                molthubWS.registerAgent(selectedCharacter);
            }
        })
        .on('agentRegistered', (data) => {
            console.log('[App] Agent registered:', data);
            showNotification(`Welcome, ${selectedCharacter.name}! Connected to Molthub.`);
        })
        .on('agentJoined', (data) => {
            console.log('[App] Agent joined:', data.displayName);
            showNotification(`${data.displayName} joined the hub!`);
        })
        .on('agentLeft', (data) => {
            console.log('[App] Agent left:', data.displayName);
        })
        .on('agentMoved', (data) => {
            // Would update 3D world positions
            console.log('[App] Agent moved:', data.agentId, data.position);
        })
        .on('speechShown', (data) => {
            console.log('[App] Speech bubble:', data.displayName, data.message);
            showSpeechBubble(data.agentId, data.message, data.duration);
        })
        .on('agentWaved', (data) => {
            console.log('[App] Agent waved:', data.displayName);
            showNotification(`${data.displayName} waves at you!`);
        })
        .on('disconnected', (data) => {
            console.log('[App] WebSocket disconnected:', data.reason);
            wsConnected = false;
            updateConnectionStatus();
        })
        .on('error', (error) => {
            console.error('[App] WebSocket error:', error);
        });
}

function updateConnectionStatus() {
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
        statusDot.className = wsConnected ? 'status-dot online' : 'status-dot offline';
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(255, 51, 51, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showSpeechBubble(agentId, message, duration) {
    // Would render speech bubble in 3D world
    console.log(`[Speech] Agent ${agentId}: ${message}`);
}

// Add recruitment button handler with WebSocket
function handleRecruit() {
    if (!selectedCharacter) return;
    
    if (wsConnected) {
        // Register agent with WebSocket
        molthubWS.registerAgent(selectedCharacter);
        
        // Show speech bubble
        molthubWS.showSpeechBubble(`I am ${selectedCharacter.name}, ready to serve!`, 5000);
    } else {
        // Offline mode - just show alert
        alert(`Recruited ${selectedCharacter.name}!`);
    }
}

// Update recruit button handler
document.addEventListener('DOMContentLoaded', () => {
    const recruitBtn = document.getElementById('recruitBtn');
    if (recruitBtn) {
        recruitBtn.removeEventListener('click', null);
        recruitBtn.addEventListener('click', handleRecruit);
    }
    
    // Initialize WebSocket connection
    initWebSocket();
});

// CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    .status-dot.offline {
        background-color: #ff4444;
    }
`;
document.head.appendChild(style);

// ===== SETTINGS API INTEGRATION =====
const API_BASE_URL = '';

// Settings State
let settingsState = {
    agents: [],
    selectedAgentId: null,
    logs: [],
    lastLogTimestamp: null,
    liveLogsInterval: null
};

// API Client
const api = {
    async getAgents() {
        const response = await fetch(`${API_BASE_URL}/api/agents`);
        return response.json();
    },
    
    async getAgentConfig(agentId) {
        const response = await fetch(`${API_BASE_URL}/api/config/${agentId}`);
        return response.json();
    },
    
    async saveAgentConfig(agentId, config) {
        const response = await fetch(`${API_BASE_URL}/api/config/${agentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return response.json();
    },
    
    async getLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_BASE_URL}/api/logs?${params}`);
        return response.json();
    },
    
    async getLiveLogs(limit = 50) {
        const response = await fetch(`${API_BASE_URL}/api/logs/live?limit=${limit}`);
        return response.json();
    },
    
    async getLogsSince(timestamp) {
        const response = await fetch(`${API_BASE_URL}/api/logs/live?since=${timestamp}`);
        return response.json();
    },
    
    async clearOldLogs(days = 7) {
        const response = await fetch(`${API_BASE_URL}/api/logs?days=${days}`, {
            method: 'DELETE'
        });
        return response.json();
    }
};

// Initialize Settings Panel
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // Load agents into settings sidebar
    loadSettingsAgents();
    
    // SSH Form Handler
    const sshForm = document.getElementById('sshForm');
    if (sshForm) {
        sshForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSSHConfig();
        });
    }
    
    // Gateway Form Handler
    const gatewayForm = document.getElementById('gatewayForm');
    if (gatewayForm) {
        gatewayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveGatewayConfig();
        });
    }
    
    // Test Connection Buttons
    const testSSHBtn = document.getElementById('testSSHBtn');
    if (testSSHBtn) {
        testSSHBtn.addEventListener('click', testSSHConnection);
    }
    
    const testGatewayBtn = document.getElementById('testGatewayBtn');
    if (testGatewayBtn) {
        testGatewayBtn.addEventListener('click', testGatewayConnection);
    }
    
    // Logs Controls
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', () => {
            settingsState.lastLogTimestamp = null;
            loadLogs();
        });
    }
    
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearOldLogs);
    }
    
    const liveLogsToggle = document.getElementById('liveLogs');
    if (liveLogsToggle) {
        liveLogsToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                startLiveLogs();
            } else {
                stopLiveLogs();
            }
        });
    }
    
    const logLevelFilter = document.getElementById('logLevelFilter');
    if (logLevelFilter) {
        logLevelFilter.addEventListener('change', () => {
            settingsState.lastLogTimestamp = null;
            loadLogs();
        });
    }
    
    // Start live logs if enabled
    startLiveLogs();
}

async function loadSettingsAgents() {
    try {
        const response = await api.getAgents();
        if (response.success) {
            settingsState.agents = response.agents;
            renderSettingsAgentList();
            
            // Select first agent by default
            if (settingsState.agents.length > 0 && !settingsState.selectedAgentId) {
                selectSettingsAgent(settingsState.agents[0].id);
            }
        }
    } catch (error) {
        console.error('Failed to load agents:', error);
    }
}

function renderSettingsAgentList() {
    const container = document.getElementById('settingsAgentList');
    if (!container) return;
    
    container.innerHTML = settingsState.agents.map(agent => `
        <div class="settings-agent-item ${agent.id === settingsState.selectedAgentId ? 'selected' : ''}" 
             data-agent-id="${agent.id}">
            <div class="agent-status ${agent.status}"></div>
            <span class="agent-name">${agent.name}</span>
        </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.settings-agent-item').forEach(item => {
        item.addEventListener('click', () => {
            selectSettingsAgent(item.dataset.agentId);
        });
    });
}

async function selectSettingsAgent(agentId) {
    settingsState.selectedAgentId = agentId;
    
    // Update UI selection
    document.querySelectorAll('.settings-agent-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.agentId === agentId);
    });
    
    // Load agent config
    try {
        const response = await api.getAgentConfig(agentId);
        if (response.success && response.config) {
            populateConfigForm(response.config);
        } else {
            clearConfigForm();
        }
    } catch (error) {
        console.error('Failed to load agent config:', error);
        clearConfigForm();
    }
}

function populateConfigForm(config) {
    // SSH fields
    const sshHost = document.getElementById('sshHost');
    const sshPort = document.getElementById('sshPort');
    const sshUsername = document.getElementById('sshUsername');
    const sshKeyPath = document.getElementById('sshKeyPath');
    
    if (sshHost) sshHost.value = config.ssh_host || '';
    if (sshPort) sshPort.value = config.ssh_port || 22;
    if (sshUsername) sshUsername.value = config.ssh_username || '';
    if (sshKeyPath) sshKeyPath.value = config.ssh_key_path || '';
    
    // Gateway fields
    const gatewayUrl = document.getElementById('gatewayUrl');
    const gatewayToken = document.getElementById('gatewayToken');
    const autoConnect = document.getElementById('autoConnect');
    
    if (gatewayUrl) gatewayUrl.value = config.gateway_url || '';
    if (gatewayToken) gatewayToken.value = '';
    if (autoConnect) autoConnect.checked = config.auto_connect === 1;
}

function clearConfigForm() {
    const fields = ['sshHost', 'sshUsername', 'sshKeyPath', 'gatewayUrl', 'gatewayToken'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const sshPort = document.getElementById('sshPort');
    if (sshPort) sshPort.value = 22;
    
    const autoConnect = document.getElementById('autoConnect');
    if (autoConnect) autoConnect.checked = false;
}

async function saveSSHConfig() {
    const agentId = settingsState.selectedAgentId;
    if (!agentId) {
        alert('Please select an agent first');
        return;
    }
    
    const config = {
        ssh_host: document.getElementById('sshHost')?.value || null,
        ssh_port: parseInt(document.getElementById('sshPort')?.value) || 22,
        ssh_username: document.getElementById('sshUsername')?.value || null,
        ssh_key_path: document.getElementById('sshKeyPath')?.value || null
    };
    
    try {
        const response = await api.saveAgentConfig(agentId, config);
        if (response.success) {
            showNotification('SSH configuration saved successfully', 'success');
        } else {
            showNotification(response.error || 'Failed to save SSH config', 'error');
        }
    } catch (error) {
        console.error('Failed to save SSH config:', error);
        showNotification('Failed to save SSH configuration', 'error');
    }
}

async function saveGatewayConfig() {
    const agentId = settingsState.selectedAgentId;
    if (!agentId) {
        alert('Please select an agent first');
        return;
    }
    
    const tokenValue = document.getElementById('gatewayToken')?.value;
    const config = {
        gateway_url: document.getElementById('gatewayUrl')?.value || null,
        auto_connect: document.getElementById('autoConnect')?.checked || false
    };
    
    // Only include token if it was entered (not empty)
    if (tokenValue && tokenValue.trim()) {
        config.gateway_token = tokenValue;
    }
    
    try {
        const response = await api.saveAgentConfig(agentId, config);
        if (response.success) {
            showNotification('Gateway configuration saved successfully', 'success');
            // Clear token field after save
            const tokenField = document.getElementById('gatewayToken');
            if (tokenField) tokenField.value = '';
        } else {
            showNotification(response.error || 'Failed to save gateway config', 'error');
        }
    } catch (error) {
        console.error('Failed to save gateway config:', error);
        showNotification('Failed to save gateway configuration', 'error');
    }
}

async function testSSHConnection() {
    const host = document.getElementById('sshHost')?.value;
    if (!host) {
        showNotification('Please enter an SSH host to test', 'warning');
        return;
    }
    
    showNotification('Testing SSH connection... (feature coming soon)', 'info');
}

async function testGatewayConnection() {
    const url = document.getElementById('gatewayUrl')?.value;
    if (!url) {
        showNotification('Please enter a gateway URL to test', 'warning');
        return;
    }
    
    try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            showNotification('Gateway connection successful!', 'success');
            ws.close();
        };
        
        ws.onerror = () => {
            showNotification('Gateway connection failed', 'error');
        };
        
        ws.onclose = (e) => {
            if (!e.wasClean) {
                showNotification('Gateway connection closed unexpectedly', 'warning');
            }
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.close();
                showNotification('Gateway connection timeout', 'error');
            }
        }, 5000);
    } catch (error) {
        showNotification('Invalid gateway URL', 'error');
    }
}

// Logs Management
async function loadLogs() {
    try {
        const level = document.getElementById('logLevelFilter')?.value || '';
        const agentId = settingsState.selectedAgentId;
        
        const filters = { limit: 100 };
        if (level) filters.level = level;
        if (agentId) filters.agentId = agentId;
        
        const response = await api.getLogs(filters);
        if (response.success) {
            settingsState.logs = response.logs;
            if (response.logs.length > 0) {
                settingsState.lastLogTimestamp = response.logs[0].timestamp;
            }
            renderLogs();
        }
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

async function pollNewLogs() {
    if (!settingsState.lastLogTimestamp) {
        await loadLogs();
        return;
    }
    
    try {
        const response = await api.getLogsSince(settingsState.lastLogTimestamp);
        if (response.success && response.logs.length > 0) {
            // Prepend new logs
            settingsState.logs = [...response.logs, ...settingsState.logs].slice(0, 200);
            settingsState.lastLogTimestamp = response.logs[response.logs.length - 1].timestamp;
            renderLogs();
        }
    } catch (error) {
        console.error('Failed to poll logs:', error);
    }
}

function renderLogs() {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    
    if (settingsState.logs.length === 0) {
        container.innerHTML = '<div class="logs-empty">No logs available. Start the gateway to see activity.</div>';
        return;
    }
    
    const levelColors = {
        error: '#ff4444',
        warn: '#ffaa00',
        info: '#00aaff',
        debug: '#888888'
    };
    
    container.innerHTML = settingsState.logs.map(log => {
        const date = new Date(log.timestamp * 1000);
        const timeStr = date.toLocaleTimeString();
        const agentName = log.agent_name || log.agent_id || 'system';
        
        return `
            <div class="log-entry ${log.level}">
                <span class="log-time">${timeStr}</span>
                <span class="log-level" style="color: ${levelColors[log.level] || '#fff'}">${log.level.toUpperCase()}</span>
                <span class="log-agent">${agentName}</span>
                <span class="log-message">${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
    
    // Auto-scroll to bottom if live logs enabled
    const liveToggle = document.getElementById('liveLogs');
    if (liveToggle?.checked) {
        container.scrollTop = container.scrollHeight;
    }
}

function startLiveLogs() {
    if (settingsState.liveLogsInterval) return;
    
    // Initial load
    loadLogs();
    
    // Poll every 3 seconds
    settingsState.liveLogsInterval = setInterval(pollNewLogs, 3000);
}

function stopLiveLogs() {
    if (settingsState.liveLogsInterval) {
        clearInterval(settingsState.liveLogsInterval);
        settingsState.liveLogsInterval = null;
    }
}

async function clearOldLogs() {
    if (!confirm('Are you sure you want to clear logs older than 7 days?')) {
        return;
    }
    
    try {
        const response = await api.clearOldLogs(7);
        if (response.success) {
            showNotification(`Cleared ${response.deletedCount} old log entries`, 'success');
            loadLogs();
        }
    } catch (error) {
        console.error('Failed to clear logs:', error);
        showNotification('Failed to clear old logs', 'error');
    }
}

// Utilities
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Stop live logs when leaving settings section
document.addEventListener('click', (e) => {
    const settingsSection = document.getElementById('settings-section');
    const isSettingsActive = settingsSection?.classList.contains('active');
    
    if (!isSettingsActive && settingsState.liveLogsInterval) {
        stopLiveLogs();
    } else if (isSettingsActive && document.getElementById('liveLogs')?.checked && !settingsState.liveLogsInterval) {
        startLiveLogs();
    }
});
