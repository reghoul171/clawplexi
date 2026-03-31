'use strict';

/**
 * Database Connection Module
 * Handles SQLite database initialization, connection lifecycle, and migrations
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { setDbGetter, runAsync, getAsync, execAsync } = require('./utils/query');
const { MIGRATIONS } = require('./schema');

let db = null;
let dbPath = null;

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

// Register the db getter with query utils
setDbGetter(getDb);

/**
 * Run pending migrations
 */
async function runMigrations() {
  // Check current version
  const row = await getAsync(
    'SELECT COALESCE(MAX(version), 0) as version FROM schema_version'
  ).catch(() => ({ version: 0 }));
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

      await runAsync('INSERT INTO schema_version (version, description) VALUES (?, ?)', [
        migration.version,
        migration.description,
      ]);
    }
  }
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

/**
 * Close the database connection
 */
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

/**
 * Get database path
 * @returns {string|null}
 */
function getDbPath() {
  return dbPath;
}

module.exports = {
  initDatabase,
  closeDatabase,
  getDb,
  getDbPath,
};
