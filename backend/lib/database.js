/**
 * Database Module
 * 
 * SQLite-based persistence for PM Dashboard state.
 * Handles schema migrations, CRUD operations, and state synchronization.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// We'll use a simple sqlite3 wrapper
let db = null;
let dbPath = null;

/**
 * SQL schema definitions
 */
const SCHEMA = {
  schema_version: `
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `,
  
  projects: `
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
    )
  `,
  
  implementation_steps: `
    CREATE TABLE IF NOT EXISTS implementation_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      step_number TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT CHECK(status IN ('done', 'in_progress', 'pending')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `,
  
  decision_tree: `
    CREATE TABLE IF NOT EXISTS decision_tree (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      node_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      chosen TEXT NOT NULL,
      reason TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `,
  
  test_results: `
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT CHECK(status IN ('passing', 'failing')),
      file_path TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `,
  
  sync_state: `
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_sync_at DATETIME,
      last_commit_hash TEXT,
      sync_status TEXT DEFAULT 'idle',
      sync_error TEXT
    )
  `
};

/**
 * Index definitions
 */
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)',
  'CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_steps_project ON implementation_steps(project_id)',
  'CREATE INDEX IF NOT EXISTS idx_steps_status ON implementation_steps(status)',
  'CREATE INDEX IF NOT EXISTS idx_decisions_project ON decision_tree(project_id)',
  'CREATE INDEX IF NOT EXISTS idx_tests_project ON test_results(project_id)',
  'CREATE INDEX IF NOT EXISTS idx_tests_status ON test_results(status)'
];

/**
 * Migration definitions
 */
const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema',
    statements: [
      SCHEMA.schema_version,
      SCHEMA.projects,
      SCHEMA.implementation_steps,
      SCHEMA.decision_tree,
      SCHEMA.test_results,
      SCHEMA.sync_state,
      'INSERT INTO sync_state (id, sync_status) VALUES (1, \'idle\')'
    ]
  },
  {
    version: 2,
    description: 'Add indexes',
    statements: INDEXES
  }
];

/**
 * Promisified database operations
 */
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function execAsync(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Initialize the database
 * @param {string} databasePath - Path to SQLite database file
 * @returns {Promise<void>}
 */
async function initDatabase(databasePath) {
  dbPath = databasePath;
  
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
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

/**
 * Run pending migrations
 */
async function runMigrations() {
  // Check current version
  const row = await getAsync('SELECT COALESCE(MAX(version), 0) as version FROM schema_version').catch(() => ({ version: 0 }));
  const currentVersion = row?.version || 0;
  
  console.log(`[Database] Current schema version: ${currentVersion}`);
  
  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`[Database] Running migration ${migration.version}: ${migration.description}`);
      
      // Execute each statement separately
      for (const statement of migration.statements) {
        await execAsync(statement);
      }
      
      await runAsync(
        'INSERT INTO schema_version (version, description) VALUES (?, ?)',
        [migration.version, migration.description]
      );
    }
  }
}

/**
 * Close the database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
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

/**
 * Get database instance
 * @returns {sqlite3.Database}
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// =============================================================================
// PROJECT OPERATIONS
// =============================================================================

/**
 * Upsert a project state
 * @param {Object} state - Project state object
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<number>} - Project ID
 */
async function upsertProject(state, projectPath) {
  const stateJson = JSON.stringify(state);
  const now = new Date().toISOString();
  
  // Check if project exists
  const existing = await getAsync('SELECT id FROM projects WHERE name = ?', [state.project_name]);
  
  if (existing) {
    // Update existing project
    await runAsync(`
      UPDATE projects 
      SET state_json = ?, 
          progress_percentage = ?, 
          editor_used = ?,
          last_modified = ?,
          is_active = TRUE
      WHERE id = ?
    `, [stateJson, state.progress_percentage, state.editor_used, now, existing.id]);
    
    // Delete old related data
    await runAsync('DELETE FROM implementation_steps WHERE project_id = ?', [existing.id]);
    await runAsync('DELETE FROM decision_tree WHERE project_id = ?', [existing.id]);
    await runAsync('DELETE FROM test_results WHERE project_id = ?', [existing.id]);
    
    // Insert new related data
    await insertRelatedData(existing.id, state);
    
    return existing.id;
  } else {
    // Insert new project
    const result = await runAsync(`
      INSERT INTO projects (name, path, state_json, progress_percentage, editor_used, created_at, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [state.project_name, projectPath, stateJson, state.progress_percentage, state.editor_used, now, now]);
    
    // Insert related data
    await insertRelatedData(result.id, state);
    
    return result.id;
  }
}

/**
 * Insert related data (steps, decisions, tests)
 */
async function insertRelatedData(projectId, state) {
  // Insert implementation steps
  if (state.implementation_plan && state.implementation_plan.length > 0) {
    for (const step of state.implementation_plan) {
      await runAsync(`
        INSERT INTO implementation_steps (project_id, step_number, task, status)
        VALUES (?, ?, ?, ?)
      `, [projectId, step.step, step.task, step.status]);
    }
  }
  
  // Insert decision tree
  if (state.decision_tree && state.decision_tree.length > 0) {
    for (const decision of state.decision_tree) {
      await runAsync(`
        INSERT INTO decision_tree (project_id, node_id, decision, chosen, reason)
        VALUES (?, ?, ?, ?, ?)
      `, [projectId, decision.node_id, decision.decision, decision.chosen, decision.reason]);
    }
  }
  
  // Insert test results
  if (state.tests_generated && state.tests_generated.length > 0) {
    for (const test of state.tests_generated) {
      await runAsync(`
        INSERT INTO test_results (project_id, test_name, status, file_path)
        VALUES (?, ?, ?, ?)
      `, [projectId, test.test_name, test.status, test.file]);
    }
  }
}

/**
 * Get all projects
 * @returns {Promise<Array>}
 */
async function getAllProjects() {
  const rows = await allAsync(`
    SELECT id, name, path, state_json, progress_percentage, editor_used, last_modified, created_at, is_active
    FROM projects
    WHERE is_active = TRUE
    ORDER BY last_modified DESC
  `);
  
  return rows.map(row => ({
    ...JSON.parse(row.state_json),
    _db: {
      id: row.id,
      path: row.path,
      last_modified: row.last_modified,
      created_at: row.created_at
    }
  }));
}

/**
 * Get a single project by name
 * @param {string} name - Project name
 * @returns {Promise<Object|null>}
 */
async function getProject(name) {
  const row = await getAsync(`
    SELECT id, name, path, state_json, progress_percentage, editor_used, last_modified, created_at
    FROM projects
    WHERE name = ? AND is_active = TRUE
  `, [name]);
  
  if (!row) return null;
  
  return {
    ...JSON.parse(row.state_json),
    _db: {
      id: row.id,
      path: row.path,
      last_modified: row.last_modified,
      created_at: row.created_at
    }
  };
}

/**
 * Delete a project (soft delete)
 * @param {string} name - Project name
 * @returns {Promise<boolean>}
 */
async function deleteProject(name) {
  const result = await runAsync(`
    UPDATE projects SET is_active = FALSE WHERE name = ?
  `, [name]);
  
  return result.changes > 0;
}

/**
 * Hard delete a project
 * @param {string} name - Project name
 * @returns {Promise<boolean>}
 */
async function hardDeleteProject(name) {
  const result = await runAsync('DELETE FROM projects WHERE name = ?', [name]);
  return result.changes > 0;
}

// =============================================================================
// SYNC STATE OPERATIONS
// =============================================================================

/**
 * Get sync state
 * @returns {Promise<Object>}
 */
async function getSyncState() {
  return getAsync('SELECT * FROM sync_state WHERE id = 1');
}

/**
 * Update sync state
 * @param {Object} state - Sync state update
 */
async function updateSyncState(state) {
  const fields = [];
  const values = [];
  
  if (state.last_sync_at !== undefined) {
    fields.push('last_sync_at = ?');
    values.push(state.last_sync_at);
  }
  if (state.last_commit_hash !== undefined) {
    fields.push('last_commit_hash = ?');
    values.push(state.last_commit_hash);
  }
  if (state.sync_status !== undefined) {
    fields.push('sync_status = ?');
    values.push(state.sync_status);
  }
  if (state.sync_error !== undefined) {
    fields.push('sync_error = ?');
    values.push(state.sync_error);
  }
  
  if (fields.length > 0) {
    values.push(1); // for WHERE id = 1
    await runAsync(`UPDATE sync_state SET ${fields.join(', ')} WHERE id = 1`, values);
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get dashboard statistics
 * @returns {Promise<Object>}
 */
async function getStatistics() {
  const projectCount = await getAsync('SELECT COUNT(*) as count FROM projects WHERE is_active = TRUE');
  const stepsByStatus = await allAsync(`
    SELECT status, COUNT(*) as count 
    FROM implementation_steps 
    GROUP BY status
  `);
  const testsByStatus = await allAsync(`
    SELECT status, COUNT(*) as count 
    FROM test_results 
    GROUP BY status
  `);
  const avgProgress = await getAsync(`
    SELECT AVG(progress_percentage) as avg 
    FROM projects 
    WHERE is_active = TRUE
  `);
  
  const stepsStats = {};
  for (const row of stepsByStatus) {
    stepsStats[row.status] = row.count;
  }
  
  const testsStats = {};
  for (const row of testsByStatus) {
    testsStats[row.status] = row.count;
  }
  
  return {
    projectCount: projectCount?.count || 0,
    averageProgress: Math.round(avgProgress?.avg || 0),
    steps: stepsStats,
    tests: testsStats
  };
}

// =============================================================================
// EXPORT/IMPORT
// =============================================================================

/**
 * Export database to JSON
 * @returns {Promise<Object>}
 */
async function exportToJson() {
  const projects = await allAsync('SELECT * FROM projects WHERE is_active = TRUE');
  const syncState = await getSyncState();
  
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    projects: projects.map(p => ({
      name: p.name,
      path: p.path,
      state: JSON.parse(p.state_json),
      created_at: p.created_at,
      last_modified: p.last_modified
    })),
    syncState
  };
}

/**
 * Import data from JSON export
 * @param {Object} data - Exported data
 * @param {boolean} [merge=true] - Merge with existing or replace
 */
async function importFromJson(data, merge = true) {
  if (!merge) {
    // Clear existing data
    await runAsync('DELETE FROM implementation_steps');
    await runAsync('DELETE FROM decision_tree');
    await runAsync('DELETE FROM test_results');
    await runAsync('DELETE FROM projects');
  }
  
  for (const project of data.projects) {
    await upsertProject(project.state, project.path);
  }
  
  console.log(`[Database] Imported ${data.projects.length} projects`);
}

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
  
  // Export/Import
  exportToJson,
  importFromJson,
  
  // Raw queries (for advanced use)
  runAsync,
  getAsync,
  allAsync,
  execAsync
};
