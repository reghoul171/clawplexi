/**
 * Tasks Routes
 * Routes for task-related endpoints
 */

'use strict';

const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks.controller');

/**
 * GET /api/tasks - Get tasks (optionally filtered)
 */
router.get('/', tasksController.list);

/**
 * GET /api/tasks/:taskId - Get specific task
 */
router.get('/:taskId', tasksController.getById);

/**
 * POST /api/tasks/:taskId/progress - Update task progress (for agents)
 */
router.post('/:taskId/progress', tasksController.updateProgress);

/**
 * POST /api/tasks/:taskId/complete - Mark task complete (for agents)
 */
router.post('/:taskId/complete', tasksController.complete);

/**
 * POST /api/tester/create-tests - Spawn tester agent to create tests
 */
router.post('/tester/create-tests', tasksController.createTests);

/**
 * POST /api/tester/run-tests - Run all tests
 */
router.post('/tester/run-tests', tasksController.runTests);

/**
 * POST /api/tester/generate-report - Generate test report
 */
router.post('/tester/generate-report', tasksController.generateReport);

module.exports = router;
