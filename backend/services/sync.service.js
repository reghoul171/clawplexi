/**
 * Sync Service
 * Business logic for Git synchronization
 */

'use strict';

const syncRepository = require('../repositories/sync.repository');

/**
 * Sync service - wraps GitSync instance
 */
class SyncService {
  /**
   * @param {Object} gitSync - GitSync instance from lib/sync
   * @param {Object} config - Sync configuration
   */
  constructor(gitSync, config) {
    this.gitSync = gitSync;
    this.config = config;
  }

  /**
   * Get sync status
   * @returns {Promise<Object>} Sync status
   */
  async getStatus() {
    const syncState = await syncRepository.getState();
    const gitStatus = this.gitSync ? this.gitSync.getStatus() : null;

    return {
      enabled: this.config?.enabled || false,
      initialized: gitStatus?.initialized || false,
      hasRemote: this.gitSync?.hasRemote() || false,
      clean: gitStatus?.clean ?? true,
      lastSync: syncState?.last_sync_at || null,
      status: syncState?.sync_status || 'idle',
    };
  }

  /**
   * Trigger a sync
   * @returns {Promise<Object>} Sync result
   */
  async triggerSync() {
    if (!this.gitSync || !this.gitSync.isGitRepo()) {
      throw new Error('Git sync not initialized');
    }

    const result = await this.gitSync.sync();

    // Update sync state in database
    await syncRepository.updateState({
      last_sync_at: result.success ? new Date().toISOString() : undefined,
      sync_status: result.success ? 'success' : 'error',
      sync_error: result.success ? null : result.message,
    });

    return result;
  }

  /**
   * Check if sync is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.gitSync && this.gitSync.isGitRepo();
  }
}

module.exports = {
  SyncService,
};
