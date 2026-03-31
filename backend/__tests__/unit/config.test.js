import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We'll test the config module functions directly
// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Mock the paths module
vi.mock('../../lib/paths.js', () => ({
  resolvePath: p => p.replace('~', '/home/user'),
  getOpenClawHome: () => '/home/user/.openclaw',
  isOpenClawEnvironment: () => false,
}));

// Import after mocking
import fs from 'fs';
import {
  getNestedValue,
  setNestedValue,
  deepMerge,
  validateConfig,
  DEFAULT_CONFIG,
} from '../../lib/config.js';

describe('Config Module', () => {
  describe('getNestedValue', () => {
    it('should get nested values using dot notation', () => {
      const obj = { server: { port: 3001 } };
      expect(getNestedValue(obj, 'server.port')).toBe(3001);
    });

    it('should return default value for missing paths', () => {
      const obj = { server: {} };
      expect(getNestedValue(obj, 'server.port', 8080)).toBe(8080);
    });

    it('should handle null/undefined objects', () => {
      expect(getNestedValue(null, 'server.port', 'default')).toBe('default');
      expect(getNestedValue(undefined, 'server.port', 'default')).toBe('default');
    });

    it('should return undefined for empty path', () => {
      const obj = { server: { port: 3001 } };
      // Empty path results in undefined as there's no empty key
      expect(getNestedValue(obj, '')).toBeUndefined();
    });
  });

  describe('setNestedValue', () => {
    it('should set nested values using dot notation', () => {
      const obj = { server: {} };
      setNestedValue(obj, 'server.port', 3001);
      expect(obj.server.port).toBe(3001);
    });

    it('should create intermediate objects if missing', () => {
      const obj = {};
      setNestedValue(obj, 'server.port', 3001);
      expect(obj.server.port).toBe(3001);
    });

    it('should override existing values', () => {
      const obj = { server: { port: 3001 } };
      setNestedValue(obj, 'server.port', 8080);
      expect(obj.server.port).toBe(8080);
    });
  });

  describe('deepMerge', () => {
    it('should merge nested objects', () => {
      const target = { server: { port: 3001, host: 'localhost' } };
      const source = { server: { port: 8080 } };
      const result = deepMerge(target, source);
      expect(result.server.port).toBe(8080);
      expect(result.server.host).toBe('localhost');
    });

    it('should not mutate the target object', () => {
      const target = { server: { port: 3001 } };
      const source = { server: { port: 8080 } };
      deepMerge(target, source);
      expect(target.server.port).toBe(3001);
    });

    it('should add new properties from source', () => {
      const target = { server: { port: 3001 } };
      const source = { server: { host: 'example.com' }, logging: { level: 'debug' } };
      const result = deepMerge(target, source);
      expect(result.server.host).toBe('example.com');
      expect(result.logging.level).toBe('debug');
    });
  });

  describe('ENV_MAPPINGS', () => {
    it('should have mappings for environment variables', async () => {
      const { ENV_MAPPINGS } = await import('../../lib/config.js');
      expect(ENV_MAPPINGS).toBeDefined();
      expect(ENV_MAPPINGS.PM_DASHBOARD_PORT).toBeDefined();
      expect(ENV_MAPPINGS.PM_DASHBOARD_PORT.type).toBe('number');
    });
  });

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const config = {
        server: { port: 3001 },
        sync: { intervalMs: 30000 },
        logging: { level: 'info' },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch invalid port numbers', () => {
      const config = {
        server: { port: 99999 },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid server port: 99999');
    });

    it('should catch invalid sync interval', () => {
      const config = {
        sync: { intervalMs: 100 },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid sync interval'))).toBe(true);
    });

    it('should catch invalid logging level', () => {
      const config = {
        logging: { level: 'invalid' },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid logging level: invalid');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have required configuration sections', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('server');
      expect(DEFAULT_CONFIG).toHaveProperty('frontend');
      expect(DEFAULT_CONFIG).toHaveProperty('paths');
      expect(DEFAULT_CONFIG).toHaveProperty('sync');
      expect(DEFAULT_CONFIG).toHaveProperty('watcher');
      expect(DEFAULT_CONFIG).toHaveProperty('logging');
    });

    it('should have correct default port', () => {
      expect(DEFAULT_CONFIG.server.port).toBe(3001);
    });

    it('should have correct default sync interval', () => {
      expect(DEFAULT_CONFIG.sync.intervalMs).toBe(30000);
    });
  });
});
