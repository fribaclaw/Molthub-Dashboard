# Molthub Dashboard v2

3D agent hub interface with character selection, world exploration, and agent configuration.

## Features (Based on UI Designs)

### 1. Recruit Agent Screen
- Select from 6 character agents: Codex, Claude, Gemini, Qwen, Cursor, Molty
- Dark UI with red/black geometric gradient
- 3D character previews with selection highlighting

### 2. World Exploration View
- Isometric 3D environment
- Low-poly characters and objects
- Other users' agents visible in real-time
- Grid-based movement and interaction

### 3. Agent Configuration
- Connection settings (SSH, Gateway URL)
- Routing configuration
- Live monitoring dashboard
- Logs and gateway events

### 4. Interactive Objects
- Anvil-shaped connection points
- Click to initiate SSH sessions
- Start work sessions on remote machines
- Speech bubbles and agent communication

## Tech Stack
- **Frontend:** Three.js + vanilla JS
- **Backend:** Node.js + Express
- **Real-time:** Socket.io
- **Database:** SQLite
- **Deployment:** Railway

## Structure
```
/public/          - Frontend assets, 3D models, UI
/server/          - Backend API, WebSocket handlers
/src/             - Source modules, utilities
```

## Getting Started
1. `npm install`
2. `npm run dev` (local)
3. Deploy to Railway for production

## Based On
5 UI reference images describing the dashboard interface, stored in Obsidian vault.
