/**
 * Test helper utilities
 */

import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Create a temporary test directory
 * @param {string} name - Directory name
 * @returns {string} Path to created directory
 */
export function createTestDir(name = 'test-workspace') {
  const testDir = path.join('/tmp', `pm-dashboard-test-${name}-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up a test directory
 * @param {string} dirPath - Path to directory to remove
 */
export function cleanupTestDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Create a mock project state file
 * @param {string} dirPath - Directory to create the file in
 * @param {Object} projectData - Project data to write
 * @returns {string} Path to created file
 */
export function createMockProjectFile(dirPath, projectData) {
  const projectDir = path.join(dirPath, projectData.project_name);
  fs.mkdirSync(projectDir, { recursive: true });
  const filePath = path.join(projectDir, '.project_state.json');
  fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2));
  return filePath;
}

/**
 * Mock the database module
 * @returns {Object} Mocked database module
 */
export function createMockDatabase() {
  const mockDb = {
    projects: new Map(),
    tasks: new Map(),
    syncState: {
      id: 1,
      last_sync_at: null,
      last_commit_hash: null,
      sync_status: 'idle',
      sync_error: null,
    },

    initDatabase: vi.fn().mockResolvedValue(undefined),
    closeDatabase: vi.fn().mockResolvedValue(undefined),

    getAllProjects: vi.fn().mockImplementation(async () => {
      return Array.from(mockDb.projects.values());
    }),

    getProject: vi.fn().mockImplementation(async name => {
      return mockDb.projects.get(name) || null;
    }),

    upsertProject: vi.fn().mockImplementation(async (state, projectPath) => {
      mockDb.projects.set(state.project_name, { ...state, _db: { path: projectPath } });
      return mockDb.projects.size;
    }),

    deleteProject: vi.fn().mockImplementation(async name => {
      return mockDb.projects.delete(name);
    }),

    getSyncState: vi.fn().mockImplementation(async () => mockDb.syncState),

    updateSyncState: vi.fn().mockImplementation(async state => {
      Object.assign(mockDb.syncState, state);
    }),

    getStatistics: vi.fn().mockImplementation(async () => ({
      projectCount: mockDb.projects.size,
      averageProgress: 50,
      steps: { done: 1, pending: 2, in_progress: 1 },
      tests: { passing: 1, failing: 0 },
    })),

    createTask: vi.fn().mockImplementation(async task => {
      const id = task.id || `task-${Date.now()}`;
      mockDb.tasks.set(id, { ...task, id, status: 'pending', progress: 0 });
      return id;
    }),

    getTask: vi.fn().mockImplementation(async id => {
      return mockDb.tasks.get(id) || null;
    }),

    updateTask: vi.fn().mockImplementation(async (id, update) => {
      const task = mockDb.tasks.get(id);
      if (task) {
        mockDb.tasks.set(id, { ...task, ...update });
      }
    }),

    getTasksByProject: vi.fn().mockImplementation(async projectName => {
      return Array.from(mockDb.tasks.values()).filter(t => t.project_name === projectName);
    }),
  };

  return mockDb;
}

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
