/**
 * Unit tests for controller modules
 * Tests focus on controller exports and basic functionality
 */

import { describe, it, expect } from 'vitest';

describe('Projects Controller', () => {
  it('should export list function', async () => {
    const controller = await import('../../controllers/projects.controller.js');
    expect(typeof controller.list).toBe('function');
  });

  it('should export getByName function', async () => {
    const controller = await import('../../controllers/projects.controller.js');
    expect(typeof controller.getByName).toBe('function');
  });

  it('should export updateStepStatus function', async () => {
    const controller = await import('../../controllers/projects.controller.js');
    expect(typeof controller.updateStepStatus).toBe('function');
  });

  it('should export healthCheck function', async () => {
    const controller = await import('../../controllers/projects.controller.js');
    expect(typeof controller.healthCheck).toBe('function');
  });

  it('should export getStats function', async () => {
    const controller = await import('../../controllers/projects.controller.js');
    expect(typeof controller.getStats).toBe('function');
  });
});

describe('Sync Controller', () => {
  it('should export triggerSync function', async () => {
    const controller = await import('../../controllers/sync.controller.js');
    expect(typeof controller.triggerSync).toBe('function');
  });

  it('should export getStatus function', async () => {
    const controller = await import('../../controllers/sync.controller.js');
    expect(typeof controller.getStatus).toBe('function');
  });
});

describe('Tasks Controller', () => {
  it('should export list function', async () => {
    const controller = await import('../../controllers/tasks.controller.js');
    expect(typeof controller.list).toBe('function');
  });

  it('should export updateProgress function', async () => {
    const controller = await import('../../controllers/tasks.controller.js');
    expect(typeof controller.updateProgress).toBe('function');
  });

  it('should export getById function', async () => {
    const controller = await import('../../controllers/tasks.controller.js');
    expect(typeof controller.getById).toBe('function');
  });

  it('should export complete function', async () => {
    const controller = await import('../../controllers/tasks.controller.js');
    expect(typeof controller.complete).toBe('function');
  });
});
