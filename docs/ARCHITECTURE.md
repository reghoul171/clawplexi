# PM Dashboard Architecture

This document describes the portable architecture of the PM Dashboard, designed to work seamlessly across different machines with full state persistence and synchronization.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [CLI Reference](#cli-reference)
- [Migration Guide](#migration-guide)
- [Development](#development)

---

## Overview

### Purpose

The PM Dashboard provides a real-time visualization of AI agent project states. The portable architecture ensures:

- **State Persistence**: All project data survives server restarts
- **Cross-Machine Portability**: Move between machines without losing context
- **Zero Hardcoded Paths**: All paths configurable via environment or config files
- **OpenClaw Integration**: Seamless integration with the OpenClaw ecosystem

### Key Design Decisions

| Decision                 | Rationale                                                   |
| ------------------------ | ----------------------------------------------------------- |
| **SQLite Database**      | Zero-configuration, single-file, ACID-compliant, portable   |
| **OpenClaw Integration** | Uses `~/.openclaw/` for config and state storage            |
| **No Hardcoded Paths**   | All paths resolved dynamically from config or environment   |
| **Git-Based Sync**       | Leverage existing version control for state synchronization |
| **File Watching**        | Auto-detect `.project_state.json` changes in real-time      |

### Architecture Diagram

#### Layered Architecture (Service Layer Pattern)

The backend follows a clean **Service Layer Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                          HTTP Request                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Routes (API Endpoints)                       │
│              routes/projects.routes.js, etc.                     │
│                  • Define HTTP endpoints                         │
│                  • Route to appropriate controller               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Controllers (HTTP Handlers)                   │
│           controllers/projects.controller.js, etc.               │
│                  • Parse request parameters                      │
│                  • Call service methods                          │
│                  • Format HTTP responses                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Services (Business Logic)                   │
│           services/project.service.js, sync.service.js           │
│                  • Business rules and validation                 │
│                  • Orchestrate multiple repositories             │
│                  • Domain-specific logic                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Repositories (Data Access)                     │
│          repositories/project.repository.js, etc.                │
│                  • Database CRUD operations                      │
│                  • Data mapping and queries                      │
│                  • Single table/entity access                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                              │
│              lib/database/ (modular) + state.db                  │
│  ┌───────────────┬───────────────┬───────────────┬────────────┐ │
│  │  connection   │    schema     │   repository  │ statistics │ │
│  │  • lifecycle  │  • tables     │  • projects   │ • stats    │ │
│  │  • migrations │  • indexes    │  • tasks      │ • export   │ │
│  │               │               │  • sync       │ • import   │ │
│  └───────────────┴───────────────┴───────────────┴────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PM Dashboard Server                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Express API │◄──►│  Socket.io  │◄──►│   Chokidar Watcher  │ │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘ │
│         │                  │                       │            │
│         └──────────────────┼───────────────────────┘            │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Database Module                       │   │
│  │                    (SQLite)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ~/.openclaw/pm-dashboard/                    │
│                                                                 │
│  config.json        Configuration file                         │
│  state.db           SQLite database (persistent state)         │
│  projects/          JSON exports for Git-friendly sync         │
│  logs/              Server logs and PID file                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ~/.openclaw/shared-project/                  │
│                                                                 │
│  ProjectAlpha/                                                  │
│  └── .project_state.json    # Watched by dashboard              │
│  ProjectBeta/                                                   │
│  └── .project_state.json    # Auto-synced to database           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

### Backend Modules (`backend/lib/`)

The `lib/` directory contains core modules that handle all portable functionality:

#### `paths.js` - Path Resolution

Centralizes all path resolution with support for:

- `~` expansion to home directory
- Environment variable overrides
- Config file values
- Fallback defaults

```javascript
// Default paths (all relative to ~/.openclaw/)
const DEFAULT_PATHS = {
  projectsDir: '~/.openclaw/shared-project',
  stateFile: '~/.openclaw/pm-dashboard/state.db',
  logsDir: '~/.openclaw/pm-dashboard/logs',
  configFile: '~/.openclaw/pm-dashboard/config.json',
  projectsStateDir: '~/.openclaw/pm-dashboard/projects'
};

// Path resolution precedence: env var > config > default
function getPaths(config) { ... }
```

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `resolvePath(p)` | Expand `~` and resolve relative paths |
| `getPaths(config)` | Get all resolved paths with overrides |
| `ensureDirectories(paths)` | Create required directories |
| `getOpenClawHome()` | Get `~/.openclaw/` path |
| `isOpenClawEnvironment()` | Detect if running under OpenClaw |

#### `config.js` - Configuration Management

Handles loading, merging, and validating configuration from multiple sources:

```javascript
// Configuration precedence (highest to lowest):
// 1. CLI arguments
// 2. Environment variables
// 3. Config file (~/.openclaw/pm-dashboard/config.json)
// 4. Built-in defaults

const DEFAULT_CONFIG = {
  server: { port: 3001, host: 'localhost' },
  sync: { enabled: true, intervalMs: 30000 },
  // ...
};
```

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `loadConfig(options)` | Load and merge all config sources |
| `saveConfig(config)` | Persist config to file |
| `validateConfig(config)` | Validate config values |
| `getConfig(options)` | Get singleton config instance |
| `getNestedValue(obj, path)` | Access nested config via dot notation |

#### `database/` - SQLite Persistence (Modular)

The database module has been split into a clean modular structure for better maintainability:

```
backend/lib/database/
├── index.js           # Main entry point, re-exports all modules
├── connection.js      # Database lifecycle (init, close, migrations)
├── schema.js          # SQL schema definitions and migrations
├── statistics.js      # Statistics, export, and import operations
├── repository/        # Data access layer (CRUD operations)
│   ├── index.js       # Repository aggregator
│   ├── projects.js    # Project-related operations
│   ├── tasks.js       # Task-related operations
│   └── sync.js        # Sync state operations
└── utils/             # Utility functions
    └── query.js       # Promise wrappers for sqlite3
```

**Module Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    database/index.js                             │
│              (Backward-compatible entry point)                   │
└─────────────────────────────────────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│ connection  │     │     repository/     │     │ statistics  │
│   .js       │     │  projects │ tasks   │     │    .js      │
│             │     │    │ sync           │     │             │
│ • init      │     │                     │     │ • getStats  │
│ • close     │     │ • CRUD operations   │     │ • export    │
│ • getDb     │     │ • Data queries      │     │ • import    │
└─────────────┘     └─────────────────────┘     └─────────────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   utils/query.js    │
                    │                     │
                    │ • runAsync          │
                    │ • getAsync          │
                    │ • allAsync          │
                    │ • execAsync         │
                    └─────────────────────┘
```

**Usage (unchanged - backward compatible):**

```javascript
const db = require('./lib/database');  // or './lib/database/index'

// Initialize database
await db.initDatabase(paths.stateFile);

// CRUD operations
await db.upsertProject(state, projectPath);
await db.getAllProjects();
await db.getProject(name);
await db.deleteProject(name);

// Export/Import
await db.exportToJson();
await db.importFromJson(data, merge);
```

**Module APIs:**

| Module | Functions | Purpose |
|--------|-----------|---------|
| `connection.js` | `initDatabase`, `closeDatabase`, `getDb` | Database lifecycle |
| `repository/projects.js` | `upsertProject`, `getAllProjects`, `getProject`, `deleteProject`, `hardDeleteProject` | Project CRUD |
| `repository/tasks.js` | `createTask`, `updateTask`, `getTask`, `getTasksByProject`, `getPendingTasks`, `cleanupOldTasks` | Task management |
| `repository/sync.js` | `getSyncState`, `updateSyncState` | Sync state tracking |
| `statistics.js` | `getStatistics`, `exportToJson`, `importFromJson` | Stats & migration |
| `utils/query.js` | `runAsync`, `getAsync`, `allAsync`, `execAsync` | Promise-wrapped SQL |

**Backward Compatibility:**

A thin wrapper at `lib/database.js` re-exports from `lib/database/index.js`, ensuring all existing imports continue to work unchanged.

**Detailed API Reference:**

See [DATABASE_MODULE.md](./DATABASE_MODULE.md) for complete API documentation including function signatures, parameters, return types, and usage examples.

#### `sync.js` - Git Synchronization

Provides Git-based state synchronization for cross-machine portability:

```javascript
// GitSync class - manages the state repository
const gitSync = new GitSync({ stateDir, config });
await gitSync.sync(); // Pull, commit, push

// ProjectFileSync class - manages individual JSON files
const fileSync = new ProjectFileSync(projectsDir);
fileSync.saveProject(state); // Write to JSON file
```

**Classes:**
| Class | Purpose |
|-------|---------|
| `GitSync` | Manage Git operations for state sync |
| `ProjectFileSync` | Manage individual project JSON files |

### CLI Tool (`backend/bin/pm-dashboard.js`)

The command-line interface provides all management functions:

```bash
# Show help
pm-dashboard help

# Server management
pm-dashboard start [--port 3001] [--detach]
pm-dashboard stop
pm-dashboard status

# Configuration
pm-dashboard config get server.port
pm-dashboard config set sync.enabled true
pm-dashboard config list

# Migration
pm-dashboard export -o backup.json
pm-dashboard import backup.json [--merge]
pm-dashboard init [--remote <git-url>]
```

---

## Configuration

### Configuration File

**Location:** `~/.openclaw/pm-dashboard/config.json`

```json
{
  "version": "1.0.0",
  "server": {
    "port": 3001,
    "host": "localhost",
    "corsOrigins": ["http://localhost:5173", "http://127.0.0.1:5173"]
  },
  "frontend": {
    "port": 5173,
    "apiUrl": "http://localhost:3001"
  },
  "paths": {
    "projectsDir": "~/.openclaw/shared-project",
    "stateFile": "~/.openclaw/pm-dashboard/state.db",
    "logsDir": "~/.openclaw/pm-dashboard/logs",
    "configFile": "~/.openclaw/pm-dashboard/config.json",
    "projectsStateDir": "~/.openclaw/pm-dashboard/projects"
  },
  "sync": {
    "enabled": true,
    "method": "git",
    "intervalMs": 30000,
    "remote": "origin",
    "branch": "main",
    "autoCommit": true
  },
  "watcher": {
    "ignorePatterns": ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]
  },
  "logging": {
    "level": "info",
    "console": true,
    "file": true
  }
}
```

### Environment Variables

All environment variables use the `PM_DASHBOARD_` prefix:

| Variable                     | Default                                | Description                            |
| ---------------------------- | -------------------------------------- | -------------------------------------- |
| `PM_DASHBOARD_PORT`          | `3001`                                 | Backend server port                    |
| `PM_DASHBOARD_HOST`          | `localhost`                            | Server bind host                       |
| `PM_DASHBOARD_CORS_ORIGINS`  | `localhost:5173`                       | Allowed CORS origins (comma-separated) |
| `PM_DASHBOARD_FRONTEND_PORT` | `5173`                                 | Frontend dev server port               |
| `PM_DASHBOARD_API_URL`       | `http://localhost:3001`                | API URL for frontend                   |
| `PM_DASHBOARD_PROJECTS_DIR`  | `~/.openclaw/shared-project`           | Projects directory                     |
| `PM_DASHBOARD_STATE_FILE`    | `~/.openclaw/pm-dashboard/state.db`    | SQLite database path                   |
| `PM_DASHBOARD_LOGS_DIR`      | `~/.openclaw/pm-dashboard/logs`        | Logs directory                         |
| `PM_DASHBOARD_SYNC_ENABLED`  | `true`                                 | Enable Git sync                        |
| `PM_DASHBOARD_SYNC_INTERVAL` | `30000`                                | Sync interval in milliseconds          |
| `PM_DASHBOARD_LOG_LEVEL`     | `info`                                 | Logging level (debug/info/warn/error)  |
| `PM_DASHBOARD_CONFIG_FILE`   | `~/.openclaw/pm-dashboard/config.json` | Custom config file path                |

### Frontend Environment

The frontend uses Vite's environment variables:

```bash
# .env file in frontend/
VITE_API_URL=http://localhost:3001
```

Accessed in code:

```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### Configuration Precedence

Configuration values are loaded in this order (later overrides earlier):

1. **Built-in defaults** - Hardcoded in `config.js`
2. **OpenClaw detection** - Auto-detected from `~/.openclaw/openclaw.json`
3. **Config file** - `~/.openclaw/pm-dashboard/config.json`
4. **Environment variables** - `PM_DASHBOARD_*` variables
5. **CLI arguments** - `--port`, `--host`, etc.

### Default Values

```javascript
const DEFAULT_CONFIG = {
  version: '1.0.0',
  server: {
    port: 3001,
    host: 'localhost',
    corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  },
  frontend: {
    port: 5173,
    apiUrl: 'http://localhost:3001',
  },
  paths: {
    projectsDir: '~/.openclaw/shared-project',
    stateFile: '~/.openclaw/pm-dashboard/state.db',
    logsDir: '~/.openclaw/pm-dashboard/logs',
    configFile: '~/.openclaw/pm-dashboard/config.json',
    projectsStateDir: '~/.openclaw/pm-dashboard/projects',
  },
  sync: {
    enabled: true,
    method: 'git',
    intervalMs: 30000,
    remote: 'origin',
    branch: 'main',
    autoCommit: true,
  },
  watcher: {
    ignorePatterns: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
    ],
  },
  logging: {
    level: 'info',
    console: true,
    file: true,
  },
};
```

---

## Database Schema

### Location

The SQLite database is stored at:

```
~/.openclaw/pm-dashboard/state.db
```

### Tables

#### `schema_version`

Tracks applied migrations:

```sql
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);
```

#### `projects`

Main table storing project states:

```sql
CREATE TABLE projects (
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
```

| Column                | Type     | Description                |
| --------------------- | -------- | -------------------------- |
| `id`                  | INTEGER  | Auto-increment primary key |
| `name`                | TEXT     | Unique project identifier  |
| `path`                | TEXT     | Path to project directory  |
| `state_json`          | TEXT     | Full state as JSON string  |
| `progress_percentage` | INTEGER  | Progress 0-100             |
| `editor_used`         | TEXT     | Editor badge to display    |
| `last_modified`       | DATETIME | Last update timestamp      |
| `created_at`          | DATETIME | Creation timestamp         |
| `is_active`           | BOOLEAN  | Soft delete flag           |

#### `implementation_steps`

Normalized implementation plan steps:

```sql
CREATE TABLE implementation_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  step_number TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT CHECK(status IN ('done', 'in_progress', 'pending')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### `decision_tree`

Architecture and technical decisions:

```sql
CREATE TABLE decision_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  node_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  chosen TEXT NOT NULL,
  reason TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### `test_results`

Generated test status:

```sql
CREATE TABLE test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT CHECK(status IN ('passing', 'failing')),
  file_path TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### `sync_state`

Git synchronization metadata:

```sql
CREATE TABLE sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at DATETIME,
  last_commit_hash TEXT,
  sync_status TEXT DEFAULT 'idle',
  sync_error TEXT
);
```

### Indexes

Performance indexes are created automatically:

```sql
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_active ON projects(is_active);
CREATE INDEX idx_steps_project ON implementation_steps(project_id);
CREATE INDEX idx_steps_status ON implementation_steps(status);
CREATE INDEX idx_decisions_project ON decision_tree(project_id);
CREATE INDEX idx_tests_project ON test_results(project_id);
CREATE INDEX idx_tests_status ON test_results(status);
```

---

## CLI Reference

### Global Commands

```bash
pm-dashboard <command> [options]
```

### `start` - Start the Server

```bash
pm-dashboard start [options]

Options:
  --port <port>          Server port (default: 3001)
  --host <host>          Server host (default: localhost)
  --no-sync              Disable Git sync
  --detach, -d           Run in background
```

**Examples:**

```bash
# Start on default port
pm-dashboard start

# Start on custom port in background
pm-dashboard start --port 8080 --detach

# Start without sync
pm-dashboard start --no-sync
```

### `stop` - Stop the Server

```bash
pm-dashboard stop
```

Stops a background server started with `--detach`.

### `status` - Show Dashboard Status

```bash
pm-dashboard status
```

Displays:

- Configuration file location
- Server status (running/stopped)
- Path configurations
- Sync status
- OpenClaw environment detection
- Validation status

### `config` - Manage Configuration

```bash
pm-dashboard config <action> [args]

Actions:
  get <key>              Get a config value (dot notation)
  set <key> <value>      Set a config value
  list                   Show all configuration
  path                   Show config file path
  reset                  Reset to default configuration
```

**Examples:**

```bash
# Get server port
pm-dashboard config get server.port

# Set sync enabled
pm-dashboard config set sync.enabled true

# Set nested value
pm-dashboard config set paths.projectsDir ~/my-projects

# View all config
pm-dashboard config list

# Get config file location
pm-dashboard config path
```

### `export` - Export Dashboard State

```bash
pm-dashboard export [options]

Options:
  --output, -o <file>    Output file (default: pm-dashboard-export.json)
  --format <format>      Export format: json (default: json)
```

**Examples:**

```bash
# Export to default file
pm-dashboard export

# Export to custom file
pm-dashboard export -o backup-$(date +%Y%m%d).json
```

**Export Format:**

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-03-26T18:00:00Z",
  "projects": [
    {
      "name": "ProjectAlpha",
      "path": "/path/to/project",
      "state": { ... },
      "created_at": "...",
      "last_modified": "..."
    }
  ],
  "syncState": { ... }
}
```

### `import` - Import Dashboard State

```bash
pm-dashboard import <file> [options]

Options:
  --merge                Merge with existing data (default: replace)
  --validate             Validate import file without importing
```

**Examples:**

```bash
# Replace existing data with import
pm-dashboard import backup.json

# Merge with existing projects
pm-dashboard import backup.json --merge

# Validate before importing
pm-dashboard import backup.json --validate
```

### `init` - Initialize Dashboard

```bash
pm-dashboard init [options]

Options:
  --remote <url>         Git remote URL for sync
  --openclaw             Initialize as OpenClaw skill
```

**Examples:**

```bash
# Basic initialization
pm-dashboard init

# Initialize with Git sync
pm-dashboard init --remote git@github.com:user/pm-dashboard-state.git
```

### `migrate` - Migration Utilities

```bash
pm-dashboard migrate <action>

Actions:
  check                  Check migration requirements
  clone <url>            Clone existing state from remote
```

**Examples:**

```bash
# Check if ready for migration
pm-dashboard migrate check

# Clone state from remote
pm-dashboard migrate clone git@github.com:user/pm-dashboard-state.git
```

### `help` - Show Usage

```bash
pm-dashboard help
pm-dashboard --help
pm-dashboard -h
```

---

## Migration Guide

### Overview

Migration between machines involves transferring:

1. **Database state** (`state.db`) - Project data and sync metadata
2. **Configuration** (`config.json`) - User preferences
3. **Project references** - Paths to project directories

### Method 1: Git Sync (Recommended)

Best for ongoing synchronization between machines.

#### On Source Machine

```bash
# 1. Initialize Git sync if not already done
pm-dashboard init --remote git@github.com:yourname/pm-dashboard-state.git

# 2. Trigger manual sync (or wait for auto-sync)
pm-dashboard sync

# Or push directly
cd ~/.openclaw/pm-dashboard
git add .
git commit -m "Dashboard state: $(date -Iseconds)"
git push origin main
```

#### On Target Machine

```bash
# 1. Clone the state repository
pm-dashboard migrate clone git@github.com:yourname/pm-dashboard-state.git

# 2. Start the dashboard
pm-dashboard start

# 3. Verify
pm-dashboard status
```

### Method 2: Export/Import

Best for one-time migration or backup/restore.

#### On Source Machine

```bash
# 1. Export current state
pm-dashboard export -o dashboard-export.json

# 2. Transfer the file to target machine
scp dashboard-export.json target-machine:~/
```

#### On Target Machine

```bash
# 1. Initialize fresh dashboard
pm-dashboard init

# 2. Import the exported state
pm-dashboard import ~/dashboard-export.json

# 3. Start the dashboard
pm-dashboard start
```

### What Gets Transferred

| Component                 | Git Sync      | Export/Import |
| ------------------------- | ------------- | ------------- |
| Project states (database) | ✅            | ✅            |
| Configuration             | ✅            | ✅            |
| Sync metadata             | ✅            | ✅            |
| Project files             | ❌ (separate) | ❌ (separate) |

**Note:** The actual project files (code, `.project_state.json`) are not transferred. These should be managed separately (e.g., via your project's own Git repository).

### Post-Migration Checklist

After migrating, verify:

```bash
# Check server status
pm-dashboard status

# Verify projects are loaded
curl http://localhost:3001/api/projects

# Check sync is working (if using Git)
curl http://localhost:3001/api/sync/status

# Verify paths are correct
pm-dashboard config get paths.projectsDir
```

### Troubleshooting

#### Projects Not Appearing

```bash
# Check if projects directory is correct
pm-dashboard config get paths.projectsDir

# Verify project files exist
ls ~/.openclaw/shared-project/*/.project_state.json

# Check for errors in logs
cat ~/.openclaw/pm-dashboard/logs/error.log
```

#### Database Locked

```bash
# Stop any running instances
pm-dashboard stop

# Check for stale processes
lsof ~/.openclaw/pm-dashboard/state.db

# Kill if necessary
kill -9 <PID>
```

#### Sync Conflicts

```bash
# Check sync status
pm-dashboard status

# Manual resolution
cd ~/.openclaw/pm-dashboard
git status
git mergetool

# After resolution
git add .
git commit -m "Resolved conflicts"
pm-dashboard start
```

---

## Development

### Running Locally

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Start in development mode (with auto-reload)
npm run dev

# Or use CLI
npm run cli start

# Run specific command
npm run cli status
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
openclaw-pm-dashboard/
├── backend/
│   ├── server.js              # Entry point (initialization, shutdown)
│   ├── app.js                 # Express application factory
│   ├── routes/                # API route definitions
│   │   ├── index.js           # Route aggregator
│   │   ├── projects.routes.js # Project endpoints
│   │   ├── sync.routes.js     # Sync endpoints
│   │   └── tasks.routes.js    # Task endpoints
│   ├── controllers/           # HTTP request handlers
│   │   ├── index.js           # Controller aggregator
│   │   ├── projects.controller.js
│   │   ├── sync.controller.js
│   │   └── tasks.controller.js
│   ├── services/              # Business logic layer
│   │   ├── index.js           # Service aggregator
│   │   ├── project.service.js
│   │   ├── sync.service.js
│   │   ├── task.service.js
│   │   ├── fileWatcher.service.js
│   │   └── tester.service.js
│   ├── repositories/          # Data access layer
│   │   ├── index.js           # Repository aggregator
│   │   ├── project.repository.js
│   │   ├── sync.repository.js
│   │   └── task.repository.js
│   ├── middleware/            # Express middleware
│   │   ├── index.js           # Middleware aggregator
│   │   ├── error.middleware.js
│   │   ├── cors.middleware.js
│   │   └── logging.middleware.js
│   ├── websocket/             # Socket.io handlers
│   │   ├── index.js           # WebSocket setup
│   │   └── handlers/          # Event handlers
│   ├── lib/                   # Core libraries
│   │   ├── config.js          # Configuration management
│   │   ├── database.js        # Backward-compatible wrapper
│   │   ├── database/          # Modular SQLite persistence
│   │   │   ├── index.js       # Main entry point
│   │   │   ├── connection.js  # DB lifecycle & migrations
│   │   │   ├── schema.js      # SQL schema definitions
│   │   │   ├── statistics.js  # Stats, export, import
│   │   │   ├── repository/    # Data access layer
│   │   │   │   ├── projects.js
│   │   │   │   ├── tasks.js
│   │   │   │   └── sync.js
│   │   │   └── utils/         # Query utilities
│   │   │       └── query.js
│   │   ├── paths.js           # Path resolution
│   │   └── sync.js            # Git synchronization
│   ├── bin/
│   │   └── pm-dashboard.js    # CLI entry point
│   ├── __tests__/             # Test suites
│   │   ├── unit/              # Unit tests
│   │   └── integration/       # Integration tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── config/
│   │   │   └── api.js         # API configuration
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md        # This document
│   ├── PORTABLE_ARCHITECTURE.md
│   └── IMPLEMENTATION_GUIDE.md
└── README.md
```

### Architecture Layers

#### Routes Layer (`backend/routes/`)

Routes define the API endpoints and delegate to controllers:

```javascript
// routes/projects.routes.js
const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');

router.get('/', projectsController.getAll);
router.get('/:name', projectsController.getByName);
router.patch('/:name/steps/:stepNumber/status', projectsController.updateStepStatus);

module.exports = router;
```

#### Controllers Layer (`backend/controllers/`)

Controllers handle HTTP requests and responses:

```javascript
// controllers/projects.controller.js
const projectService = require('../services/project.service');

async function getAll(req, res, next) {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    next(error);
  }
}

async function updateStepStatus(req, res, next) {
  try {
    const { name, stepNumber } = req.params;
    const { status } = req.body;
    const result = await projectService.updateStepStatus(name, stepNumber, status);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
```

#### Services Layer (`backend/services/`)

Services contain business logic and orchestrate repositories:

```javascript
// services/project.service.js
const projectRepository = require('../repositories/project.repository');
const { validateStatus } = require('../utils/validation');

class ProjectService {
  async updateStepStatus(projectName, stepNumber, status) {
    // Business validation
    validateStatus(status);
    
    // Delegate to repository
    return projectRepository.updateStepStatus(projectName, stepNumber, status);
  }
}
```

#### Repositories Layer (`backend/repositories/`)

Repositories handle database operations:

```javascript
// repositories/project.repository.js
const db = require('../lib/database');

class ProjectRepository {
  async getAll() {
    return db.getAllProjects();
  }

  async updateStepStatus(projectName, stepNumber, status) {
    // Direct database operations
    return db.updateStepStatus(projectName, stepNumber, status);
  }
}
```

#### Middleware Layer (`backend/middleware/`)

Middleware handles cross-cutting concerns:

- **error.middleware.js** - Global error handler
- **cors.middleware.js** - CORS origin validation
- **logging.middleware.js** - Request logging

### Adding New Features

#### 1. Adding a New API Endpoint

With the new layered architecture, adding endpoints follows a clear pattern:

**Step 1: Create the Route** (`backend/routes/example.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const exampleController = require('../controllers/example.controller');

router.get('/', exampleController.getAll);
router.post('/', exampleController.create);

module.exports = router;
```

**Step 2: Create the Controller** (`backend/controllers/example.controller.js`)

```javascript
const exampleService = require('../services/example.service');

async function getAll(req, res, next) {
  try {
    const items = await exampleService.getAll();
    res.json(items);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await exampleService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAll, create };
```

**Step 3: Create the Service** (`backend/services/example.service.js`)

```javascript
const exampleRepository = require('../repositories/example.repository');

class ExampleService {
  async getAll() {
    return exampleRepository.findAll();
  }

  async create(data) {
    // Business validation
    if (!data.name) throw new Error('Name is required');
    return exampleRepository.create(data);
  }
}

module.exports = new ExampleService();
```

**Step 4: Create the Repository** (`backend/repositories/example.repository.js`)

```javascript
const db = require('../lib/database');

class ExampleRepository {
  async findAll() {
    return db.getAll('examples');
  }

  async create(data) {
    return db.insert('examples', data);
  }
}

module.exports = new ExampleRepository();
```

**Step 5: Register the Route** (`backend/routes/index.js`)

```javascript
const exampleRoutes = require('./example.routes');

module.exports = (app) => {
  app.use('/api/examples', exampleRoutes);
};
```

#### 2. Adding a New Database Table

Edit `backend/lib/database.js`:

```javascript
// Add to SCHEMA object
const SCHEMA = {
  // ... existing tables
  new_table: `
    CREATE TABLE IF NOT EXISTS new_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `,
};

// Add migration
const MIGRATIONS = [
  // ... existing migrations
  {
    version: 3, // Increment version
    description: 'Add new_table',
    statements: [SCHEMA.new_table],
  },
];
```

#### 3. Adding a New CLI Command

Edit `backend/bin/pm-dashboard.js`:

```javascript
function handleNewCommand(options) {
  // Implementation
}

// Add to command router
switch (command) {
  // ... existing commands
  case 'new-command':
    handleNewCommand(options);
    break;
}
```

#### 4. Adding a New Config Option

Edit `backend/lib/config.js`:

```javascript
const DEFAULT_CONFIG = {
  // ... existing config
  newSection: {
    newOption: 'default-value',
  },
};

// Add environment mapping if needed
const ENV_MAPPINGS = {
  // ... existing mappings
  PM_DASHBOARD_NEW_OPTION: { path: 'newSection.newOption', type: 'string' },
};
```

### Testing

The project uses Vitest as the primary test framework with comprehensive test coverage.

#### Test Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Pyramid                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌─────────┐                                │
│                      │   E2E   │ (Future)                        │
│                      └────┬────┘                                │
│                           │                                      │
│                  ┌────────┴────────┐                            │
│                  │   Integration   │  API tests, DB tests       │
│                  │     Tests       │  (Supertest, real DB)      │
│                  └────────┬────────┘                            │
│                           │                                      │
│         ┌─────────────────┴─────────────────┐                   │
│         │           Unit Tests               │                  │
│         │   Services, Utils, Components      │                  │
│         │   (Vitest, React Testing Library)  │                  │
│         └───────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Test Structure

```
backend/
└── __tests__/
    ├── setup.js              # Global test setup
    ├── fixtures/             # Test data and mocks
    │   └── projects.js       # Sample project fixtures
    ├── helpers/              # Test utilities
    │   └── testDb.js         # In-memory database helper
    ├── unit/                 # Unit tests (fast, isolated)
    │   ├── config.test.js    # Configuration tests
    │   ├── database.test.js  # Database operations tests
    │   ├── middleware.test.js# Middleware tests
    │   ├── projectState.test.js # Project state parsing
    │   ├── services/         # Service layer tests
    │   │   └── project.service.test.js
    │   ├── sync.test.js      # Sync logic tests
    │   ├── controllers.test.js# Controller tests
    │   └── routes.test.js    # Route definition tests
    └── integration/          # Integration tests (slower, real deps)
        └── api.test.js       # Full API integration tests

frontend/
└── src/
    └── __tests__/
        ├── setup.js          # Global test setup (jsdom)
        ├── components/       # React component tests
        │   ├── Sidebar.test.jsx
        │   ├── Overview.test.jsx
        │   ├── ListView.test.jsx
        │   └── BoardView.test.jsx
        ├── hooks/            # Custom hook tests
        │   └── useTesterAgent.test.js
        ├── utils/            # Utility function tests
        │   ├── calculatePhase.test.js
        │   ├── normalizeProject.test.js
        │   └── transformProjects.test.js
        └── config/           # Configuration tests
            └── api.test.js
```

#### Test Configuration

**Backend** (`backend/vitest.config.js`):
- Environment: Node.js
- Timeout: 10 seconds
- Coverage target: 70%
- Setup: `__tests__/setup.js`

**Frontend** (`frontend/vitest.config.js`):
- Environment: jsdom (browser simulation)
- Coverage target: 70%
- Setup: `src/__tests__/setup.js`
- Plugins: @vitejs/plugin-react

#### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run __tests__/unit/database.test.js

# Watch mode for development
npx vitest watch

# Run only unit tests
npx vitest run __tests__/unit/

# Run only integration tests
npx vitest run __tests__/integration/
```

#### Test Statistics (Phase 2)

| Layer      | Tests | Coverage | Target |
| ---------- | ----- | -------- | ------ |
| Backend    | 131   | 44.68%   | 70%    |
| Frontend   | 97    | 24.06%   | 70%    |
| **Total**  | **228** | -      | -      |

#### Writing Tests

**Backend Unit Test Example**:
```javascript
// __tests__/unit/services/project.service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import ProjectService from '../../../services/project.service.js';
import { createTestDb } from '../../helpers/testDb.js';

describe('ProjectService', () => {
  let service, db;

  beforeEach(async () => {
    db = await createTestDb();
    service = new ProjectService(db);
  });

  it('should return all projects', async () => {
    const projects = await service.getAllProjects();
    expect(projects).toBeInstanceOf(Array);
  });
});
```

**Frontend Component Test Example**:
```javascript
// src/__tests__/components/Overview.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Overview from '../../components/Overview';

describe('Overview', () => {
  it('renders project name', () => {
    render(<Overview project={{ project_name: 'TestProject' }} />);
    expect(screen.getByText('TestProject')).toBeInTheDocument();
  });
});
```

#### Manual Testing

```bash
# Run backend directly
cd backend
node server.js

# Test CLI
node bin/pm-dashboard.js status

# Test API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/projects
```

### Debugging

Enable debug logging:

```bash
# Via environment
PM_DASHBOARD_LOG_LEVEL=debug pm-dashboard start

# Via config
pm-dashboard config set logging.level debug
```

Check logs:

```bash
# View logs directory
ls ~/.openclaw/pm-dashboard/logs/

# Watch log file
tail -f ~/.openclaw/pm-dashboard/logs/server.log
```

---

## Related Documentation

- **[README.md](../README.md)** - Quick start and overview
- **[PORTABLE_ARCHITECTURE.md](./PORTABLE_ARCHITECTURE.md)** - Design decisions and detailed architecture
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Implementation walkthrough

---

## Architecture Evolution

### Refactoring History

#### Database Module Split (2026-03-31)

The database module was refactored from a monolithic file into a modular structure:

| Metric | Before | After |
|--------|--------|-------|
| database.js lines | ~400 | Split across 7 modules |
| Architecture | Single file | Modular/Repository pattern |
| Testability | Medium | High (isolated modules) |
| Maintainability | Medium | High (single responsibility) |

**Key Changes:**
1. Split `lib/database.js` into `lib/database/` directory
2. Created `connection.js` for lifecycle management
3. Created `schema.js` for SQL definitions and migrations
4. Created `repository/` subdirectory with dedicated modules:
   - `projects.js` - Project CRUD operations
   - `tasks.js` - Task management operations
   - `sync.js` - Sync state tracking
5. Created `utils/query.js` for promise-wrapped SQL operations
6. Created `statistics.js` for stats and export/import
7. Added backward-compatible wrapper at `lib/database.js`

**Benefits:**
- Single responsibility per module
- Easier to test individual components
- Clear separation of concerns
- Repository pattern for data access
- Backward compatibility maintained

#### Service Layer Refactoring (2026-03-30)

The backend was refactored from a monolithic architecture to a clean layered architecture:

| Metric | Before | After |
|--------|--------|-------|
| server.js lines | 1139 | 97 |
| Architecture | Monolithic | Service Layer |
| Testability | Low | High |
| Separation of Concerns | None | Full |

**Key Changes:**
1. Extracted routes to `routes/` directory
2. Created controllers layer for HTTP handling
3. Implemented service layer for business logic
4. Added repository layer for data access
5. Separated middleware (error, CORS, logging)
6. Modularized WebSocket handlers
7. Created `app.js` as Express application factory

**Benefits:**
- Single responsibility per module
- Easy to test each layer in isolation
- Clear dependency flow (Routes → Controllers → Services → Repositories)
- Simpler to add new features following established patterns

---

_Document Version: 1.2.0_  
_Last Updated: 2026-03-31_
