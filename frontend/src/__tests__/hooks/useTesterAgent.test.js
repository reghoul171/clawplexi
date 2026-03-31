/**
 * Tests for useTesterAgent hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock API_URL
vi.mock('../../config/api', () => ({
  API_URL: 'http://localhost:3001',
}));

describe('useTesterAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export useTesterAgent function', async () => {
    const module = await import('../../hooks/useTesterAgent.js');
    expect(typeof module.useTesterAgent).toBe('function');
  });

  it('should return hook state and actions', async () => {
    const { useTesterAgent } = await import('../../hooks/useTesterAgent.js');

    const { result } = renderHook(() => useTesterAgent());

    // Check that hook returns expected properties
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('createTests');
    expect(result.current).toHaveProperty('runTests');
    expect(result.current).toHaveProperty('generateReport');
    expect(result.current).toHaveProperty('error');
  });

  it('should initialize with correct default state', async () => {
    const { useTesterAgent } = await import('../../hooks/useTesterAgent.js');

    const { result } = renderHook(() => useTesterAgent());

    expect(result.current.loading).toEqual({
      createTests: false,
      runTests: false,
      generateReport: false,
    });
    expect(result.current.error).toBeNull();
  });

  it('should provide action functions', async () => {
    const { useTesterAgent } = await import('../../hooks/useTesterAgent.js');

    const { result } = renderHook(() => useTesterAgent());

    expect(typeof result.current.createTests).toBe('function');
    expect(typeof result.current.runTests).toBe('function');
    expect(typeof result.current.generateReport).toBe('function');
  });
});
