/**
 * Unit tests for middleware modules
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock console.error to avoid noise in test output
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Error Middleware', () => {
  let errorHandler, notFoundHandler;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../middleware/error.middleware.js');
    errorHandler = module.errorHandler;
    notFoundHandler = module.notFoundHandler;
  });

  describe('errorHandler', () => {
    it('should handle generic errors with 500 status', () => {
      const err = new Error('Test error');
      const req = { path: '/api/test' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
        })
      );
    });

    it('should handle errors with custom status', () => {
      const err = new Error('Not found');
      err.status = 404;
      const req = { path: '/api/test' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle JSON parsing errors with 400 status', () => {
      const err = new SyntaxError('Unexpected token');
      const req = { path: '/api/test' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid JSON in request body',
        })
      );
    });

    it('should handle entity.parse.failed errors', () => {
      const err = { type: 'entity.parse.failed', message: 'Parse error' };
      const req = { path: '/api/test' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle CORS errors with 403 status', () => {
      const err = new Error('Not allowed by CORS');
      const req = { path: '/api/test' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CORS policy violation',
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with endpoint info', () => {
      const req = { method: 'GET', path: '/api/unknown' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not found',
          message: expect.stringContaining('GET'),
        })
      );
    });
  });
});

describe('Logging Middleware', () => {
  let requestLogger;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../middleware/logging.middleware.js');
    requestLogger = module.requestLogger;
  });

  describe('requestLogger', () => {
    it('should call next after logging', () => {
      const req = { method: 'GET', path: '/api/test' };
      const res = {};
      const next = vi.fn();

      requestLogger(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should log request info', () => {
      const logSpy = vi.spyOn(console, 'log');
      const req = { method: 'POST', path: '/api/projects' };
      const res = {};
      const next = vi.fn();

      requestLogger(req, res, next);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('POST')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects')
      );
    });
  });
});

describe('CORS Middleware', () => {
  let getCorsOriginHandler, createCorsOptions;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../middleware/cors.middleware.js');
    getCorsOriginHandler = module.getCorsOriginHandler;
    createCorsOptions = module.createCorsOptions;
  });

  describe('getCorsOriginHandler', () => {
    it('should return a function', () => {
      const config = { server: { corsAllowAllInDev: true } };
      const handler = getCorsOriginHandler(config);
      expect(typeof handler).toBe('function');
    });

    it('should allow all origins in dev mode', () => {
      const config = { server: { corsAllowAllInDev: true } };
      const handler = getCorsOriginHandler(config);

      const callback = vi.fn();
      handler(null, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });

  describe('createCorsOptions', () => {
    it('should return cors options with origin handler', () => {
      const config = { server: { corsAllowAllInDev: true } };
      const options = createCorsOptions(config);

      expect(options).toHaveProperty('origin');
      expect(typeof options.origin).toBe('function');
    });
  });
});
