# Portable & Migratable AI Project Manager Architecture

## Executive Summary

This document outlines the architecture for making the AI Project Manager dashboard portable across machines with seamless migration and state synchronization capabilities.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Recommended Architecture](#2-recommended-architecture)
3. [Configuration Management](#3-configuration-management)
4. [Data Persistence Strategy](#4-data-persistence-strategy)
5. [Migration Strategy](#5-migration-strategy)
6. [Deployment Strategy](#6-deployment-strategy)
7. [State Synchronization](#7-state-synchronization)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [OpenClaw Integration Points](#9-openclaw-integration-points)

---

## 1. Current State Analysis

### Existing Architecture

```
openclaw-pm-dashboard/
├── backend/
│   └── server.js          # Express + Socket.io + chokidar
├── frontend/
│   └── src/               # React + Vite + Tailwind
├── mock_workspace/        # Sample project data
│   └── <project>/.project_state.json
├── docker-compose.yml
└── .env                   # Local configuration
```

### Current Pain Points

| Issue | Impact | Severity |
|-------|--------|----------|
| Hardcoded paths in `.env` | Not portable | High |
| In-memory state (Map) | Lost on restart | Critical |
| No state persistence | No migration support | Critical |
| No sync mechanism | Multi-machine conflicts | Medium |
| Manual deployment | Setup friction | Medium |

### Key Constraints

1. **No external database dependency** - Keep it lightweight
2. **Git-friendly** - Project state should be version-controllable
3. **OpenClaw-native** - Leverage existing infrastructure
4. **Zero-config migration** - Move between machines seamlessly

---

## 2. Recommended Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPENCLAW ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  OpenClaw       │    │  PM Dashboard   │                    │
│  │  Gateway        │◄──►│  (as Plugin)    │                    │
│  │  :18789         │    │                 │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ~/.openclaw/pm-dashboard/                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │   │
│  │  │ config.json │  │  state.db   │  │ projects/       │ │   │
│  │  │             │  │  (SQLite)   │  │  └── *.json     │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ▲                                  │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ~/.openclaw/shared-project/                │   │
│  │         (Git-synced shared workspace)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Configuration in `~/.openclaw/`** - Follow OpenClaw conventions
2. **SQLite for persistence** - Lightweight, file-based, portable
3. **Git for sync** - Leverage existing version control
4. **Plugin architecture** - Integrate as OpenClaw skill

---

## 3. Configuration Management

### 3.1 Configuration Hierarchy

Configuration is loaded in this order (later overrides earlier):

```
1. Built-in defaults
2. ~/.openclaw/pm-dashboard/config.json     # User-level config
3. Environment variables (PM_DASHBOARD_*)   # Runtime overrides
4. Command-line arguments                   # One-time overrides
```

### 3.2 Configuration File Structure

**Location:** `~/.openclaw/pm-dashboard/config.json`

```json
{
  "version": "1.0.0",
  "server": {
    "port": 3001,
    "host": "localhost",
    "corsOrigins": ["http://localhost:5173"]
  },
  "frontend": {
    "port": 5173,
    "apiUrl": "http://localhost:3001"
  },
  "paths": {
    "projectsDir": "~/.openclaw/shared-project",
    "stateFile": "~/.openclaw/pm-dashboard/state.db",
    "logsDir": "~/.openclaw/pm-dashboard/logs"
  },
  "sync": {
    "enabled": true,
    "method": "git",
    "intervalMs": 30000,
    "remote": "origin",
    "branch": "main"
  },
  "watcher": {
    "ignorePatterns": [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**"
    ]
  }
}
```

### 3.3 Environment Variables

All environment variables use the `PM_DASHBOARD_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `PM_DASHBOARD_PORT` | 3001 | Backend server port |
| `PM_DASHBOARD_HOST` | localhost | Server bind host |
| `PM_DASHBOARD_PROJECTS_DIR` | `~/.openclaw/shared-project` | Projects directory |
| `PM_DASHBOARD_STATE_FILE` | `~/.openclaw/pm-dashboard/state.db` | SQLite database path |
| `PM_DASHBOARD_SYNC_ENABLED` | true | Enable Git sync |
| `PM_DASHBOARD_SYNC_INTERVAL` | 30000 | Sync interval in ms |
| `PM_DASHBOARD_CONFIG_FILE` | `~/.openclaw/pm-dashboard/config.json` | Custom config path |

### 3.4 Path Resolution

All paths are resolved using a centralized path resolver:

```javascript
// lib/paths.js
const os = require('os');
const path = require('path');

const DEFAULT_CONFIG = {
  projectsDir: '~/.openclaw/shared-project',
  stateFile: '~/.openclaw/pm-dashboard/state.db',
  logsDir: '~/.openclaw/pm-dashboard/logs',
  configFile: '~/.openclaw/pm-dashboard/config.json'
};

function resolvePath(p) {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (path.isAbsolute(p)) {
    return p;
  }
  return path.resolve(process.cwd(), p);
}

function getPaths(config = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  return {
    projectsDir: resolvePath(merged.projectsDir),
    stateFile: resolvePath(merged.stateFile),
    logsDir: resolvePath(merged.logsDir),
    configFile: resolvePath(merged.configFile)
  };
}

module.exports = { resolvePath, getPaths, DEFAULT_CONFIG };
```

---

## 4. Data Persistence Strategy

### 4.1 SQLite Database Schema

**Why SQLite?**
- Zero configuration
- Single file = easy migration
- ACID compliant
- No external dependencies
- Works everywhere Node.js runs

**Database Location:** `~/.openclaw/pm-dashboard/state.db`

```sql
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project states (persisted from .project_state.json files)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  path TEXT NOT NULL,
  state_json TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  editor_used TEXT,
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Implementation steps (normalized for querying)
CREATE TABLE IF NOT EXISTS implementation_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  step_number TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT CHECK(status IN ('done', 'in_progress', 'pending')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Decision tree entries
CREATE TABLE IF NOT EXISTS decision_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  node_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  chosen TEXT NOT NULL,
  reason TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Test results
CREATE TABLE IF NOT EXISTS test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT CHECK(status IN ('passing', 'failing')),
  file_path TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at DATETIME,
  last_commit_hash TEXT,
  sync_status TEXT DEFAULT 'idle'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_steps_project ON implementation_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decision_tree(project_id);
CREATE INDEX IF NOT EXISTS idx_tests_project ON test_results(project_id);
```

### 4.2 Database Module

```javascript
// lib/database.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { resolvePath } = require('./paths');

let db = null;

async function initDatabase(config = {}) {
  const dbPath = resolvePath(config.stateFile || '~/.openclaw/pm-dashboard/state.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  await runMigrations(db);
  return db;
}

async function runMigrations(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  const version = await db.get('SELECT COALESCE(MAX(version), 0) as v FROM schema_version');
  
  // Migration 1: Initial schema
  if (version.v < 1) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        path TEXT NOT NULL,
        state_json TEXT NOT NULL,
        progress_percentage INTEGER DEFAULT 0,
        editor_used TEXT,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
      
      INSERT INTO schema_version (version) VALUES (1);
    `);
  }
  
  // Add more migrations as needed...
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDatabase, getDb };
```

---

## 5. Migration Strategy

### 5.1 Migration Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Machine A  │     │   Git Repo   │     │   Machine B  │
│              │     │   (Remote)   │     │              │
│  ┌────────┐  │     │              │     │  ┌────────┐  │
│  │ state  │──┼────►│    Push      │────►│  │ Clone  │  │
│  │ .db    │  │     │              │     │  │ Pull   │  │
│  └────────┘  │     │              │     │  └────────┘  │
│              │     │              │     │              │
│  ~/.openclaw │     │   pm-dash-   │     │  ~/.openclaw │
│  /pm-dash/   │     │   state.git  │     │  /pm-dash/   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 5.2 Migration Methods

#### Method 1: Git-Based State Sync (Recommended)

**State Repository Structure:**
```
pm-dashboard-state/
├── config.json              # Dashboard configuration
├── state.db                 # SQLite database
├── projects/
│   ├── ProjectAlpha.json    # Individual project states
│   └── ProjectBeta.json
└── .sync-metadata.json      # Sync timestamps
```

**Migration Steps:**

1. **On Source Machine:**
```bash
# Initialize state repository
cd ~/.openclaw/pm-dashboard
git init
git remote add origin <your-git-repo>

# Add state files
git add state.db config.json projects/
git commit -m "Dashboard state: $(date -Iseconds)"
git push origin main
```

2. **On Target Machine:**
```bash
# Clone state
mkdir -p ~/.openclaw/pm-dashboard
cd ~/.openclaw/pm-dashboard
git clone <your-git-repo> .

# Dashboard auto-detects existing state on startup
```

#### Method 2: Export/Import Bundle

**Export Command:**
```bash
pm-dashboard export --output dashboard-bundle.tar.gz
```

**Bundle Contents:**
```
dashboard-bundle.tar.gz
├── manifest.json           # Bundle metadata
├── state.db               # Database snapshot
├── config.json            # Configuration
└── projects/              # Project state files
```

**Import Command:**
```bash
pm-dashboard import --input dashboard-bundle.tar.gz
```

### 5.3 State File Format

For Git-friendliness, project states are also stored as individual JSON files:

```json
// ~/.openclaw/pm-dashboard/projects/ProjectAlpha.json
{
  "project_name": "ProjectAlpha",
  "editor_used": "VS Code",
  "progress_percentage": 65,
  "implementation_plan": [...],
  "decision_tree": [...],
  "tests_generated": [...],
  "_metadata": {
    "last_modified": "2026-03-26T17:30:00Z",
    "version": 1,
    "source_path": "~/.openclaw/shared-project/ProjectAlpha"
  }
}
```

---

## 6. Deployment Strategy

### 6.1 As OpenClaw Skill (Recommended)

**Benefits:**
- Native integration with OpenClaw ecosystem
- Auto-starts with OpenClaw
- Uses OpenClaw's config system
- No separate process management

**Skill Structure:**
```
~/.openclaw/skills/pm-dashboard/
├── SKILL.md              # Skill definition
├── package.json          # Dependencies
├── lib/
│   ├── server.js         # Dashboard server
│   ├── database.js       # SQLite module
│   ├── paths.js          # Path resolution
│   └── sync.js           # Git sync module
├── frontend/             # Built React app
│   └── dist/
├── bin/
│   └── start.js          # Entry point
└── scripts/
    ├── migrate.sh        # Migration helper
    └── export.sh         # Export helper
```

**SKILL.md:**
```markdown
# PM Dashboard Skill

## Trigger
Use this skill when asked to:
- View project status
- Check project progress
- Open the project dashboard
- Monitor AI agent activity

## Commands

### Start Dashboard
```bash
pm-dashboard start [--port 3001]
```

### Check Status
```bash
pm-dashboard status
```

### Export State
```bash
pm-dashboard export --output <file>
```

## Configuration

Configuration is stored in `~/.openclaw/pm-dashboard/config.json`.

See `docs/PORTABLE_ARCHITECTURE.md` for full configuration options.
```

### 6.2 As Standalone npm Package

**Package Structure:**
```
openclaw-pm-dashboard/
├── package.json
├── bin/
│   └── pm-dashboard      # CLI entry point
├── lib/                  # Backend code
├── dist/                 # Built frontend
└── README.md
```

**Installation:**
```bash
npm install -g openclaw-pm-dashboard

# Start the dashboard
pm-dashboard start

# Configure
pm-dashboard config set projectsDir ~/.openclaw/shared-project
```

### 6.3 As Systemd Service (Linux)

**Service File:** `/etc/systemd/system/pm-dashboard.service`

```ini
[Unit]
Description=AI Project Manager Dashboard
After=network.target

[Service]
Type=simple
User=%USER%
WorkingDirectory=%HOME%/.openclaw/pm-dashboard
ExecStart=/usr/bin/node %HOME%/.openclaw/skills/pm-dashboard/bin/start.js
Restart=on-failure
RestartSec=10
Environment=PM_DASHBOARD_CONFIG_FILE=%HOME%/.openclaw/pm-dashboard/config.json

[Install]
WantedBy=multi-user.target
```

**Management:**
```bash
# Install service
pm-dashboard install-service

# Start/stop/restart
systemctl --user start pm-dashboard
systemctl --user stop pm-dashboard
systemctl --user restart pm-dashboard
```

---

## 7. State Synchronization

### 7.1 Git-Based Sync (Primary Method)

**Sync Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│                      SYNC CYCLE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Check for local changes                                  │
│     └─► Modified .project_state.json files?                 │
│                                                              │
│  2. Pull remote changes                                      │
│     └─► git pull origin main                                │
│                                                              │
│  3. Merge conflicts (if any)                                 │
│     └─► Use timestamp-based conflict resolution             │
│                                                              │
│  4. Push local changes                                       │
│     └─► git add . && git commit && git push                 │
│                                                              │
│  5. Update sync metadata                                     │
│     └─► Record last sync timestamp                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Sync Module:**
```javascript
// lib/sync.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitSync {
  constructor(stateDir, config) {
    this.stateDir = stateDir;
    this.config = config;
  }

  async sync() {
    const { remote, branch } = this.config.sync;
    
    try {
      // Check git status
      const status = execSync('git status --porcelain', { cwd: this.stateDir }).toString();
      
      // Pull first
      execSync(`git pull ${remote} ${branch}`, { cwd: this.stateDir });
      
      // If local changes, commit and push
      if (status.trim()) {
        execSync('git add .', { cwd: this.stateDir });
        execSync(`git commit -m "Sync: ${new Date().toISOString()}"`, { cwd: this.stateDir });
        execSync(`git push ${remote} ${branch}`, { cwd: this.stateDir });
      }
      
      return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async initRepo(remoteUrl) {
    if (!fs.existsSync(path.join(this.stateDir, '.git'))) {
      execSync('git init', { cwd: this.stateDir });
      execSync(`git remote add origin ${remoteUrl}`, { cwd: this.stateDir });
    }
  }
}

module.exports = GitSync;
```

### 7.2 Conflict Resolution Strategy

**Timestamp-Based Resolution:**
- Each project state includes `_metadata.last_modified`
- On conflict, keep the newer version
- Log conflicts for manual review

```javascript
function resolveConflict(localState, remoteState) {
  const localTime = new Date(localState._metadata.last_modified);
  const remoteTime = new Date(remoteState._metadata.last_modified);
  
  if (localTime > remoteTime) {
    return { resolved: localState, strategy: 'kept_local' };
  } else {
    return { resolved: remoteState, strategy: 'accepted_remote' };
  }
}
```

### 7.3 Real-Time Sync (Optional - Multi-Machine)

For real-time sync across machines, use OpenClaw's messaging infrastructure:

```javascript
// lib/realtime-sync.js
const { io } = require('socket.io-client');

class RealTimeSync {
  constructor(gatewayUrl, token) {
    this.socket = io(gatewayUrl, {
      auth: { token }
    });
    
    this.socket.on('project_updated', (data) => {
      this.handleRemoteUpdate(data);
    });
  }

  broadcastChange(projectState) {
    this.socket.emit('project_updated', projectState);
  }

  handleRemoteUpdate(data) {
    // Update local database
    // Emit to local clients
  }
}
```

---

## 8. Implementation Roadmap

### Phase 1: Core Persistence (Week 1)

**Goal:** State survives restarts

1. **Create database module** (`lib/database.js`)
   - SQLite setup
   - Schema migrations
   - CRUD operations

2. **Update server.js**
   - Replace in-memory Map with database
   - Load state on startup
   - Persist on changes

3. **Add path resolution** (`lib/paths.js`)
   - Support `~` expansion
   - Environment variable overrides
   - Config file loading

**Files to create:**
```
backend/lib/
├── database.js
├── paths.js
└── config.js
```

**Files to modify:**
```
backend/server.js
backend/package.json (add sqlite dependency)
```

### Phase 2: Configuration System (Week 1-2)

**Goal:** Zero hardcoded paths

1. **Create config module** (`lib/config.js`)
   - Load from `~/.openclaw/pm-dashboard/config.json`
   - Environment variable overrides
   - Default values

2. **Create CLI** (`bin/pm-dashboard.js`)
   - `start` command
   - `config get/set` commands
   - `export/import` commands

3. **Update frontend config**
   - Use environment variables
   - No hardcoded URLs

**Files to create:**
```
bin/pm-dashboard.js
lib/config.js
```

**Files to modify:**
```
frontend/src/config/api.js
```

### Phase 3: Git Sync (Week 2)

**Goal:** Cross-machine synchronization

1. **Create sync module** (`lib/sync.js`)
   - Git operations
   - Conflict resolution
   - Auto-sync interval

2. **Add sync commands to CLI**
   - `pm-dashboard sync`
   - `pm-dashboard init-repo`

3. **Add to server lifecycle**
   - Sync on startup
   - Periodic sync
   - Sync on shutdown

**Files to create:**
```
lib/sync.js
lib/git-operations.js
```

### Phase 4: OpenClaw Skill Integration (Week 2-3)

**Goal:** Native OpenClaw integration

1. **Create skill structure**
   - SKILL.md
   - Integration with OpenClaw gateway

2. **Add to OpenClaw config**
   - Plugin entry in `openclaw.json`

3. **Create documentation**
   - Usage guide
   - Configuration reference

**Files to create:**
```
~/.openclaw/skills/pm-dashboard/SKILL.md
~/.openclaw/skills/pm-dashboard/package.json
```

### Phase 5: Migration Tooling (Week 3)

**Goal:** Seamless machine migration

1. **Export/Import commands**
   - Bundle creation
   - Bundle extraction
   - Validation

2. **Migration documentation**
   - Step-by-step guide
   - Troubleshooting

**Files to create:**
```
lib/migration.js
scripts/migrate.sh
```

---

## 9. OpenClaw Integration Points

### 9.1 Configuration Integration

The dashboard reads from and can write to OpenClaw's config:

```javascript
// OpenClaw config path
const OPENCLAW_CONFIG = path.join(os.homedir(), '.openclaw', 'openclaw.json');

// Read OpenClaw's shared-project path
function getSharedProjectPath() {
  const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));
  // Or use agents.defaults.workspace as base
  return path.join(os.homedir(), '.openclaw', 'shared-project');
}
```

### 9.2 Gateway Integration

The dashboard can communicate with OpenClaw's gateway:

```javascript
// Already implemented in server.js
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

// Spawn tester agent
await fetch(`${OPENCLAW_GATEWAY_URL}/api/spawn`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'tester',
    message: 'Run tests for ProjectAlpha',
    context: { projectName: 'ProjectAlpha' }
  })
});
```

### 9.3 Shared-Project Integration

Projects are stored in the shared-project directory:

```
~/.openclaw/shared-project/
├── ProjectAlpha/
│   └── .project_state.json    # Tracked by dashboard
├── ProjectBeta/
│   └── .project_state.json
└── messages/                   # Agent message queues
```

### 9.4 Agent Integration

Agents can write project state files:

```javascript
// Agent writes progress
const statePath = path.join(projectDir, '.project_state.json');
fs.writeFileSync(statePath, JSON.stringify({
  project_name: 'MyProject',
  progress_percentage: 75,
  implementation_plan: [...],
  // ...
}, null, 2));

// Dashboard auto-detects via chokidar watcher
```

---

## Summary

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite for persistence | Zero-config, single-file, portable |
| Git for sync | Existing tooling, version history, conflict resolution |
| Config in `~/.openclaw/` | Follows OpenClaw conventions |
| Skill-based deployment | Native integration, auto-start |
| File-based project states | Agent-friendly, Git-friendly |

### Migration Checklist

- [ ] Database module created
- [ ] Configuration system implemented
- [ ] Git sync module added
- [ ] CLI tooling complete
- [ ] OpenClaw skill structure created
- [ ] Export/Import commands working
- [ ] Documentation complete

### File Changes Summary

**New Files:**
```
backend/lib/database.js
backend/lib/paths.js
backend/lib/config.js
backend/lib/sync.js
bin/pm-dashboard.js
~/.openclaw/pm-dashboard/config.json
~/.openclaw/pm-dashboard/state.db
```

**Modified Files:**
```
backend/server.js          # Use database instead of Map
backend/package.json       # Add sqlite, commander deps
frontend/src/config/api.js # Use env vars
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-03-26*
