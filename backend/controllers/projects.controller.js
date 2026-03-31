/**
 * Projects Controller
 * HTTP handlers for project-related endpoints
 */

'use strict';

const projectService = require('../services/project.service');

/**
 * Get all projects
 * GET /api/projects
 */
async function list(req, res, next) {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('[ProjectsController] Error fetching projects:', error);
    next(error);
  }
}

/**
 * Get a single project by name
 * GET /api/projects/:name
 */
async function getByName(req, res, next) {
  try {
    const { name } = req.params;
    const project = await projectService.getProjectByName(name);

    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error) {
    console.error('[ProjectsController] Error fetching project:', error);
    next(error);
  }
}

/**
 * Update step status
 * PATCH/PUT /api/projects/:name/steps/:stepNumber/status
 */
async function updateStepStatus(req, res, next) {
  try {
    const { name, stepNumber } = req.params;
    const { status } = req.body;
    const paths = req.app.locals.paths;

    const result = await projectService.updateStepStatusByName(name, stepNumber, status, paths);

    // Broadcast via WebSocket
    const io = req.app.locals.io;
    if (io) {
      io.emit('project_updated', result.project);
    }

    console.log(`[ProjectsController] Step ${stepNumber} status updated to ${status} in ${name}`);
    res.json(result);
  } catch (error) {
    console.error('[ProjectsController] Error updating step status:', error);

    // Handle specific errors
    if (error.message === 'Project name cannot be empty') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Step')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Invalid status')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
}

/**
 * Update a step (general update)
 * PATCH /api/projects/:name/steps/:stepNumber
 */
async function updateStep(req, res, next) {
  try {
    const { name, stepNumber } = req.params;
    const updates = req.body;
    const paths = req.app.locals.paths;

    const result = await projectService.updateStepByName(name, stepNumber, updates, paths);

    // Broadcast via WebSocket
    const io = req.app.locals.io;
    if (io) {
      io.emit('project_updated', result.project);
    }

    console.log(`[ProjectsController] Step ${stepNumber} updated in ${name}`);
    res.json(result);
  } catch (error) {
    console.error('[ProjectsController] Error updating step:', error);

    // Handle specific errors
    if (error.message === 'Project name cannot be empty') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Project not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Step')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Invalid status')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
}

/**
 * Get dashboard statistics
 * GET /api/stats
 */
async function getStats(req, res, next) {
  try {
    const stats = await projectService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('[ProjectsController] Error fetching stats:', error);
    next(error);
  }
}

/**
 * Health check
 * GET /api/health
 */
async function healthCheck(req, res, next) {
  try {
    const stats = await projectService.getStatistics();
    const paths = req.app.locals.paths;
    const config = req.app.locals.config;

    res.json({
      status: 'ok',
      projectsTracked: stats.projectCount,
      averageProgress: stats.averageProgress,
      uptime: process.uptime(),
      config: {
        projectsDir: paths.projectsDir,
        stateFile: paths.stateFile,
        syncEnabled: config.sync.enabled,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  list,
  getByName,
  updateStepStatus,
  updateStep,
  getStats,
  healthCheck,
};
