import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    fileParallelism: false,
    hookTimeout: 60000,
    include: ['tests/**/*.test.mjs'],
    setupFiles: ['./tests/vitest.setup.mjs'],
    testTimeout: 60000,
  },
})
