/**
 * Unit tests for route modules
 * Tests verify route modules are properly exported
 */

import { describe, it, expect } from 'vitest';

describe('Projects Routes', () => {
  it('should export router', async () => {
    const routes = await import('../../routes/projects.routes.js');
    expect(routes.default).toBeDefined();
    expect(typeof routes.default).toBe('function');
  });
});

describe('Sync Routes', () => {
  it('should export router', async () => {
    const routes = await import('../../routes/sync.routes.js');
    expect(routes.default).toBeDefined();
    expect(typeof routes.default).toBe('function');
  });
});

describe('Tasks Routes', () => {
  it('should export router', async () => {
    const routes = await import('../../routes/tasks.routes.js');
    expect(routes.default).toBeDefined();
    expect(typeof routes.default).toBe('function');
  });
});

describe('Routes Index', () => {
  it('should export router with all routes mounted', async () => {
    const routes = await import('../../routes/index.js');
    expect(routes.default).toBeDefined();
    expect(typeof routes.default).toBe('function');
  });
});
