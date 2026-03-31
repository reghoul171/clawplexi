import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('API Config', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.window = originalWindow;
  });

  describe('getApiUrl', () => {
    it('should return VITE_API_URL if set', async () => {
      vi.stubEnv('VITE_API_URL', 'https://custom-api.example.com');
      
      const { API_URL } = await import('../../config/api.js');
      
      expect(API_URL).toBe('https://custom-api.example.com');
    });

    it('should return window.location.origin in browser', async () => {
      vi.stubEnv('VITE_API_URL', undefined);
      global.window = {
        location: { origin: 'https://ngrok.example.com' }
      };

      const { API_URL } = await import('../../config/api.js');
      
      expect(API_URL).toBe('https://ngrok.example.com');
    });

    it('should fallback to localhost:3001 when no window', async () => {
      vi.stubEnv('VITE_API_URL', undefined);
      delete global.window;

      const { API_URL } = await import('../../config/api.js');
      
      expect(API_URL).toBe('http://localhost:3001');
    });
  });

  describe('API_URL export', () => {
    it('should be a string', async () => {
      const { API_URL } = await import('../../config/api.js');
      expect(typeof API_URL).toBe('string');
    });

    it('should be a valid URL', async () => {
      const { API_URL } = await import('../../config/api.js');
      expect(() => new URL(API_URL)).not.toThrow();
    });
  });
});
