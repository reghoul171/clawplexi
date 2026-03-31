/**
 * Unit tests for Task Service
 * Tests verify service exports and basic functionality
 */

import { describe, it, expect } from 'vitest';

describe('Task Service', () => {
  it('should export createTask function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.createTask).toBe('function');
  });

  it('should export updateTaskProgress function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.updateTaskProgress).toBe('function');
  });

  it('should export completeTask function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.completeTask).toBe('function');
  });

  it('should export getTaskById function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.getTaskById).toBe('function');
  });

  it('should export getTasksByProject function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.getTasksByProject).toBe('function');
  });

  it('should export getPendingTasks function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.getPendingTasks).toBe('function');
  });

  it('should export getRecentCompletedTasks function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.getRecentCompletedTasks).toBe('function');
  });

  it('should export getTasks function', async () => {
    const service = await import('../../../services/task.service.js');
    expect(typeof service.getTasks).toBe('function');
  });
});
