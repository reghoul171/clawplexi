import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, startServer, stopServer } from '../helpers/appFactory.js';
import { createMockDatabase } from '../helpers/testUtils.js';
import { createMockProject, createMockTask } from '../fixtures/mockProjects.js';

describe('API Integration Tests', () => {
  let app;
  let server;
  let mockDb;

  beforeAll(async () => {
    mockDb = createMockDatabase();
    const result = await createTestApp({ mockDb });
    app = result.app;
    server = result.server;
  });

  afterAll(async () => {
    // Only close server if it was started
    if (server && server.listening) {
      await stopServer(server);
    }
  });

  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return projects with correct structure', async () => {
      // Add a test project
      const project = createMockProject();
      await mockDb.upsertProject(project, '/test/path');

      const response = await request(app).get('/api/projects').expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      const found = response.body.find(p => p.project_name === project.project_name);
      expect(found).toBeDefined();
      expect(found.implementation_plan).toBeDefined();
      expect(found.decision_tree).toBeDefined();
    });
  });

  describe('GET /api/projects/:name', () => {
    beforeEach(async () => {
      mockDb.projects.clear();
    });

    it('should return single project when exists', async () => {
      const project = createMockProject();
      await mockDb.upsertProject(project, '/test/path');

      const response = await request(app)
        .get(`/api/projects/${project.project_name}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.project_name).toBe(project.project_name);
    });

    it('should return 404 when project not found', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-project')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });

    it('should handle empty project name route (Express 404)', async () => {
      // Express will return 404 for the route /api/projects/ without a param
      // This is expected behavior - the param validation is for non-empty strings
      const response = await request(app).get('/api/projects/');
      // Express may redirect or return 404 depending on routing
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/projects/:name/steps/:stepNumber/status', () => {
    beforeEach(async () => {
      mockDb.projects.clear();
    });

    it('should update step status', async () => {
      const project = createMockProject();
      await mockDb.upsertProject(project, '/test/path');

      const response = await request(app)
        .patch(`/api/projects/${project.project_name}/steps/1/status`)
        .send({ status: 'done' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.step.status).toBe('done');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .patch('/api/projects/non-existent/steps/1/status')
        .send({ status: 'done' })
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });

    it('should return 404 for non-existent step', async () => {
      const project = createMockProject();
      await mockDb.upsertProject(project, '/test/path');

      const response = await request(app)
        .patch(`/api/projects/${project.project_name}/steps/999/status`)
        .send({ status: 'done' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid status', async () => {
      const project = createMockProject();
      await mockDb.upsertProject(project, '/test/path');

      const response = await request(app)
        .patch(`/api/projects/${project.project_name}/steps/1/status`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('Invalid status');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('projectsTracked');
      expect(response.body).toHaveProperty('averageProgress');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('projectCount');
      expect(response.body).toHaveProperty('averageProgress');
    });
  });

  describe('GET /api/sync/status', () => {
    it('should return sync status', async () => {
      const response = await request(app)
        .get('/api/sync/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('initialized');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('POST /api/sync/trigger', () => {
    it('should return error when sync not initialized', async () => {
      const response = await request(app)
        .post('/api/sync/trigger')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('not initialized');
    });
  });

  describe('POST /api/tasks/:taskId/progress', () => {
    beforeEach(async () => {
      mockDb.tasks.clear();
    });

    it('should update task progress', async () => {
      const task = createMockTask();
      await mockDb.createTask(task);

      const response = await request(app)
        .post(`/api/tasks/${task.id}/progress`)
        .send({ progress: 50, message: 'In progress', status: 'running' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.taskId).toBe(task.id);

      const updated = await mockDb.getTask(task.id);
      expect(updated.progress).toBe(50);
      expect(updated.status).toBe('running');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/non-existent/progress')
        .send({ progress: 50 })
        .expect(404);

      expect(response.body.error).toBe('Task not found');
    });
  });
});
