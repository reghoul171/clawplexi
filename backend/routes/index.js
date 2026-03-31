/**
 * Routes Index
 * Aggregates all API routes
 */

'use strict';

const express = require('express');
const router = express.Router();

const projectsRoutes = require('./projects.routes');
const syncRoutes = require('./sync.routes');
const tasksRoutes = require('./tasks.routes');
const projectsController = require('../controllers/projects.controller');

// Mount route modules
router.use('/projects', projectsRoutes);
router.use('/sync', syncRoutes);
router.use('/tasks', tasksRoutes);

// Health and stats endpoints (at API root)
router.get('/health', projectsController.healthCheck);
router.get('/stats', projectsController.getStats);

module.exports = router;
