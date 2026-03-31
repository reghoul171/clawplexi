/**
 * Unit tests for Project Service
 * Tests verify service exports and basic functionality
 */

import { describe, it, expect } from 'vitest';

describe('Project Service', () => {
  it('should export getAllProjects function', async () => {
    const service = await import('../../../services/project.service.js');
    expect(typeof service.getAllProjects).toBe('function');
  });

  it('should export getProjectByName function', async () => {
    const service = await import('../../../services/project.service.js');
    expect(typeof service.getProjectByName).toBe('function');
  });

  it('should export updateStepStatusByName function', async () => {
    const service = await import('../../../services/project.service.js');
    expect(typeof service.updateStepStatusByName).toBe('function');
  });

  it('should export getStatistics function', async () => {
    const service = await import('../../../services/project.service.js');
    expect(typeof service.getStatistics).toBe('function');
  });

  it('should export upsertProject function', async () => {
    const service = await import('../../../services/project.service.js');
    expect(typeof service.upsertProject).toBe('function');
  });

  it('should export deleteProject function', async () => {
    const service = await import('../../../services/project.service.js');
    expect(typeof service.deleteProject).toBe('function');
  });
});
