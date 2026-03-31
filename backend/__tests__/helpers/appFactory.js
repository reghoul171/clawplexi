/**
 * App Factory for testing
 * Creates an Express app instance for integration testing
 */

import express from 'express';
import cors from 'cors';
import http from 'http';

/**
 * Create a test app instance
 * @param {Object} options - Test options
 * @param {Object} options.mockDb - Mock database instance
 * @returns {Promise<{app: Express, server: http.Server}>}
 */
export async function createTestApp(options = {}) {
  const { mockDb } = options;

  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // Request logging (silent in tests)
  app.use((req, res, next) => {
    next();
  });

  // Get the database module (either mock or real)
  const db = mockDb || (await import('../../lib/database.js')).default;

  // API Routes

  // GET /api/projects - List all projects
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await db.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // GET /api/projects/:name - Get specific project
  app.get('/api/projects/:name', async (req, res) => {
    try {
      const { name } = req.params;
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Project name cannot be empty' });
      }

      const project = await db.getProject(name);
      if (project) {
        res.json(project);
      } else {
        res.status(404).json({ error: 'Project not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  // PATCH /api/projects/:name/steps/:stepNumber/status
  app.patch('/api/projects/:name/steps/:stepNumber/status', async (req, res) => {
    const { name, stepNumber } = req.params;
    const { status } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Project name cannot be empty' });
    }

    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    try {
      const project = await db.getProject(name);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const stepExists = project.implementation_plan?.some(
        s => String(s.step) === String(stepNumber)
      );

      if (!stepExists) {
        return res.status(404).json({ error: `Step ${stepNumber} not found` });
      }

      const previousStatus = project.implementation_plan.find(
        s => String(s.step) === String(stepNumber)
      )?.status;

      const updatedPlan = project.implementation_plan.map(step =>
        String(step.step) === String(stepNumber) ? { ...step, status } : step
      );

      const updatedProject = { ...project, implementation_plan: updatedPlan };
      await db.upsertProject(updatedProject, project._db?.path || `/test/${name}`);

      res.json({
        success: true,
        step: { step: stepNumber, status, previousStatus },
        project: updatedProject,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/health
  app.get('/api/health', async (req, res) => {
    try {
      const stats = await db.getStatistics();
      res.json({
        status: 'ok',
        projectsTracked: stats.projectCount,
        averageProgress: stats.averageProgress,
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // GET /api/stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await db.getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // POST /api/sync/trigger
  app.post('/api/sync/trigger', async (req, res) => {
    res.status(400).json({ error: 'Git sync not initialized' });
  });

  // GET /api/sync/status
  app.get('/api/sync/status', async (req, res) => {
    try {
      const syncState = await db.getSyncState();
      res.json({
        enabled: false,
        initialized: false,
        hasRemote: false,
        clean: true,
        lastSync: syncState?.last_sync_at || null,
        status: syncState?.sync_status || 'idle',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sync status' });
    }
  });

  // POST /api/tasks/:taskId/progress
  app.post('/api/tasks/:taskId/progress', async (req, res) => {
    const { taskId } = req.params;
    const { progress, message, status } = req.body;

    try {
      const task = await db.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const updates = {};
      if (progress !== undefined) updates.progress = progress;
      if (message !== undefined) updates.message = message;
      if (status !== undefined) updates.status = status;

      await db.updateTask(taskId, updates);

      res.json({ success: true, taskId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  const server = http.createServer(app);

  return { app, server };
}

/**
 * Start the test server
 * @param {http.Server} server - HTTP server instance
 * @param {number} port - Port to listen on
 * @returns {Promise<void>}
 */
export function startServer(server, port = 3002) {
  return new Promise(resolve => {
    server.listen(port, () => resolve());
  });
}

/**
 * Stop the test server
 * @param {http.Server} server - HTTP server instance
 * @returns {Promise<void>}
 */
export function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close(err => {
      if (err) reject(err);
      else resolve();
    });
  });
}
