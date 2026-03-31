/**
 * Tasks Controller
 * HTTP handlers for task-related endpoints
 */

'use strict';

const taskService = require('../services/task.service');
const testerService = require('../services/tester.service');

/**
 * Get tasks (optionally filtered)
 * GET /api/tasks
 */
async function list(req, res, next) {
  try {
    const { projectName, status } = req.query;
    const tasks = await taskService.getTasks({ projectName, status });
    res.json(tasks);
  } catch (error) {
    console.error('[TasksController] Error fetching tasks:', error);
    next(error);
  }
}

/**
 * Get a specific task
 * GET /api/tasks/:taskId
 */
async function getById(req, res, next) {
  try {
    const task = await taskService.getTaskById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('[TasksController] Error fetching task:', error);
    next(error);
  }
}

/**
 * Update task progress (for agents)
 * POST /api/tasks/:taskId/progress
 */
async function updateProgress(req, res, next) {
  try {
    const { taskId } = req.params;
    const { progress, message, status } = req.body;

    const task = await taskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await taskService.updateTaskProgress(taskId, {
      progress,
      message,
      status,
    });

    // Emit progress event
    const io = req.app.locals.io;
    if (io) {
      io.emit('task_progress', {
        taskId,
        type: task.type,
        projectName: task.project_name,
        progress: progress ?? task.progress,
        message: message ?? task.message,
        status: status ?? task.status,
      });
    }

    res.json({ success: true, taskId });
  } catch (error) {
    console.error('[TasksController] Error updating task progress:', error);
    next(error);
  }
}

/**
 * Complete a task (for agents)
 * POST /api/tasks/:taskId/complete
 */
async function complete(req, res, next) {
  try {
    const { taskId } = req.params;
    const { result, report } = req.body;

    const task = await taskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await taskService.completeTask(taskId, { result, report });

    // Emit completion event
    const io = req.app.locals.io;
    if (io) {
      io.emit('task_completed', {
        taskId,
        type: task.type,
        projectName: task.project_name,
        status: 'completed',
        progress: 100,
        result,
        report,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, taskId });
  } catch (error) {
    console.error('[TasksController] Error completing task:', error);
    next(error);
  }
}

/**
 * Create tests for a project
 * POST /api/tester/create-tests
 */
async function createTests(req, res, next) {
  try {
    const { projectName } = req.body;
    const io = req.app.locals.io;
    const config = req.app.locals.config;
    const gatewayUrl =
      config.openclawGatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

    const result = await testerService.handleTesterRequest('create-tests', projectName, {
      io,
      gatewayUrl,
    });

    res.json(result);
  } catch (error) {
    console.error('[TasksController] Error creating tests:', error);
    if (error.message === 'Project name is required') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

/**
 * Run tests for a project
 * POST /api/tester/run-tests
 */
async function runTests(req, res, next) {
  try {
    const { projectName } = req.body;
    const io = req.app.locals.io;
    const config = req.app.locals.config;
    const gatewayUrl =
      config.openclawGatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

    const result = await testerService.handleTesterRequest('run-tests', projectName, {
      io,
      gatewayUrl,
    });

    res.json(result);
  } catch (error) {
    console.error('[TasksController] Error running tests:', error);
    if (error.message === 'Project name is required') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

/**
 * Generate test report for a project
 * POST /api/tester/generate-report
 */
async function generateReport(req, res, next) {
  try {
    const { projectName } = req.body;
    const io = req.app.locals.io;
    const config = req.app.locals.config;
    const gatewayUrl =
      config.openclawGatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

    const result = await testerService.handleTesterRequest('generate-report', projectName, {
      io,
      gatewayUrl,
    });

    res.json(result);
  } catch (error) {
    console.error('[TasksController] Error generating report:', error);
    if (error.message === 'Project name is required') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = {
  list,
  getById,
  updateProgress,
  complete,
  createTests,
  runTests,
  generateReport,
};
