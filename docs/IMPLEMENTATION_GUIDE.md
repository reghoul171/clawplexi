# PM Dashboard - Portable Architecture Implementation Guide

## Quick Start

### 1. Install Dependencies

```bash
cd /home/reghoul/openclaw-pm-dashboard/backend
npm install sqlite3
```

### 2. Update Files

Replace the existing files with the new portable versions:

```bash
# Backup originals
cp backend/server.js backend/server.js.bak
cp backend/package.json backend/package.json.bak

# Apply new versions
mv backend/server.new.js backend/server.js
mv backend/package.new.json backend/package.json
```

### 3. Initialize Dashboard

```bash
# Initialize with default configuration
node backend/bin/pm-dashboard.js init

# Or initialize with Git sync
node backend/bin/pm-dashboard.js init --remote git@github.com:yourname/pm-dashboard-state.git
```

### 4. Start Server

```bash
# Using CLI
node backend/bin/pm-dashboard.js start

# Or directly
node backend/server.js
```

## Configuration

### Config File Location

```
~/.openclaw/pm-dashboard/config.json
```

### Environment Variables

| Variable                    | Description          | Default                                |
| --------------------------- | -------------------- | -------------------------------------- |
| `PM_DASHBOARD_PORT`         | Server port          | 3001                                   |
| `PM_DASHBOARD_HOST`         | Server host          | localhost                              |
| `PM_DASHBOARD_PROJECTS_DIR` | Projects directory   | `~/.openclaw/shared-project`           |
| `PM_DASHBOARD_STATE_FILE`   | SQLite database path | `~/.openclaw/pm-dashboard/state.db`    |
| `PM_DASHBOARD_SYNC_ENABLED` | Enable Git sync      | true                                   |
| `PM_DASHBOARD_CONFIG_FILE`  | Custom config path   | `~/.openclaw/pm-dashboard/config.json` |

### CLI Commands

```bash
# Configuration
pm-dashboard config get server.port
pm-dashboard config set sync.enabled true
pm-dashboard config list

# Server management
pm-dashboard start --port 8080
pm-dashboard stop
pm-dashboard status

# Export/Import
pm-dashboard export -o backup.json
pm-dashboard import backup.json --merge

# Migration
pm-dashboard migrate check
pm-dashboard migrate clone git@github.com:user/pm-state.git
```

## Migration Between Machines

### Method 1: Git Sync (Recommended)

**On Source Machine:**

```bash
# Initialize Git sync
pm-dashboard init --remote git@github.com:yourname/pm-dashboard-state.git

# Push state
pm-dashboard sync
```

**On Target Machine:**

```bash
# Clone existing state
pm-dashboard migrate clone git@github.com:yourname/pm-dashboard-state.git

# Start dashboard
pm-dashboard start
```

### Method 2: Export/Import

**On Source Machine:**

```bash
pm-dashboard export -o dashboard-backup.json
# Transfer file to target machine
```

**On Target Machine:**

```bash
pm-dashboard init
pm-dashboard import dashboard-backup.json
pm-dashboard start
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ~/.openclaw/pm-dashboard/                │
│                                                             │
│  config.json        # Dashboard configuration               │
│  state.db           # SQLite database (persistent state)    │
│  projects/          # JSON exports (Git-friendly)           │
│  logs/              # Server logs                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ~/.openclaw/shared-project/              │
│                                                             │
│  ProjectAlpha/.project_state.json   # Watched by dashboard  │
│  ProjectBeta/.project_state.json    # Auto-synced to DB     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
openclaw-pm-dashboard/
├── backend/
│   ├── bin/
│   │   └── pm-dashboard.js    # CLI tool
│   ├── lib/
│   │   ├── config.js          # Configuration management
│   │   ├── database.js        # SQLite persistence
│   │   ├── paths.js           # Path resolution
│   │   └── sync.js            # Git synchronization
│   ├── server.js              # Main server
│   └── package.json
├── frontend/
│   └── ...
└── docs/
    └── PORTABLE_ARCHITECTURE.md
```

## Key Features

### 1. Persistent State

- SQLite database stores all project states
- Survives server restarts
- No data loss on restart

### 2. Git Synchronization

- Automatic commit/push of state changes
- Pull changes from other machines
- Conflict resolution based on timestamps

### 3. Zero Hardcoded Paths

- All paths resolved from config or environment
- Portable across machines
- Works in any environment

### 4. OpenClaw Integration

- Detects OpenClaw environment automatically
- Uses `~/.openclaw/shared-project` by default
- Integrates with OpenClaw gateway for agent spawning

## Troubleshooting

### Database locked

```bash
# Stop server first
pm-dashboard stop

# Check for stale processes
lsof ~/.openclaw/pm-dashboard/state.db
```

### Sync conflicts

```bash
# Check status
pm-dashboard status

# Manual resolution
cd ~/.openclaw/pm-dashboard
git status
git mergetool
```

### Projects not appearing

```bash
# Check projects directory
pm-dashboard config get paths.projectsDir

# Verify files exist
ls ~/.openclaw/shared-project/*/.project_state.json
```

## Next Steps

1. **Test the implementation:**

   ```bash
   cd /home/reghoul/openclaw-pm-dashboard
   node backend/bin/pm-dashboard.js init
   node backend/bin/pm-dashboard.js start
   ```

2. **Set up Git sync (optional):**

   ```bash
   # Create a private repo for state storage
   # Then initialize with remote
   node backend/bin/pm-dashboard.js init --remote git@github.com:yourname/pm-state.git
   ```

3. **Create OpenClaw skill (optional):**
   - Move to `~/.openclaw/skills/pm-dashboard/`
   - Create SKILL.md
   - Add to OpenClaw configuration
