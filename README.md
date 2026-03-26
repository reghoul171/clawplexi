# AI Project Manager Dashboard

A real-time dashboard for visualizing project states maintained by AI agents. Built with Node.js, Express, Socket.io, React, and Tailwind CSS.

## Quick Links

- [Migration Guide](docs/ARCHITECTURE.md#migration-guide) - How to migrate your data between machines

## Features

- **Real-time Updates**: WebSocket-powered live updates when project states change
- **File Watching**: Automatically detects changes to `.project_state.json` files
- **Decentralized Data**: Each project maintains its own state file
- **Decision Tree Visualization**: Mermaid.js powered decision tree rendering
- **Test Results Dashboard**: Visual overview of generated test results
- **Docker Ready**: Easy deployment with Docker Compose
- **Portable Architecture**: SQLite-based persistence with Git sync for cross-machine migration
- **OpenClaw Integration**: Seamless integration with OpenClaw ecosystem

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the dashboard
open http://localhost:5173
```

### Option 2: Local Development

```bash
# Install dependencies for all packages
npm run install:all

# Start both backend and frontend in development mode
npm run dev

# Or start them separately:
npm run dev:backend   # Backend on port 3001
npm run dev:frontend  # Frontend on port 5173
```

## Configuration

Edit `.env` in the root directory:

```env
WORKSPACE_DIR=./mock_workspace
BACKEND_PORT=3001
FRONTEND_PORT=5173
```

### CLI Tool

The dashboard includes a CLI for management:

```bash
# Start the server
node backend/bin/pm-dashboard.js start

# Check status
node backend/bin/pm-dashboard.js status

# Export state for migration
node backend/bin/pm-dashboard.js export -o backup.json

# Import state
node backend/bin/pm-dashboard.js import backup.json

# Manage configuration
node backend/bin/pm-dashboard.js config list
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full CLI reference.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PM_DASHBOARD_PORT` | 3001 | Server port |
| `PM_DASHBOARD_PROJECTS_DIR` | `~/.openclaw/shared-project` | Projects directory |
| `PM_DASHBOARD_STATE_FILE` | `~/.openclaw/pm-dashboard/state.db` | SQLite database path |
| `PM_DASHBOARD_SYNC_ENABLED` | true | Enable Git sync |

## How It Works

### Architecture

```
openclaw-pm-dashboard/
├── backend/                 # Node.js + Express + Socket.io server
│   ├── server.js           # Main server with chokidar file watcher
│   └── package.json
├── frontend/               # React + Vite + Tailwind dashboard
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx        # Main app with WebSocket integration
│   │   └── main.jsx
│   └── package.json
├── mock_workspace/         # Sample project data
│   └── ProjectAlpha/
│       └── .project_state.json
├── docker-compose.yml
└── .env
```

### File Watching

The backend uses `chokidar` to watch for `.project_state.json` files in the workspace directory. When a file is created, modified, or deleted, the server:

1. Parses and validates the JSON
2. Updates its in-memory state
3. Emits a WebSocket event to all connected clients
4. The frontend updates in real-time

## Project State Schema

OpenClaw (or any AI agent) should write `.project_state.json` files with this schema:

```json
{
  "project_name": "String",
  "editor_used": "String",
  "progress_percentage": "Number (0-100)",
  "implementation_plan": [
    {
      "step": "String",
      "task": "String",
      "status": "done | in_progress | pending"
    }
  ],
  "decision_tree": [
    {
      "node_id": "String",
      "decision": "String",
      "chosen": "String",
      "reason": "String"
    }
  ],
  "tests_generated": [
    {
      "test_name": "String",
      "status": "passing | failing",
      "file": "String"
    }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `project_name` | String | Unique identifier for the project |
| `editor_used` | String | The editor/IDE being used (displayed as a badge) |
| `progress_percentage` | Number | Overall completion percentage (0-100) |
| `implementation_plan` | Array | List of implementation steps with status |
| `decision_tree` | Array | Architecture/tech decisions made during development |
| `tests_generated` | Array | Generated tests and their current status |

## Usage for AI Agents (OpenClaw)

When working on a project, OpenClaw should:

1. **Create** a `.project_state.json` in the project directory
2. **Update** it whenever progress is made
3. **Track** implementation steps as they're completed
4. **Document** key decisions in the decision tree
5. **Record** generated tests and their status

### Example: Creating a Project State

```bash
# Create project directory
mkdir -p mock_workspace/MyProject

# Create state file
cat > mock_workspace/MyProject/.project_state.json << 'EOF'
{
  "project_name": "MyProject",
  "editor_used": "Claude Code",
  "progress_percentage": 0,
  "implementation_plan": [
    {"step": "1", "task": "Initialize project", "status": "in_progress"},
    {"step": "2", "task": "Build features", "status": "pending"}
  ],
  "decision_tree": [],
  "tests_generated": []
}
EOF
```

The dashboard will automatically detect the new project and display it.

### Example: Updating Progress

```bash
# Update the state file as work progresses
# The dashboard will update in real-time
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all tracked projects |
| `/api/projects/:name` | GET | Get a specific project by name |
| `/api/health` | GET | Health check endpoint |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `initial_state` | Server → Client | Sent on connection with all current projects |
| `project_updated` | Server → Client | Emitted when a project file changes |
| `project_removed` | Server → Client | Emitted when a project file is deleted |

## Development

### Adding a New Project

Simply create a new directory under `mock_workspace/` (or your configured workspace) with a `.project_state.json` file. The dashboard will automatically pick it up.

### Testing Real-time Updates

1. Open the dashboard in your browser
2. Edit `mock_workspace/ProjectAlpha/.project_state.json`
3. Save the file - the dashboard updates instantly

## Troubleshooting

### WebSocket Connection Issues

If the dashboard shows "Disconnected":
- Check that the backend is running on port 3001
- Verify CORS settings in `backend/server.js`
- Check browser console for connection errorsdocs/ARCHITECTURE.md

### Projects Not Appearing

- Verify the `WORKSPACE_DIR` in `.env`
- Check that `.project_state.json` files exist in subdirectories
- Validate JSON schema matches the expected format

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Comprehensive documentation of the portable architecture, configuration, database schema, CLI reference, and migration guide
- **[Portable Architecture Design](docs/PORTABLE_ARCHITECTURE.md)** - Design decisions and detailed architecture specification
- **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation walkthrough

## License

MIT
