/**
 * Molthub Dashboard v2 - Documents Page
 * Document management and file organization
 */

// ===== DOCUMENT DATA =====
const documents = [
    {
        id: 1,
        name: 'API Integration Guide',
        type: 'doc',
        icon: '📄',
        agent: 'codex',
        agentName: 'Codex',
        date: 'Feb 10, 2025',
        modified: '2 hours ago',
        status: 'completed',
        folder: 'code'
    },
    {
        id: 2,
        name: 'Story Draft - Chapter 1',
        type: 'text',
        icon: '📝',
        agent: 'claude',
        agentName: 'Claude',
        date: 'Feb 9, 2025',
        modified: 'yesterday',
        status: 'in-progress',
        folder: 'creative'
    },
    {
        id: 3,
        name: 'Spanish Translation',
        type: 'translation',
        icon: '🌐',
        agent: 'gemini',
        agentName: 'Gemini',
        date: 'Feb 7, 2025',
        modified: '3 days ago',
        status: 'completed',
        folder: 'translation'
    },
    {
        id: 4,
        name: 'Refactor Plan.md',
        type: 'markdown',
        icon: '💻',
        agent: 'cursor',
        agentName: 'Cursor',
        date: 'Feb 6, 2025',
        modified: '4 days ago',
        status: 'draft',
        folder: 'code'
    },
    {
        id: 5,
        name: 'Math Problem Solutions',
        type: 'doc',
        icon: '📐',
        agent: 'qwen',
        agentName: 'Qwen',
        date: 'Feb 5, 2025',
        modified: '5 days ago',
        status: 'completed',
        folder: 'code'
    },
    {
        id: 6,
        name: 'Character Concept Art',
        type: 'image',
        icon: '🎨',
        agent: 'claude',
        agentName: 'Claude',
        date: 'Feb 4, 2025',
        modified: '6 days ago',
        status: 'draft',
        folder: 'creative'
    }
];

const folders = [
    { id: 'all', name: 'All Documents', icon: '📁', count: 12 },
    { id: 'code', name: 'Code Snippets', icon: '💻', count: 5 },
    { id: 'creative', name: 'Creative Writing', icon: '✨', count: 3 },
    { id: 'translation', name: 'Translations', icon: '🌐', count: 4 }
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initFolderNavigation();
    initDocumentCards();
    initNewDocumentButton();
});

// ===== FOLDER NAVIGATION =====
function initFolderNavigation() {
    const folderElements = document.querySelectorAll('.folder');
    
    folderElements.forEach(folder => {
        folder.addEventListener('click', () => {
            // Update active state
            folderElements.forEach(f => f.classList.remove('active'));
            folder.classList.add('active');
            
            // Filter documents (placeholder for now)
            console.log('Filter by folder:', folder.textContent);
        });
    });
}

// ===== DOCUMENT CARDS =====
function initDocumentCards() {
    const cards = document.querySelectorAll('.doc-card');
    
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('h4').textContent;
            console.log('Opening document:', title);
            // In a real app, this would open the document editor
            alert(`Opening: ${title}`);
        });
        
        // Add right-click context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, card);
        });
    });
}

function showContextMenu(event, card) {
    // Remove existing context menus
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    
    const title = card.querySelector('h4').textContent;
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: absolute;
        top: ${event.pageY}px;
        left: ${event.pageX}px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 8px 0;
        min-width: 180px;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    `;
    
    menu.innerHTML = `
        <div class="menu-item" data-action="open">📄 Open</div>
        <div class="menu-item" data-action="rename">✏️ Rename</div>
        <div class="menu-item" data-action="duplicate">📋 Duplicate</div>
        <div class="menu-divider"></div>
        <div class="menu-item" data-action="share">🔗 Share</div>
        <div class="menu-item" data-action="download">⬇️ Download</div>
        <div class="menu-divider"></div>
        <div class="menu-item" data-action="delete" style="color: #ff3333;">🗑️ Delete</div>
    `;
    
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        `;
        item.addEventListener('mouseover', () => {
            item.style.background = 'var(--bg-tertiary)';
        });
        item.addEventListener('mouseout', () => {
            item.style.background = 'transparent';
        });
        item.addEventListener('click', () => {
            handleMenuAction(item.dataset.action, title);
            menu.remove();
        });
    });
    
    const divider = menu.querySelector('.menu-divider');
    if (divider) {
        divider.style.cssText = `
            height: 1px;
            background: var(--border-color);
            margin: 8px 0;
        `;
    }
    
    document.body.appendChild(menu);
    
    // Close menu on click elsewhere
    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 10);
}

function handleMenuAction(action, documentName) {
    switch (action) {
        case 'open':
            console.log('Opening:', documentName);
            alert(`Opening: ${documentName}`);
            break;
        case 'rename':
            const newName = prompt(`Rename "${documentName}" to:`);
            if (newName) {
                console.log('Renamed to:', newName);
            }
            break;
        case 'duplicate':
            console.log('Duplicating:', documentName);
            alert(`Duplicated: ${documentName}`);
            break;
        case 'share':
            console.log('Sharing:', documentName);
            alert(`Share link copied for: ${documentName}`);
            break;
        case 'download':
            console.log('Downloading:', documentName);
            alert(`Downloading: ${documentName}`);
            break;
        case 'delete':
            if (confirm(`Are you sure you want to delete "${documentName}"?`)) {
                console.log('Deleted:', documentName);
            }
            break;
    }
}

// ===== NEW DOCUMENT =====
function initNewDocumentButton() {
    const newBtn = document.querySelector('.new-doc-btn');
    
    newBtn.addEventListener('click', () => {
        // Show document type selector
        const options = [
            { icon: '📝', name: 'Text Document', type: 'text' },
            { icon: '💻', name: 'Code File', type: 'code' },
            { icon: '📊', name: 'Spreadsheet', type: 'sheet' },
            { icon: '🌐', name: 'Translation', type: 'translation' },
            { icon: '🎨', name: 'Creative Writing', type: 'creative' }
        ];
        
        const menu = document.createElement('div');
        menu.className = 'new-doc-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 24px;
            z-index: 1000;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
        `;
        
        menu.innerHTML = `
            <h3 style="margin-bottom: 20px; text-align: center;">Create New Document</h3>
            <div class="doc-type-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                ${options.map(opt => `
                    <div class="doc-type-option" data-type="${opt.type}" style="
                        padding: 20px;
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        <div style="font-size: 32px; margin-bottom: 8px;">${opt.icon}</div>
                        <div style="font-size: 14px; font-weight: 500;">${opt.name}</div>
                    </div>
                `).join('')}
            </div>
            <button class="cancel-btn" style="
                width: 100%;
                margin-top: 20px;
                padding: 12px;
                background: transparent;
                border: 1px solid var(--border-color);
                border-radius: 10px;
                color: var(--text-secondary);
                cursor: pointer;
                font-size: 14px;
            ">Cancel</button>
        `;
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(menu);
        
        // Handle clicks
        menu.querySelectorAll('.doc-type-option').forEach(option => {
            option.addEventListener('mouseover', () => {
                option.style.borderColor = 'var(--accent-red)';
                option.style.transform = 'translateY(-2px)';
            });
            option.addEventListener('mouseout', () => {
                option.style.borderColor = 'var(--border-color)';
                option.style.transform = 'translateY(0)';
            });
            option.addEventListener('click', () => {
                const type = option.dataset.type;
                console.log('Creating new:', type);
                overlay.remove();
                menu.remove();
                alert(`Creating new ${type} document...`);
            });
        });
        
        menu.querySelector('.cancel-btn').addEventListener('click', () => {
            overlay.remove();
            menu.remove();
        });
        
        overlay.addEventListener('click', () => {
            overlay.remove();
            menu.remove();
        });
    });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N for new document
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.querySelector('.new-doc-btn').click();
    }
    
    // Ctrl/Cmd + F for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchTerm = prompt('Search documents:');
        if (searchTerm) {
            console.log('Searching for:', searchTerm);
        }
    }
});
