/**
 * Sync Controller
 * HTTP handlers for sync-related endpoints
 */

'use strict';

/**
 * Get sync status
 * GET /api/sync/status
 */
async function getStatus(req, res, next) {
  try {
    const syncService = req.app.locals.syncService;

    if (!syncService) {
      return res.json({
        enabled: false,
        initialized: false,
        hasRemote: false,
        clean: true,
        lastSync: null,
        status: 'disabled',
      });
    }

    const status = await syncService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[SyncController] Error fetching sync status:', error);
    next(error);
  }
}

/**
 * Trigger manual sync
 * POST /api/sync/trigger
 */
async function triggerSync(req, res, next) {
  try {
    const syncService = req.app.locals.syncService;

    if (!syncService || !syncService.isAvailable()) {
      return res.status(400).json({ error: 'Git sync not initialized' });
    }

    const result = await syncService.triggerSync();
    res.json(result);
  } catch (error) {
    console.error('[SyncController] Error triggering sync:', error);
    next(error);
  }
}

module.exports = {
  getStatus,
  triggerSync,
};
