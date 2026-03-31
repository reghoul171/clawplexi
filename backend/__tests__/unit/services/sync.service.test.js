/**
 * Unit tests for Sync Service
 * Tests verify service exports and basic functionality
 */

import { describe, it, expect } from 'vitest';

describe('Sync Service', () => {
  it('should export SyncService class', async () => {
    const module = await import('../../../services/sync.service.js');
    expect(module.SyncService).toBeDefined();
    expect(typeof module.SyncService).toBe('function');
  });

  it('should have getStatus method', async () => {
    const module = await import('../../../services/sync.service.js');
    const { SyncService } = module;
    const service = new SyncService(null, { enabled: false });
    expect(typeof service.getStatus).toBe('function');
  });

  it('should have triggerSync method', async () => {
    const module = await import('../../../services/sync.service.js');
    const { SyncService } = module;
    const service = new SyncService(null, { enabled: false });
    expect(typeof service.triggerSync).toBe('function');
  });

  it('should have isAvailable method', async () => {
    const module = await import('../../../services/sync.service.js');
    const { SyncService } = module;
    const service = new SyncService(null, { enabled: false });
    expect(typeof service.isAvailable).toBe('function');
  });

  it('should return falsy for isAvailable when no gitSync', async () => {
    const module = await import('../../../services/sync.service.js');
    const { SyncService } = module;
    const service = new SyncService(null, { enabled: false });
    // isAvailable checks gitSync && gitSync.isGitRepo()
    // When gitSync is null, should return falsy
    const result = service.isAvailable();
    expect(result).toBeFalsy();
  });
});
