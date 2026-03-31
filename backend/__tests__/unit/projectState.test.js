import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { createTestDir, cleanupTestDir, createMockProjectFile } from '../helpers/testUtils.js';
import { createMockProject } from '../fixtures/mockProjects.js';

// Import after setting up mocks
import { readProjectState, updateProjectState, updateStepStatus } from '../../lib/projectState.js';

describe('Project State Module', () => {
  let testDir;

  beforeEach(async () => {
    testDir = createTestDir('project-state');
  });

  afterEach(async () => {
    cleanupTestDir(testDir);
  });

  describe('readProjectState', () => {
    it('should read a valid project state file', async () => {
      const project = createMockProject();
      createMockProjectFile(testDir, project);

      const state = await readProjectState(path.join(testDir, project.project_name));
      expect(state).toBeDefined();
      expect(state.project_name).toBe(project.project_name);
      expect(state.implementation_plan).toHaveLength(3);
    });

    it('should return null if file does not exist', async () => {
      const state = await readProjectState('/non/existent/path');
      expect(state).toBeNull();
    });

    it('should throw for invalid JSON', async () => {
      const projectDir = path.join(testDir, 'invalid-project');
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, '.project_state.json'), 'not valid json');

      await expect(readProjectState(projectDir)).rejects.toThrow();
    });
  });

  describe('updateProjectState', () => {
    it('should update existing project state', async () => {
      const project = createMockProject();
      createMockProjectFile(testDir, project);

      const projectPath = path.join(testDir, project.project_name);
      const updated = await updateProjectState(projectPath, {
        progress_percentage: 75,
      });

      expect(updated.progress_percentage).toBe(75);
      expect(updated.project_name).toBe(project.project_name);
    });

    it('should throw if project state not found', async () => {
      await expect(updateProjectState('/non/existent/path', {})).rejects.toThrow(
        'Project state not found'
      );
    });

    it('should preserve existing fields', async () => {
      const project = createMockProject();
      createMockProjectFile(testDir, project);

      const projectPath = path.join(testDir, project.project_name);
      const updated = await updateProjectState(projectPath, {
        editor_used: 'cursor',
      });

      expect(updated.editor_used).toBe('cursor');
      expect(updated.progress_percentage).toBe(project.progress_percentage);
      expect(updated.implementation_plan).toHaveLength(3);
    });
  });

  describe('updateStepStatus', () => {
    it('should update step status', async () => {
      const project = createMockProject();
      createMockProjectFile(testDir, project);

      const projectPath = path.join(testDir, project.project_name);
      const result = await updateStepStatus(projectPath, '1', 'done');

      expect(result.stepId).toBe('1');
      expect(result.previousStatus).toBe('done');
    });

    it('should throw if project not found', async () => {
      await expect(updateStepStatus('/non/existent', '1', 'done')).rejects.toThrow();
    });

    it('should throw if step not found', async () => {
      const project = createMockProject();
      createMockProjectFile(testDir, project);

      const projectPath = path.join(testDir, project.project_name);
      await expect(updateStepStatus(projectPath, '999', 'done')).rejects.toThrow('not found');
    });

    it('should throw if implementation_plan missing', async () => {
      const project = createMockProject({ implementation_plan: null });
      createMockProjectFile(testDir, project);

      const projectPath = path.join(testDir, project.project_name);
      await expect(updateStepStatus(projectPath, '1', 'done')).rejects.toThrow();
    });

    it('should persist the updated plan', async () => {
      const project = createMockProject();
      createMockProjectFile(testDir, project);

      const projectPath = path.join(testDir, project.project_name);
      await updateStepStatus(projectPath, '3', 'in_progress');

      const state = await readProjectState(projectPath);
      const step = state.implementation_plan.find(s => s.step === '3');
      expect(step.status).toBe('in_progress');
    });
  });
});
