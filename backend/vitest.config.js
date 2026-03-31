import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['__tests__/**', 'bin/**'],
      target: 70,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./__tests__/setup.js'],
  },
});
