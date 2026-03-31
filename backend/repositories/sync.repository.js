/**
 * Sync Repository
 * Database operations for sync state
 */

'use strict';

const db = require('../lib/database');

/**
 * Get current sync state
 * @returns {Promise<Object>} Sync state object
 */
async function getState() {
  return db.getSyncState();
}

/**
 * Update sync state
 * @param {Object} state - State updates
 * @returns {Promise<void>}
 */
async function updateState(state) {
  return db.updateSyncState(state);
}

module.exports = {
  getState,
  updateState,
};
