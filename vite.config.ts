import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@oas-ui/ui': resolve(import.meta.dirname, 'packages/ui/src/index.ts'),
      '@oas-ui/core': resolve(import.meta.dirname, 'packages/core/src/index.ts'),
      '@oas-ui/theme': resolve(import.meta.dirname, 'packages/theme/src/index.css'),
    },
  },
})
