import { beforeAll, afterAll, vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PM_DASHBOARD_PORT = '3002'; // Use different port for tests
  process.env.PM_DASHBOARD_STATE_FILE = ':memory:'; // In-memory SQLite for tests
});

afterAll(async () => {
  // Cleanup
});
