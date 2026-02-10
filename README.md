# Molthub Dashboard v2

A 3D agent hub interface featuring character selection, world exploration, and agent configuration. Built with Three.js, Express, and Socket.IO.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## Features

- 🎮 **3D Character Selection** - Interactive Three.js character viewer with 6 unique agents
- 🌍 **World Explorer** - Manage agent spaces and environments
- 📄 **Document Management** - Organize agent-created content
- ⚙️ **Settings Panel** - Configure appearance, notifications, and agent preferences
- 🔌 **Socket.IO** - Real-time updates and notifications
- 🗄️ **SQLite Database** - Persistent storage for logs and agent data

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or run in development mode with auto-reload
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (Railway format) |
| GET | `/api/info` | API information |
| GET | `/api/characters` | Character data for 3D viewer |
| GET | `/api/worlds` | World/space data |
| GET | `/api/settings` | User settings |
| POST | `/api/settings` | Update settings |
| GET | `/api/agents` | List agents |
| GET | `/api/logs` | System logs |

## Screenshots

- **Recruit** - Character selection with 3D preview
- **World** - Space management and agent environments
- **Documents** - File management interface
- **Settings** - Configuration and preferences

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Three.js
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Database**: SQLite (better-sqlite3)
- **Deployment**: Railway

## Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Railway will automatically:
   - Use `nixpacks.toml` for build configuration
   - Run `npm install`
   - Start the server with `npm start`
3. The `railway.json` config handles health checks and restart policies

### Manual

```bash
# Clone the repository
git clone <repo-url>
cd molthub-dashboard

# Install and start
npm install
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

## Project Structure

```
molthub-dashboard/
├── public/              # Static frontend files
│   ├── index.html      # Main dashboard (Recruit)
│   ├── world.html      # World explorer
│   ├── documents.html  # Document management
│   ├── settings.html   # Configuration panel
│   ├── *.css           # Stylesheets
│   └── *.js            # Client-side JavaScript
├── server/             # Backend
│   ├── app.js          # Express server + Socket.IO
│   ├── db/             # Database layer
│   ├── routes/         # API routes
│   └── middleware/     # Express middleware
├── railway.json        # Railway deployment config
├── nixpacks.toml       # Build configuration
└── package.json        # NPM manifest
```

## Characters

- **Molty** (Ant) - Hub Administrator - Red
- **Codex** (Warrior) - Code Assistant - Silver
- **Claude** (Mage) - Creative Assistant - Brown/Gold
- **Gemini** (Mystic) - Dual Core AI - Purple/Gold
- **Qwen** (Ninja) - Fast Reasoning - Purple
- **Cursor** (Rogue) - Editor Agent - Black/Green

## License

MIT

## Credits

Built with ❤️ using Three.js, Express, and Socket.IO
