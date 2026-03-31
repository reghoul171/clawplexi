/**
 * Sync Routes
 * Routes for sync-related endpoints
 */

'use strict';

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');

/**
 * GET /api/sync/status - Get sync status
 */
router.get('/status', syncController.getStatus);

/**
 * POST /api/sync/trigger - Trigger manual sync
 */
router.post('/trigger', syncController.triggerSync);

module.exports = router;
