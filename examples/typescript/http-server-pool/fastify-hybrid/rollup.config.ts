import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import del from 'rollup-plugin-delete'

export default defineConfig({
  external: ['fastify', 'fastify-plugin', /^node:*/, 'poolifier'],
  input: [
    './src/main.ts',
    './src/fastify-worker.ts',
    './src/request-handler-worker.ts',
  ],
  output: [
    {
      chunkFileNames: '[name]-[hash].cjs',
      dir: './dist',
      entryFileNames: '[name].cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      dir: './dist',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript(),
    del({
      targets: ['./dist/*'],
    }),
  ],
  strictDeprecations: true,
})
