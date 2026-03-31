'use strict';

/**
 * SQL schema definitions for PM Dashboard
 */

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
  `,

  tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      message TEXT,
      result TEXT,
      report TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `,
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
  'CREATE INDEX IF NOT EXISTS idx_tests_status ON test_results(status)',
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
      "INSERT INTO sync_state (id, sync_status) VALUES (1, 'idle')",
    ],
  },
  {
    version: 2,
    description: 'Add indexes',
    statements: INDEXES,
  },
  {
    version: 3,
    description: 'Add tasks table for async task tracking',
    statements: [
      SCHEMA.tasks,
      'CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_name)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)',
    ],
  },
];

module.exports = {
  SCHEMA,
  INDEXES,
  MIGRATIONS,
};
