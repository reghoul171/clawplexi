'use strict';

/**
 * Sync Repository
 * Handles sync state database operations
 */

const { runAsync, getAsync } = require('../utils/query');

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

module.exports = {
  getSyncState,
  updateSyncState,
};
