import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'outputs/coverage',
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    fileParallelism: false,
    hookTimeout: 30000,
    include: ['tests/**/*.test.mjs'],
    sequence: {
      hooks: 'list',
    },
    testTimeout: 30000,
  },
})
