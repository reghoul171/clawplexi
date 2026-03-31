import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// These tests require database connection, so we'll focus on testing
// the validation logic and error handling which doesn't need mocking

// For services that use repositories, we need to test with actual database
// since Vitest's mocking doesn't work well with CommonJS modules

describe('Project Service', () => {
  describe('Validation', () => {
    it('should validate project name is not empty', async () => {
      // Import the service
      const projectService = await import('../../services/project.service.js');
      
      // Test empty name validation
      await expect(projectService.getProjectByName('')).rejects.toThrow('Project name cannot be empty');
      await expect(projectService.getProjectByName('   ')).rejects.toThrow('Project name cannot be empty');
    });

    it('should validate status values', async () => {
      const projectService = await import('../../services/project.service.js');
      const mockPaths = { projectsDir: '/test/projects' };
      
      // Test invalid status
      await expect(
        projectService.updateStepStatusByName('test', 1, 'invalid_status', mockPaths)
      ).rejects.toThrow('Invalid status');
    });

    it('should validate project name for update', async () => {
      const projectService = await import('../../services/project.service.js');
      const mockPaths = { projectsDir: '/test/projects' };
      
      await expect(
        projectService.updateStepStatusByName('', 1, 'done', mockPaths)
      ).rejects.toThrow('Project name cannot be empty');
    });
  });
});

describe('Sync Service', () => {
  describe('Constructor', () => {
    it('should create SyncService with provided config', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const mockGitSync = {
        isGitRepo: vi.fn(() => true),
        hasRemote: vi.fn(() => true),
        getStatus: vi.fn(() => ({ initialized: true, clean: true, changes: [] })),
      };

      const syncService = new SyncService(mockGitSync, { enabled: true, intervalMs: 30000 });
      
      expect(syncService.gitSync).toBe(mockGitSync);
      expect(syncService.config.enabled).toBe(true);
    });

    it('should handle null gitSync', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const service = new SyncService(null, { enabled: false });
      expect(service.gitSync).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return false when gitSync is null', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const service = new SyncService(null, {});
      expect(service.isAvailable()).toBeFalsy();
    });

    it('should return false when not a git repo', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const mockGitSync = {
        isGitRepo: vi.fn(() => false),
      };

      const service = new SyncService(mockGitSync, {});
      expect(service.isAvailable()).toBe(false);
    });

    it('should return true when git is available', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const mockGitSync = {
        isGitRepo: vi.fn(() => true),
      };

      const service = new SyncService(mockGitSync, {});
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('triggerSync', () => {
    it('should throw error when gitSync is null', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const service = new SyncService(null, { enabled: true });
      await expect(service.triggerSync()).rejects.toThrow('Git sync not initialized');
    });

    it('should throw error when not a git repo', async () => {
      const { SyncService } = await import('../../services/sync.service.js');
      
      const mockGitSync = {
        isGitRepo: vi.fn(() => false),
      };

      const service = new SyncService(mockGitSync, { enabled: true });
      await expect(service.triggerSync()).rejects.toThrow('Git sync not initialized');
    });
  });
});
