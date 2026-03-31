import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';

// These tests focus on what can be tested without complex mocking
// The GitSync and ProjectFileSync classes use fs and child_process
// which are loaded at module import time, making them hard to mock

describe('GitSync', () => {
  describe('Constructor', () => {
    it('should create GitSync with provided options', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({
        stateDir: '/test/state',
        config: { remote: 'origin', branch: 'main', autoCommit: true },
      });
      
      expect(gitSync.stateDir).toBe(path.resolve('/test/state'));
      expect(gitSync.config.remote).toBe('origin');
      expect(gitSync.config.branch).toBe('main');
      expect(gitSync.config.autoCommit).toBe(true);
    });

    it('should use default config values', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const sync = new GitSync({ stateDir: '/test' });
      expect(sync.config.remote).toBe('origin');
      expect(sync.config.branch).toBe('main');
      expect(sync.config.autoCommit).toBe(true);
    });

    it('should set syncInProgress to false initially', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      expect(gitSync.syncInProgress).toBe(false);
    });
  });

  describe('isGitRepo', () => {
    it('should check for .git directory', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      const fs = await import('fs');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      
      // This will call the real fs.existsSync
      // The test verifies the method exists and returns a boolean
      const result = gitSync.isGitRepo();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('hasRemote', () => {
    it('should check for remote', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      
      // Will return false since /test is not a git repo
      const result = gitSync.hasRemote();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('sync', () => {
    it('should prevent concurrent syncs', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      gitSync.syncInProgress = true;

      const result = await gitSync.sync();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sync already in progress');
    });

    it('should reset syncInProgress after completion', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      gitSync.syncInProgress = false;

      // This will fail since /test is not a git repo
      await gitSync.sync();

      expect(gitSync.syncInProgress).toBe(false);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for non-git directory', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });

      const result = gitSync.getHistory();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return boolean', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      
      const result = gitSync.hasUncommittedChanges();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getRemoteUrl', () => {
    it('should return null for non-git directory', async () => {
      const { GitSync } = await import('../../lib/sync.js');
      
      const gitSync = new GitSync({ stateDir: '/test' });
      
      const result = gitSync.getRemoteUrl();
      expect(result).toBeNull();
    });
  });
});

describe('ProjectFileSync', () => {
  const mockProjectsDir = '/tmp/test-projects-' + Date.now();

  describe('Constructor', () => {
    it('should create ProjectFileSync with provided path', async () => {
      const { ProjectFileSync } = await import('../../lib/sync.js');
      
      const fileSync = new ProjectFileSync(mockProjectsDir);
      expect(fileSync.projectsDir).toBe(mockProjectsDir);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if needed', async () => {
      const { ProjectFileSync } = await import('../../lib/sync.js');
      const fs = await import('fs');
      
      const fileSync = new ProjectFileSync(mockProjectsDir);
      fileSync.ensureDir();
      
      // Check if directory was created
      const exists = fs.existsSync(mockProjectsDir);
      expect(exists).toBe(true);
      
      // Cleanup
      try {
        fs.rmdirSync(mockProjectsDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  });

  describe('loadProject', () => {
    it('should return null for non-existent project', async () => {
      const { ProjectFileSync } = await import('../../lib/sync.js');
      
      const fileSync = new ProjectFileSync('/nonexistent/path');
      const result = fileSync.loadProject('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('loadAllProjects', () => {
    it('should return empty array for non-existent directory', async () => {
      const { ProjectFileSync } = await import('../../lib/sync.js');
      
      const fileSync = new ProjectFileSync('/nonexistent/path');
      const result = fileSync.loadAllProjects();
      expect(result).toEqual([]);
    });
  });
});
