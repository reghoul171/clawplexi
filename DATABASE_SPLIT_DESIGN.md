# Database.js Split Design

**Created:** 2026-03-31  
**Author:** Architect Agent  
**Status:** Proposed  

---

## 1. Current Structure Analysis

### File: `backend/lib/database.js` (778 lines)

The file is a monolithic SQLite database module with the following sections:

| Section | Lines | Purpose | Dependencies |
|---------|-------|---------|--------------|
| Schema Definitions | 1-90 | Table schemas, indexes, migrations | None |
| Promise Wrappers | 150-200 | `runAsync`, `getAsync`, `allAsync`, `execAsync` | `db` instance |
| Lifecycle | 200-280 | `initDatabase`, `closeDatabase`, `getDb`, `runMigrations` | Promise wrappers |
| Project Operations | 280-430 | CRUD for projects + related data | Promise wrappers |
| Sync State | 430-480 | Git sync state management | Promise wrappers |
| Statistics | 480-540 | Dashboard stats aggregation | Promise wrappers |
| Export/Import | 540-610 | JSON export/import | Project operations |
| Task Operations | 610-778 | Async task tracking | Promise wrappers |

### Problems with Current Structure

1. **Single Responsibility Violation** - One file handles schema, migrations, 4+ domain operations
2. **Testing Difficulty** - Hard to mock individual operations
3. **Poor Discoverability** - 778 lines to scroll through
4. **Coupling** - All operations share the same `db` instance variable
5. **Maintainability** - Adding a new table requires touching core file

---

## 2. Proposed Module Structure

### Directory Layout

```
backend/lib/database/
├── index.js              # Main entry point (re-exports all, backward compatible)
├── connection.js         # Database connection & lifecycle
├── schema.js             # Schema definitions & migrations
├── repository/
│   ├── projects.js       # Project CRUD operations
│   ├── tasks.js          # Task operations
│   ├── sync.js           # Sync state operations
│   └── index.js          # Re-exports all repositories
├── utils/
│   └── query.js          # Promise wrappers for sqlite3
└── statistics.js         # Dashboard statistics
```

### Module Responsibilities

#### `connection.js` (~50 lines)
- Database initialization
- Connection management
- Foreign key enforcement
- Export: `initDatabase()`, `closeDatabase()`, `getDb()`, `db` instance

#### `schema.js` (~120 lines)
- `SCHEMA` object
- `INDEXES` array
- `MIGRATIONS` array
- `runMigrations()` function
- Export: Schema constants, `runMigrations()`

#### `utils/query.js` (~50 lines)
- `runAsync(sql, params)`
- `getAsync(sql, params)`
- `allAsync(sql, params)`
- `execAsync(sql)`
- Requires `db` instance from connection

#### `repository/projects.js` (~150 lines)
- `upsertProject(state, path)`
- `getAllProjects()`
- `getProject(name)`
- `deleteProject(name)`
- `hardDeleteProject(name)`
- `insertRelatedData(projectId, state)` (internal)

#### `repository/tasks.js` (~100 lines)
- `createTask(task)`
- `updateTask(taskId, update)`
- `getTask(taskId)`
- `getTasksByProject(projectName, status)`
- `getPendingTasks()`
- `getRecentCompletedTasks(limit)`
- `cleanupOldTasks(daysOld)`

#### `repository/sync.js` (~40 lines)
- `getSyncState()`
- `updateSyncState(state)`

#### `statistics.js` (~60 lines)
- `getStatistics()`
- Export/Import functions (optional, could stay in index)

#### `index.js` (~80 lines)
- Re-exports all public functions
- Maintains backward compatibility
- Orchestrates initialization

---

## 3. Interface Design

### Connection Module (`connection.js`)

```javascript
let db = null;
let dbPath = null;

async function initDatabase(databasePath) { ... }
function closeDatabase() { ... }
function getDb() { ... }
function getDbPath() { ... }

module.exports = {
  initDatabase,
  closeDatabase,
  getDb,
  getDbPath,
  // Internal use only
  _setDb: (instance) => { db = instance; }
};
```

### Query Utilities (`utils/query.js`)

```javascript
const { getDb } = require('../connection');

function runAsync(sql, params = []) { ... }
function getAsync(sql, params = []) { ... }
function allAsync(sql, params = []) { ... }
function execAsync(sql) { ... }
function transaction(fn) { ... } // Bonus: transaction wrapper

module.exports = {
  runAsync,
  getAsync,
  allAsync,
  execAsync,
  transaction
};
```

### Repository Pattern (`repository/*.js`)

Each repository:
```javascript
const { runAsync, getAsync, allAsync } = require('../utils/query');

// Domain-specific operations
async function getById(id) { ... }
async function getAll() { ... }
async function create(data) { ... }
async function update(id, data) { ... }
async function remove(id) { ... }

module.exports = {
  getById,
  getAll,
  create,
  update,
  remove
};
```

### Main Entry Point (`index.js`)

```javascript
// Re-export for backward compatibility
const connection = require('./connection');
const projects = require('./repository/projects');
const tasks = require('./repository/tasks');
const sync = require('./repository/sync');
const { getStatistics, exportToJson, importFromJson } = require('./statistics');
const query = require('./utils/query');

module.exports = {
  // Lifecycle (from connection)
  initDatabase: connection.initDatabase,
  closeDatabase: connection.closeDatabase,
  getDb: connection.getDb,

  // Projects (from repository)
  upsertProject: projects.upsertProject,
  getAllProjects: projects.getAllProjects,
  getProject: projects.getProject,
  deleteProject: projects.deleteProject,
  hardDeleteProject: projects.hardDeleteProject,

  // Tasks (from repository)
  createTask: tasks.createTask,
  updateTask: tasks.updateTask,
  getTask: tasks.getTask,
  getTasksByProject: tasks.getTasksByProject,
  getPendingTasks: tasks.getPendingTasks,
  getRecentCompletedTasks: tasks.getRecentCompletedTasks,
  cleanupOldTasks: tasks.cleanupOldTasks,

  // Sync (from repository)
  getSyncState: sync.getSyncState,
  updateSyncState: sync.updateSyncState,

  // Statistics
  getStatistics,
  exportToJson,
  importFromJson,

  // Raw queries (for advanced use)
  runAsync: query.runAsync,
  getAsync: query.getAsync,
  allAsync: query.allAsync,
  execAsync: query.execAsync
};
```

---

## 4. Migration Strategy

### Phase 1: Setup (No Breaking Changes)

1. Create `backend/lib/database/` directory
2. Create all module files
3. Create `index.js` with re-exports
4. Verify all exports match current `database.js`

### Phase 2: Switch Import Path

1. Update all `require('../lib/database')` to `require('../lib/database/index')`
2. Or: Keep `lib/database.js` as a thin wrapper:
   ```javascript
   // lib/database.js (backward compatible entry)
   module.exports = require('./database/index');
   ```

### Phase 3: Deprecation & Cleanup

1. Add deprecation warnings for direct `db` access
2. Document new module structure
3. Update tests to use individual modules

### Import Migration Examples

**Before:**
```javascript
const db = require('../lib/database');
await db.initDatabase(dbPath);
await db.upsertProject(state, path);
```

**After (still works):**
```javascript
const db = require('../lib/database');  // Points to database/index.js
await db.initDatabase(dbPath);
await db.upsertProject(state, path);
```

**After (preferred new style):**
```javascript
const { initDatabase } = require('../lib/database/connection');
const { upsertProject } = require('../lib/database/repository/projects');

await initDatabase(dbPath);
await upsertProject(state, path);
```

---

## 5. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Breaking existing imports | High | Medium | Keep `database.js` as re-export wrapper |
| Circular dependencies | Medium | Low | Connection module has no deps; repos depend only on utils |
| Lost `db` instance reference | Medium | Low | Use singleton pattern in connection.js |
| Migration order issues | Low | Low | Migrations stay in schema.js, called by connection.init |
| Test coverage gaps | Medium | Medium | Create tests for each module before split |

### Rollback Plan

If issues arise:
1. Revert all imports to point to original `database.js`
2. Delete `database/` directory
3. No data migration needed (same SQLite file)

---

## 6. Testing Recommendations

Before implementing split:

1. **Create integration tests** for current `database.js`
2. **Document all public API** exports
3. **Add test coverage** for edge cases

After split:

1. **Unit tests** for each repository module
2. **Integration tests** for `index.js` exports
3. **Regression tests** comparing old vs new behavior

---

## 7. Implementation Order

Recommended sequence for Developer:

1. Create `utils/query.js` - Extract promise wrappers
2. Create `connection.js` - Extract lifecycle management
3. Create `schema.js` - Extract schema definitions
4. Create `repository/projects.js` - Extract project operations
5. Create `repository/tasks.js` - Extract task operations
6. Create `repository/sync.js` - Extract sync operations
7. Create `statistics.js` - Extract stats and export/import
8. Create `index.js` - Wire everything together
9. Update imports in consuming files
10. Add tests

---

## 8. Estimated Effort

| Task | Estimated Time |
|------|---------------|
| Create module files | 2-3 hours |
| Write index.js re-exports | 30 min |
| Update imports | 1 hour |
| Testing | 2 hours |
| Documentation | 1 hour |
| **Total** | **6-7 hours** |

---

## 9. Decision Points for Manager/Developer

1. **Keep `lib/database.js` as wrapper?** (Recommended: Yes, for backward compatibility)
2. **Add transaction wrapper?** (Recommended: Yes, useful for future)
3. **Combine sync into projects?** (Recommended: No, separate concerns)
4. **Move export/import to separate utility?** (Recommended: Optional, can stay in statistics.js)

---

## 10. Appendix: Current Exports (for verification)

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

  // Sync
  getSyncState,
  updateSyncState,

  // Stats
  getStatistics,

  // Tasks
  createTask,
  updateTask,
  getTask,
  getTasksByProject,
  getPendingTasks,
  getRecentCompletedTasks,
  cleanupOldTasks,

  // Export/Import
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

**Next Step:** Manager to review and approve design, then delegate implementation to Developer.
