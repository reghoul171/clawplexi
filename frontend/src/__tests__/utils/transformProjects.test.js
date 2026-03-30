import { describe, it, expect } from 'vitest';
import { transformToWorkspace, findProjectByListId } from '../../utils/transformProjects';

describe('transformProjects', () => {
  describe('transformToWorkspace', () => {
    it('should return default structure for null input', () => {
      const result = transformToWorkspace(null);

      expect(result.name).toBe('PM Dashboard');
      expect(result.spaces).toEqual([]);
      expect(result.totalProjects).toBe(0);
      expect(result.activeProjects).toBe(0);
      expect(result.completedProjects).toBe(0);
    });

    it('should return default structure for undefined input', () => {
      const result = transformToWorkspace(undefined);

      expect(result.spaces).toEqual([]);
      expect(result.totalProjects).toBe(0);
    });

    it('should return default structure for non-array input', () => {
      const result = transformToWorkspace('not an array');

      expect(result.spaces).toEqual([]);
    });

    it('should transform single project into workspace', () => {
      const projects = [
        {
          project_name: 'test-project',
          progress_percentage: 50,
          implementation_plan: [
            { step: '1', task: 'Setup', status: 'done' },
            { step: '2', task: 'Develop', status: 'in_progress' },
          ],
          tests_generated: [{ test_name: 'test1', status: 'passed' }],
          decision_tree: [{ node_id: 'd1', decision: 'Choice', chosen: 'A' }],
        },
      ];

      const result = transformToWorkspace(projects);

      expect(result.name).toBe('PM Dashboard');
      expect(result.spaces).toHaveLength(1);
      expect(result.spaces[0].name).toBe('test-project');
      expect(result.totalProjects).toBe(1);
    });

    it('should calculate correct statistics', () => {
      const projects = [
        { project_name: 'p1', progress_percentage: 100, implementation_plan: [] },
        { project_name: 'p2', progress_percentage: 50, implementation_plan: [] },
        { project_name: 'p3', progress_percentage: 0, implementation_plan: [] },
      ];

      const result = transformToWorkspace(projects);

      expect(result.totalProjects).toBe(3);
      expect(result.completedProjects).toBe(1);
      expect(result.activeProjects).toBe(2);
    });

    it('should create lists from implementation plan', () => {
      const projects = [
        {
          project_name: 'test-project',
          progress_percentage: 50,
          implementation_plan: [
            { step: '1', task: 'Setup', status: 'done' },
            { step: '2', task: 'Develop', status: 'pending' },
          ],
          tests_generated: [],
          decision_tree: [],
        },
      ];

      const result = transformToWorkspace(projects);

      const implList = result.spaces[0].lists.find(l => l.name === 'Implementation');
      expect(implList).toBeDefined();
      expect(implList.itemCount).toBe(2);
      expect(implList.completedCount).toBe(1);
    });

    it('should create tests list from tests_generated', () => {
      const projects = [
        {
          project_name: 'test-project',
          progress_percentage: 50,
          implementation_plan: [],
          tests_generated: [
            { test_name: 'test1', status: 'passed' },
            { test_name: 'test2', status: 'failed' },
          ],
          decision_tree: [],
        },
      ];

      const result = transformToWorkspace(projects);

      const testsList = result.spaces[0].lists.find(l => l.name === 'Tests');
      expect(testsList).toBeDefined();
      expect(testsList.itemCount).toBe(2);
      expect(testsList.completedCount).toBe(1);
    });

    it('should create default list for empty project', () => {
      const projects = [
        {
          project_name: 'empty-project',
          progress_percentage: 0,
          implementation_plan: [],
          tests_generated: [],
          decision_tree: [],
        },
      ];

      const result = transformToWorkspace(projects);

      expect(result.spaces[0].lists).toHaveLength(1);
      expect(result.spaces[0].lists[0].name).toBe('Main');
    });

    it('should determine correct status from progress', () => {
      const doneProject = {
        project_name: 'done-project',
        progress_percentage: 100,
        implementation_plan: [],
        tests_generated: [],
        decision_tree: [],
      };

      const inProgressProject = {
        project_name: 'in-progress-project',
        progress_percentage: 50,
        implementation_plan: [],
        tests_generated: [],
        decision_tree: [],
      };

      const pendingProject = {
        project_name: 'pending-project',
        progress_percentage: 0,
        implementation_plan: [],
        tests_generated: [],
        decision_tree: [],
      };

      const result = transformToWorkspace([doneProject, inProgressProject, pendingProject]);

      expect(result.spaces[0].progress).toBe(100);
      expect(result.spaces[1].progress).toBe(50);
      expect(result.spaces[2].progress).toBe(0);
    });
  });

  describe('findProjectByListId', () => {
    it('should return null for null projects', () => {
      expect(findProjectByListId(null, 'impl-test')).toBeNull();
    });

    it('should return null for null listId', () => {
      expect(findProjectByListId([{ project_name: 'test' }], null)).toBeNull();
    });

    it('should find project by list ID', () => {
      const projects = [
        { project_name: 'test-project', progress_percentage: 50 },
        { project_name: 'other-project', progress_percentage: 75 },
      ];

      const found = findProjectByListId(projects, 'impl-test-project');
      expect(found).toBeDefined();
      expect(found.project_name).toBe('test-project');
    });

    it('should return null for non-matching list ID', () => {
      const projects = [{ project_name: 'test-project', progress_percentage: 50 }];

      const found = findProjectByListId(projects, 'non-existent');
      expect(found).toBeNull();
    });

    it('should handle project names with hyphens', () => {
      const projects = [{ project_name: 'my-cool-project', progress_percentage: 50 }];

      const found = findProjectByListId(projects, 'impl-my-cool-project');
      expect(found).toBeDefined();
      expect(found.project_name).toBe('my-cool-project');
    });
  });
});
