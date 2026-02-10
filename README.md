# Molthub Dashboard v2

A futuristic Three.js-based dashboard for managing AI agents with a dark theme and red/black gradient aesthetic.

## Features (Phase 1)

- **Three.js Foundation**: Full 3D rendering with multiple character models
- **Character Selection Screen**: 6 unique agent characters
  - Codex - Silver Warrior
  - Claude - Brown Tunic Mage
  - Gemini - Purple/Gold Mystic
  - Qwen - Purple Ninja
  - Cursor - Black Hooded Rogue
  - Molty - Red Ant Administrator
- **Dark UI Theme**: Red/black gradients, soft lighting, futuristic aesthetic
- **Interactive 3D Previews**: Animated character models with unique animations
- **Sidebar Navigation**: Home, Documents, Settings icons
- **Keyboard Navigation**: Arrow keys to navigate characters, Enter to recruit

## File Structure

```
Molthub-Dashboard/
├── public/
│   ├── index.html      # Main HTML structure
│   ├── styles.css      # Dark theme styling
│   └── app.js          # Three.js scene and character logic
└── README.md
```

## Usage

Open `public/index.html` in a browser to view the dashboard.

## Development

- Three.js loaded via CDN
- No build step required
- Pure HTML/CSS/JavaScript

## Character Reference

Based on UI Reference document at:
`/Users/fribaclaw/.openclaw/memory-vault/Projects/Molthub-UI-Reference.md`

## Next Phases

- Phase 2: World exploration view with isometric camera
- Phase 3: Agent settings configuration panel
- Phase 4: Live monitoring and logs tab
- Phase 5: Multi-agent world interaction
