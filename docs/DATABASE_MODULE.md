# Database Module API Reference

This document describes the modular database architecture introduced in Phase 4.

## Overview

The database module was refactored from a single 463-line `database.js` file into a modular structure with clear separation of concerns:

```
backend/lib/database/
├── index.js              # Main entry point (backward compatible)
├── connection.js         # DB lifecycle management
├── schema.js             # Schema definitions & migrations
├── repository/
│   ├── index.js          # Repository re-exports
│   ├── projects.js       # Project CRUD operations
│   ├── tasks.js          # Task operations
│   └── sync.js           # Sync state operations
├── utils/
│   └── query.js          # Promise wrappers for sqlite3
└── statistics.js         # Dashboard statistics & export/import
```

## Module Responsibilities

| Module | Responsibility | Lines |
|--------|----------------|-------|
| `connection.js` | Database lifecycle (init, close, migrations) | 134 |
| `schema.js` | Table definitions, indexes, migrations | 145 |
| `repository/projects.js` | Project CRUD operations | 199 |
| `repository/tasks.js` | Task tracking operations | 141 |
| `repository/sync.js` | Git sync state management | 52 |
| `utils/query.js` | SQLite promise wrappers | 64 |
| `statistics.js` | Dashboard stats, JSON export/import | 101 |

---

## Connection Module

**File:** `backend/lib/database/connection.js`

Manages SQLite database lifecycle, initialization, and migrations.

### Functions

#### `initDatabase(databasePath)`

Initialize the database at the specified path.

```javascript
const { initDatabase } = require('./database/connection');

await initDatabase('~/.openclaw/pm-dashboard/state.db');
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `databasePath` | string | Path to SQLite database file |

**Behavior:**
- Creates parent directories if they don't exist
- Opens or creates the SQLite database
- Enables foreign key constraints
- Runs pending migrations automatically

**Returns:** `Promise<void>`

---

#### `closeDatabase()`

Close the database connection gracefully.

```javascript
const { closeDatabase } = require('./database/connection');

await closeDatabase();
```

**Returns:** `Promise<void>`

---

#### `getDb()`

Get the current database instance.

```javascript
const { getDb } = require('./database/connection');

const db = getDb();
db.run('SELECT * FROM projects');
```

**Returns:** `sqlite3.Database`

**Throws:** Error if database not initialized

---

#### `getDbPath()`

Get the current database file path.

```javascript
const { getDbPath } = require('./database/connection');

const path = getDbPath(); // '/home/user/.openclaw/pm-dashboard/state.db'
```

**Returns:** `string | null`

---

## Schema Module

**File:** `backend/lib/database/schema.js`

Contains SQL schema definitions, indexes, and migration history.

### Exports

#### `SCHEMA`

Object containing `CREATE TABLE` statements for all tables:

```javascript
const { SCHEMA } = require('./database/schema');

// Available tables:
SCHEMA.schema_version   // Migration tracking
SCHEMA.projects         // Project states
SCHEMA.implementation_steps  // Step tracking
SCHEMA.decision_tree    // Architecture decisions
SCHEMA.test_results     // Test status
SCHEMA.sync_state       // Git sync metadata
SCHEMA.tasks           // Async task tracking
```

---

#### `INDEXES`

Array of index creation statements:

```javascript
const { INDEXES } = require('./database/schema');

// Performance indexes:
// - idx_projects_name, idx_projects_active
// - idx_steps_project, idx_steps_status
// - idx_decisions_project
// - idx_tests_project, idx_tests_status
```

---

#### `MIGRATIONS`

Ordered array of migration objects:

```javascript
const { MIGRATIONS } = require('./database/schema');

// Migration structure:
{
  version: 3,
  description: 'Add tasks table for async task tracking',
  statements: [ /* SQL statements */ ]
}
```

**Migration History:**

| Version | Description |
|---------|-------------|
| 1 | Initial schema (projects, steps, decisions, tests, sync_state) |
| 2 | Add performance indexes |
| 3 | Add tasks table for async task tracking |

---

## Query Utils Module

**File:** `backend/lib/database/utils/query.js`

Promise-based wrappers for sqlite3 operations.

### Functions

#### `runAsync(sql, params)`

Execute a SQL statement that modifies data.

```javascript
const { runAsync } = require('./database/utils/query');

const result = await runAsync(
  'INSERT INTO projects (name, path) VALUES (?, ?)',
  ['MyProject', '/path/to/project']
);

console.log(result.id);      // Last inserted ID
console.log(result.changes); // Number of affected rows
```

**Returns:** `Promise<{ id: number, changes: number }>`

---

#### `getAsync(sql, params)`

Execute a SQL query that returns a single row.

```javascript
const { getAsync } = require('./database/utils/query');

const project = await getAsync(
  'SELECT * FROM projects WHERE name = ?',
  ['MyProject']
);

// Returns null if not found
```

**Returns:** `Promise<Object | null>`

---

#### `allAsync(sql, params)`

Execute a SQL query that returns multiple rows.

```javascript
const { allAsync } = require('./database/utils/query');

const projects = await allAsync(
  'SELECT * FROM projects WHERE is_active = ?',
  [true]
);

// Returns empty array if no matches
```

**Returns:** `Promise<Array<Object>>`

---

#### `execAsync(sql)`

Execute raw SQL (for schema operations).

```javascript
const { execAsync } = require('./database/utils/query');

await execAsync('PRAGMA foreign_keys = ON');
```

**Returns:** `Promise<void>`

---

## Projects Repository

**File:** `backend/lib/database/repository/projects.js`

Handles all project-related database operations.

### Functions

#### `upsertProject(state, projectPath)`

Create or update a project.

```javascript
const { upsertProject } = require('./database/repository/projects');

const projectId = await upsertProject(
  {
    project_name: 'MyProject',
    progress_percentage: 50,
    editor_used: 'Claude Code',
    implementation_plan: [...],
    decision_tree: [...],
    tests_generated: [...]
  },
  '/path/to/project'
);
```

**Behavior:**
- Checks if project exists by name
- Updates existing project or inserts new one
- Replaces all related data (steps, decisions, tests)

**Returns:** `Promise<number>` - Project ID

---

#### `getAllProjects()`

Retrieve all active projects.

```javascript
const { getAllProjects } = require('./database/repository/projects');

const projects = await getAllProjects();

// Each project includes _db metadata:
// {
//   project_name: 'MyProject',
//   ...state fields,
//   _db: {
//     id: 1,
//     path: '/path/to/project',
//     last_modified: '2026-03-31T10:00:00Z',
//     created_at: '2026-03-30T10:00:00Z'
//   }
// }
```

**Returns:** `Promise<Array<Object>>`

---

#### `getProject(name)`

Retrieve a single project by name.

```javascript
const { getProject } = require('./database/repository/projects');

const project = await getProject('MyProject');

// Returns null if not found
```

**Returns:** `Promise<Object | null>`

---

#### `deleteProject(name)`

Soft delete a project (sets `is_active = FALSE`).

```javascript
const { deleteProject } = require('./database/repository/projects');

const success = await deleteProject('MyProject');
// Returns true if project was found and deactivated
```

**Returns:** `Promise<boolean>`

---

#### `hardDeleteProject(name)`

Permanently delete a project and all related data.

```javascript
const { hardDeleteProject } = require('./database/repository/projects');

const success = await hardDeleteProject('MyProject');
```

**Returns:** `Promise<boolean>`

---

## Tasks Repository

**File:** `backend/lib/database/repository/tasks.js`

Handles async task tracking operations.

### Functions

#### `createTask(task)`

Create a new async task.

```javascript
const { createTask } = require('./database/repository/tasks');

const taskId = await createTask({
  project_name: 'MyProject',
  type: 'test',
  message: 'Running test suite'
});

// Returns auto-generated or provided ID
```

**Returns:** `Promise<string>` - Task ID

---

#### `updateTask(taskId, update)`

Update task status, progress, or results.

```javascript
const { updateTask } = require('./database/repository/tasks');

await updateTask('task-123', {
  status: 'running',
  progress: 50,
  message: 'Running tests...'
});

await updateTask('task-123', {
  status: 'completed',
  result: { passed: 10, failed: 0 },
  report: 'All tests passed'
});
```

**Valid Statuses:** `pending`, `running`, `completed`, `failed`

---

#### `getTask(taskId)`

Retrieve a task by ID.

```javascript
const { getTask } = require('./database/repository/tasks');

const task = await getTask('task-123');
```

**Returns:** `Promise<Object | null>`

---

#### `getTasksByProject(projectName, status?)`

Get all tasks for a project.

```javascript
const { getTasksByProject } = require('./database/repository/tasks');

const allTasks = await getTasksByProject('MyProject');
const pendingTasks = await getTasksByProject('MyProject', 'pending');
```

**Returns:** `Promise<Array<Object>>` (max 50)

---

#### `getPendingTasks()`

Get all pending or running tasks across all projects.

```javascript
const { getPendingTasks } = require('./database/repository/tasks');

const pending = await getPendingTasks();
```

**Returns:** `Promise<Array<Object>>`

---

#### `getRecentCompletedTasks(limit?)`

Get recently completed tasks.

```javascript
const { getRecentCompletedTasks } = require('./database/repository/tasks');

const recent = await getRecentCompletedTasks(10);
```

**Returns:** `Promise<Array<Object>>`

---

#### `cleanupOldTasks(daysOld?)`

Delete old completed/failed tasks.

```javascript
const { cleanupOldTasks } = require('./database/repository/tasks');

const deleted = await cleanupOldTasks(7); // Delete tasks older than 7 days
console.log(`Cleaned up ${deleted} old tasks`);
```

**Returns:** `Promise<number>` - Number of deleted tasks

---

## Sync Repository

**File:** `backend/lib/database/repository/sync.js`

Manages Git synchronization state.

### Functions

#### `getSyncState()`

Get current sync state.

```javascript
const { getSyncState } = require('./database/repository/sync');

const state = await getSyncState();
// {
//   id: 1,
//   last_sync_at: '2026-03-31T10:00:00Z',
//   last_commit_hash: 'abc123',
//   sync_status: 'idle',
//   sync_error: null
// }
```

**Returns:** `Promise<Object>`

---

#### `updateSyncState(state)`

Update sync state fields.

```javascript
const { updateSyncState } = require('./database/repository/sync');

await updateSyncState({
  last_sync_at: new Date().toISOString(),
  last_commit_hash: 'def456',
  sync_status: 'idle'
});
```

---

## Statistics Module

**File:** `backend/lib/database/statistics.js`

Dashboard statistics and data portability.

### Functions

#### `getStatistics()`

Get dashboard statistics summary.

```javascript
const { getStatistics } = require('./database/statistics');

const stats = await getStatistics();
// {
//   projectCount: 5,
//   averageProgress: 45,
//   steps: { done: 10, in_progress: 5, pending: 8 },
//   tests: { passing: 20, failing: 2 }
// }
```

**Returns:** `Promise<Object>`

---

#### `exportToJson()`

Export all data for migration.

```javascript
const { exportToJson } = require('./database/statistics');

const data = await exportToJson();
// {
//   version: '1.0.0',
//   exportedAt: '2026-03-31T10:00:00Z',
//   projects: [...],
//   syncState: {...}
// }
```

**Returns:** `Promise<Object>`

---

#### `importFromJson(data, merge?)`

Import data from an export.

```javascript
const { importFromJson } = require('./database/statistics');

// Replace all existing data
await importFromJson(exportData, false);

// Merge with existing data
await importFromJson(exportData, true);
```

---

## Main Entry Point

**File:** `backend/lib/database/index.js`

Provides backward-compatible exports for the entire database module.

### Usage

```javascript
// Recommended: Import from main entry point
const db = require('./database');

// Lifecycle
await db.initDatabase(dbPath);
await db.closeDatabase();

// Projects
await db.upsertProject(state, path);
const projects = await db.getAllProjects();
const project = await db.getProject(name);
await db.deleteProject(name);

// Tasks
const taskId = await db.createTask(task);
await db.updateTask(taskId, update);
const task = await db.getTask(taskId);

// Statistics
const stats = await db.getStatistics();
const exported = await db.exportToJson();
await db.importFromJson(data);

// Raw queries
await db.runAsync(sql, params);
const row = await db.getAsync(sql, params);
const rows = await db.allAsync(sql, params);
```

### Complete Export List

```javascript
module.exports = {
  // Lifecycle
  initDatabase,
  closeDatabase,
  getDb,

  // Projects
  upsertProject,
  getAllProjects,
  getProject,
  deleteProject,
  hardDeleteProject,

  // Tasks
  createTask,
  updateTask,
  getTask,
  getTasksByProject,
  getPendingTasks,
  getRecentCompletedTasks,
  cleanupOldTasks,

  // Sync
  getSyncState,
  updateSyncState,

  // Statistics
  getStatistics,
  exportToJson,
  importFromJson,

  // Raw queries
  runAsync,
  getAsync,
  allAsync,
  execAsync,
};
```

---

## Backward Compatibility

The original `backend/lib/database.js` file now acts as a thin wrapper:

```javascript
// backend/lib/database.js (11 lines)
'use strict';

module.exports = require('./database/index');
```

All existing imports continue to work without modification:

```javascript
// This still works!
const db = require('./lib/database');
await db.initDatabase(path);
```

---

## Design Principles

### Module Size

Each module targets under 150 lines:
- ✅ `connection.js` - 134 lines
- ✅ `schema.js` - 145 lines
- ⚠️ `repository/projects.js` - 199 lines (slightly over, but cohesive)
- ✅ `repository/tasks.js` - 141 lines
- ✅ `repository/sync.js` - 52 lines
- ✅ `utils/query.js` - 64 lines
- ✅ `statistics.js` - 101 lines

### Single Responsibility

- **connection.js** - Only DB lifecycle
- **schema.js** - Only SQL definitions
- **repository/*.js** - Only data access for one entity
- **utils/query.js** - Only SQLite wrappers
- **statistics.js** - Only aggregation and portability

### Dependency Flow

```
index.js
    │
    ├── connection.js ────┐
    │                      │
    ├── repository/       │
    │   ├── projects.js ──┼── utils/query.js
    │   ├── tasks.js ─────┤
    │   └── sync.js ──────┘
    │
    └── statistics.js
            │
            └── repository/projects.js, repository/sync.js
```

---

## Testing

All 131 backend tests pass without modification after the refactor.

See [TESTING.md](../TESTING.md) for test details.

---

_Document Version: 1.0.0_  
_Created: 2026-03-31 (Phase 4 Database Split)_
