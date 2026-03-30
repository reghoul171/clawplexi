/**
 * Projects Routes
 * Routes for project-related endpoints
 */

'use strict';

const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');

/**
 * GET /api/projects - List all projects
 */
router.get('/', projectsController.list);

/**
 * GET /api/projects/:name - Get single project
 */
router.get('/:name', projectsController.getByName);

/**
 * PATCH /api/projects/:name/steps/:stepNumber/status - Update step status
 */
router.patch('/:name/steps/:stepNumber/status', projectsController.updateStepStatus);

/**
 * PUT /api/projects/:name/steps/:stepNumber/status - Update step status (alternative)
 */
router.put('/:name/steps/:stepNumber/status', projectsController.updateStepStatus);

module.exports = router;
