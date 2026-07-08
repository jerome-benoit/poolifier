import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // CJS files are generated from the same sources as ESM files and are
      // smoke-tested by CJS import tests; coverage tracks the ESM build only.
      include: ['lib/**/*.mjs'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    fileParallelism: false,
    hookTimeout: 240000,
    include: ['tests/**/*.test.mjs'],
    pool: 'forks',
    retry: 2,
    setupFiles: ['./tests/vitest.setup.mjs'],
    testTimeout: 240000,
  },
})
