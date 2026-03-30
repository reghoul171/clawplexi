import { describe, it, expect } from 'vitest';
import { normalizeProject } from '../../utils/normalizeProject';

describe('normalizeProject', () => {
  it('should return null for null input', () => {
    expect(normalizeProject(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(normalizeProject(undefined)).toBeNull();
  });

  it('should fill in default values for missing fields', () => {
    const project = { project_name: 'test-project' };
    const normalized = normalizeProject(project);

    expect(normalized.project_name).toBe('test-project');
    expect(normalized.project_description).toBe('No description available');
    expect(normalized.repository_url).toBeNull();
    expect(normalized.tech_stack).toEqual([]);
    expect(normalized.team_size).toBe(1);
    expect(normalized.lines_of_code).toBe(0);
    expect(normalized.progress_percentage).toBe(0);
    expect(normalized.implementation_plan).toEqual([]);
    expect(normalized.decision_tree).toEqual([]);
    expect(normalized.tests_generated).toEqual([]);
    expect(normalized.editor_used).toBe('Unknown');
  });

  it('should preserve existing values', () => {
    const project = {
      project_name: 'test-project',
      project_description: 'Custom description',
      progress_percentage: 75,
      editor_used: 'claude',
      tech_stack: ['React', 'Node.js'],
      team_size: 3,
      lines_of_code: 5000,
    };
    const normalized = normalizeProject(project);

    expect(normalized.project_description).toBe('Custom description');
    expect(normalized.progress_percentage).toBe(75);
    expect(normalized.editor_used).toBe('claude');
    expect(normalized.tech_stack).toEqual(['React', 'Node.js']);
    expect(normalized.team_size).toBe(3);
    expect(normalized.lines_of_code).toBe(5000);
  });

  it('should extract tech_stack from metadata if not at top level', () => {
    const project = {
      project_name: 'test-project',
      metadata: {
        tech_stack: ['Vue', 'Python'],
      },
    };
    const normalized = normalizeProject(project);

    expect(normalized.tech_stack).toEqual(['Vue', 'Python']);
  });

  it('should prefer top-level tech_stack over metadata', () => {
    const project = {
      project_name: 'test-project',
      tech_stack: ['React', 'TypeScript'],
      metadata: {
        tech_stack: ['Vue', 'JavaScript'],
      },
    };
    const normalized = normalizeProject(project);

    expect(normalized.tech_stack).toEqual(['React', 'TypeScript']);
  });

  it('should extract team_size from metadata fallback', () => {
    const project = {
      project_name: 'test-project',
      metadata: {
        team_size: 5,
      },
    };
    const normalized = normalizeProject(project);

    expect(normalized.team_size).toBe(5);
  });

  it('should ensure implementation_plan is always an array', () => {
    const project = {
      project_name: 'test-project',
      implementation_plan: null,
    };
    const normalized = normalizeProject(project);

    expect(Array.isArray(normalized.implementation_plan)).toBe(true);
  });

  it('should ensure decision_tree is always an array', () => {
    const project = {
      project_name: 'test-project',
      decision_tree: 'not an array',
    };
    const normalized = normalizeProject(project);

    expect(Array.isArray(normalized.decision_tree)).toBe(true);
  });

  it('should ensure tests_generated is always an array', () => {
    const project = {
      project_name: 'test-project',
      tests_generated: { invalid: 'object' },
    };
    const normalized = normalizeProject(project);

    expect(Array.isArray(normalized.tests_generated)).toBe(true);
  });

  it('should handle complete project data', () => {
    const project = {
      project_name: 'complete-project',
      project_description: 'A complete project',
      repository_url: 'https://github.com/test/project',
      tech_stack: ['React', 'Node.js', 'PostgreSQL'],
      start_date: '2024-01-01',
      team_size: 4,
      lines_of_code: 10000,
      progress_percentage: 80,
      editor_used: 'cursor',
      implementation_plan: [
        { step: '1', task: 'Setup', status: 'done' },
        { step: '2', task: 'Develop', status: 'in_progress' },
      ],
      decision_tree: [{ node_id: 'd1', decision: 'DB Choice', chosen: 'PostgreSQL' }],
      tests_generated: [{ test_name: 'unit test', status: 'passed' }],
    };
    const normalized = normalizeProject(project);

    expect(normalized).toEqual(project);
  });
});
