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
