# Database.js Split - Execution Plan

**Created:** 2026-03-31
**Author:** Planner Agent
**Status:** Ready for Implementation
**Design Reference:** DATABASE_SPLIT_DESIGN.md

---

## Executive Summary

Split the monolithic `backend/lib/database.js` (463 lines) into a modular directory structure while maintaining 100% backward compatibility. The existing repository layer (`backend/repositories/`) will continue to work unchanged.

---

## Prerequisites

- [ ] All existing tests passing
- [ ] No active development on database.js
- [ ] Git working tree clean
- [ ] Create feature branch: `feature/database-split`

---

## Phase 1: Foundation Setup (30 minutes)

### Task 1.1: Create Directory Structure
**Time Estimate:** 5 minutes
**Dependencies:** None

```bash
mkdir -p backend/lib/database/repository
mkdir -p backend/lib/database/utils
```

**Acceptance Criteria:**
- [ ] Directory structure matches design spec
- [ ] No errors from directory creation

---

### Task 1.2: Extract Query Utilities
**File:** `backend/lib/database/utils/query.js`
**Time Estimate:** 15 minutes
**Dependencies:** Task 1.1

**Implementation:**
```javascript
'use strict';

/**
 * Promise wrappers for sqlite3 operations
 * These functions require a db instance from connection module
 */

let _getDb = null;

/**
 * Set the database getter function
 * Called by connection module during initialization
 */
function setDbGetter(getDbFn) {
  _getDb = getDbFn;
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = _getDb();
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = _getDb();
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = _getDb();
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function execAsync(sql) {
  return new Promise((resolve, reject) => {
    const db = _getDb();
    db.exec(sql, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  setDbGetter,
  runAsync,
  getAsync,
  allAsync,
  execAsync,
};
```

**Acceptance Criteria:**
- [ ] All four promise wrappers exported
- [ ] `setDbGetter` function available for connection module
- [ ] No direct db reference (uses getter pattern)

---

### Task 1.3: Extract Schema Definitions
**File:** `backend/lib/database/schema.js`
**Time Estimate:** 10 minutes
**Dependencies:** Task 1.1

**Implementation:**
```javascript
'use strict';

/**
 * SQL schema definitions for PM Dashboard
 */

const SCHEMA = {
  schema_version: `
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `,
  // ... [copy all SCHEMA definitions from database.js]
};

const INDEXES = [
  // ... [copy all INDEXES from database.js]
];

const MIGRATIONS = [
  // ... [copy all MIGRATIONS from database.js]
];

module.exports = {
  SCHEMA,
  INDEXES,
  MIGRATIONS,
};
```

**Acceptance Criteria:**
- [ ] All table schemas included
- [ ] All indexes included
- [ ] All migrations included
- [ ] Exact copy from original (no modifications)

---

## Phase 2: Core Modules (45 minutes)

### Task 2.1: Extract Connection Module
**File:** `backend/lib/database/connection.js`
**Time Estimate:** 20 minutes
**Dependencies:** Task 1.2, Task 1.3

**Implementation:**
```javascript
'use strict';

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { runAsync, getAsync, execAsync } = require('./utils/query');
const { MIGRATIONS } = require('./schema');

let db = null;
let dbPath = null;

/**
 * Initialize the database
 */
async function initDatabase(databasePath) {
  dbPath = databasePath;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async err => {
      if (err) {
        console.error('[Database] Failed to open database:', err.message);
        reject(err);
        return;
      }

      console.log(`[Database] Opened database at ${dbPath}`);

      // Enable foreign keys
      await runAsync('PRAGMA foreign_keys = ON');

      // Run migrations
      try {
        await runMigrations();
        console.log('[Database] Migrations complete');
        resolve();
      } catch (migrationErr) {
        console.error('[Database] Migration failed:', migrationErr);
        reject(migrationErr);
      }
    });
  });
}

async function runMigrations() {
  const row = await getAsync(
    'SELECT COALESCE(MAX(version), 0) as version FROM schema_version'
  ).catch(() => ({ version: 0 }));
  const currentVersion = row?.version || 0;

  console.log(`[Database] Current schema version: ${currentVersion}`);

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`[Database] Running migration ${migration.version}: ${migration.description}`);
      for (const statement of migration.statements) {
        await execAsync(statement);
      }
      await runAsync('INSERT INTO schema_version (version, description) VALUES (?, ?)', [
        migration.version,
        migration.description,
      ]);
    }
  }
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close(err => {
        if (err) reject(err);
        else {
          console.log('[Database] Connection closed');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function getDbPath() {
  return dbPath;
}

module.exports = {
  initDatabase,
  closeDatabase,
  getDb,
  getDbPath,
};
```

**Acceptance Criteria:**
- [ ] `initDatabase()` creates/opens SQLite database
- [ ] `closeDatabase()` properly closes connection
- [ ] `getDb()` returns db instance or throws
- [ ] Migrations run on init
- [ ] Foreign keys enabled

---

### Task 2.2: Extract Projects Repository
**File:** `backend/lib/database/repository/projects.js`
**Time Estimate:** 15 minutes
**Dependencies:** Task 1.2

**Implementation:**
Copy project-related functions from database.js:
- `upsertProject()`
- `insertRelatedData()` (internal)
- `getAllProjects()`
- `getProject()`
- `deleteProject()`
- `hardDeleteProject()`

**Acceptance Criteria:**
- [ ] All project CRUD functions exported
- [ ] Uses query utils for database operations
- [ ] Same function signatures as original

---

### Task 2.3: Extract Tasks Repository
**File:** `backend/lib/database/repository/tasks.js`
**Time Estimate:** 10 minutes
**Dependencies:** Task 1.2

**Implementation:**
Copy task-related functions from database.js:
- `createTask()`
- `updateTask()`
- `getTask()`
- `getTasksByProject()`
- `getPendingTasks()`
- `getRecentCompletedTasks()`
- `cleanupOldTasks()`

**Acceptance Criteria:**
- [ ] All task functions exported
- [ ] Uses query utils for database operations

---

### Task 2.4: Extract Sync Repository
**File:** `backend/lib/database/repository/sync.js`
**Time Estimate:** 5 minutes
**Dependencies:** Task 1.2

**Implementation:**
Copy sync-related functions:
- `getSyncState()`
- `updateSyncState()`

**Acceptance Criteria:**
- [ ] Both sync functions exported
- [ ] Uses query utils for database operations

---

## Phase 3: Statistics & Index (30 minutes)

### Task 3.1: Extract Statistics Module
**File:** `backend/lib/database/statistics.js`
**Time Estimate:** 10 minutes
**Dependencies:** Task 1.2

**Implementation:**
Copy statistics and export/import functions:
- `getStatistics()`
- `exportToJson()`
- `importFromJson()`

**Acceptance Criteria:**
- [ ] All three functions exported
- [ ] Uses query utils for database operations

---

### Task 3.2: Create Repository Index
**File:** `backend/lib/database/repository/index.js`
**Time Estimate:** 5 minutes
**Dependencies:** Task 2.2, Task 2.3, Task 2.4

**Implementation:**
```javascript
'use strict';

const projects = require('./projects');
const tasks = require('./tasks');
const sync = require('./sync');

module.exports = {
  ...projects,
  ...tasks,
  ...sync,
};
```

**Acceptance Criteria:**
- [ ] Re-exports all repository functions

---

### Task 3.3: Create Main Index (Backward Compatibility)
**File:** `backend/lib/database/index.js`
**Time Estimate:** 15 minutes
**Dependencies:** All Phase 2 and 3 tasks

**Implementation:**
```javascript
'use strict';

const connection = require('./connection');
const projects = require('./repository/projects');
const tasks = require('./repository/tasks');
const sync = require('./repository/sync');
const { getStatistics, exportToJson, importFromJson } = require('./statistics');
const query = require('./utils/query');

// Re-export everything for backward compatibility
module.exports = {
  // Lifecycle
  initDatabase: connection.initDatabase,
  closeDatabase: connection.closeDatabase,
  getDb: connection.getDb,

  // Projects
  upsertProject: projects.upsertProject,
  getAllProjects: projects.getAllProjects,
  getProject: projects.getProject,
  deleteProject: projects.deleteProject,
  hardDeleteProject: projects.hardDeleteProject,

  // Tasks
  createTask: tasks.createTask,
  updateTask: tasks.updateTask,
  getTask: tasks.getTask,
  getTasksByProject: tasks.getTasksByProject,
  getPendingTasks: tasks.getPendingTasks,
  getRecentCompletedTasks: tasks.getRecentCompletedTasks,
  cleanupOldTasks: tasks.cleanupOldTasks,

  // Sync
  getSyncState: sync.getSyncState,
  updateSyncState: sync.updateSyncState,

  // Statistics
  getStatistics,
  exportToJson,
  importFromJson,

  // Raw queries
  runAsync: query.runAsync,
  getAsync: query.getAsync,
  allAsync: query.allAsync,
  execAsync: query.execAsync,
};
```

**Acceptance Criteria:**
- [ ] All 20 exports match original database.js
- [ ] Export names match exactly

---

## Phase 4: Integration & Testing (45 minutes)

### Task 4.1: Create Wrapper for Backward Compatibility
**File:** `backend/lib/database.js` (modified)
**Time Estimate:** 5 minutes
**Dependencies:** Task 3.3

**Implementation:**
Replace entire file with:
```javascript
'use strict';

/**
 * Database Module - Backward Compatible Entry Point
 * 
 * This file re-exports from the modularized database/ directory.
 * All original imports continue to work unchanged.
 */

module.exports = require('./database/index');
```

**Acceptance Criteria:**
- [ ] Single line re-export
- [ ] All existing imports continue to work

---

### Task 4.2: Run Existing Tests
**Time Estimate:** 15 minutes
**Dependencies:** Task 4.1

**Commands:**
```bash
cd backend
npm test -- --run database.test.js
```

**Acceptance Criteria:**
- [ ] All existing tests pass
- [ ] No test modifications needed

---

### Task 4.3: Add Module-Specific Tests
**File:** `backend/__tests__/unit/database-modules.test.js`
**Time Estimate:** 20 minutes
**Dependencies:** Task 4.2

**Test Coverage:**
1. Connection module initialization
2. Each repository module isolation
3. Query utils error handling
4. Schema migration verification

**Acceptance Criteria:**
- [ ] Tests for each new module
- [ ] Tests pass

---

### Task 4.4: Verify Integration
**Time Estimate:** 5 minutes
**Dependencies:** Task 4.3

**Commands:**
```bash
# Start the server
cd backend
npm start

# In another terminal, test API endpoints
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/statistics
```

**Acceptance Criteria:**
- [ ] Server starts without errors
- [ ] API endpoints work correctly
- [ ] No deprecation warnings

---

## Phase 5: Cleanup & Documentation (30 minutes)

### Task 5.1: Update JSDoc Comments
**Time Estimate:** 15 minutes
**Dependencies:** Phase 4 complete

**Actions:**
- Add JSDoc to each module
- Document the new module structure
- Add @module tags

**Acceptance Criteria:**
- [ ] All public functions documented
- [ ] Module structure documented

---

### Task 5.2: Update README/Documentation
**Time Estimate:** 10 minutes
**Dependencies:** Task 5.1

**Actions:**
- Document new import patterns
- Add migration guide for future developers
- Update architecture diagram

**Acceptance Criteria:**
- [ ] README updated
- [ ] Architecture docs updated

---

### Task 5.3: Remove Dead Code
**Time Estimate:** 5 minutes
**Dependencies:** All tests passing

**Actions:**
- Verify no unused functions
- Check for circular dependencies
- Run linter

**Acceptance Criteria:**
- [ ] No linting errors
- [ ] No circular dependency warnings

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)
If any issues arise during implementation:

```bash
# Discard all changes
git checkout -- backend/lib/database.js
git checkout -- backend/lib/database/
rm -rf backend/lib/database/

# Or revert the entire branch
git checkout main
git branch -D feature/database-split
```

### Partial Rollback
If only some modules have issues:
1. Keep working modules
2. Revert problematic file to original
3. Update index.js to skip broken module

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing imports | Wrapper file guarantees compatibility |
| Circular dependencies | Connection has no deps on repos |
| Lost db instance | Singleton pattern in connection.js |
| Test failures | Run tests after each phase |
| Schema drift | Schema.js is exact copy, no changes |

---

## Summary

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Foundation | 3 tasks | 30 min |
| Phase 2: Core Modules | 4 tasks | 45 min |
| Phase 3: Statistics & Index | 3 tasks | 30 min |
| Phase 4: Integration & Testing | 4 tasks | 45 min |
| Phase 5: Cleanup & Docs | 3 tasks | 30 min |
| **Total** | **17 tasks** | **3 hours** |

---

## Implementation Order Summary

```
1. utils/query.js      (no deps)
2. schema.js           (no deps)
3. connection.js       (deps: query, schema)
4. repository/projects.js  (deps: query)
5. repository/tasks.js     (deps: query)
6. repository/sync.js      (deps: query)
7. statistics.js       (deps: query)
8. repository/index.js (deps: projects, tasks, sync)
9. index.js            (deps: all above)
10. database.js wrapper (deps: index)
```

---

## Sign-Off

**Ready for Developer Agent:** Yes
**Requires Code Review After:** Each phase
**Final Approval Required From:** Manager

---

**Next Step:** Developer agent to execute Phase 1, Task 1.1
