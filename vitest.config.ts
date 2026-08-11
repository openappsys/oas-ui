import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@oas-ui/core': resolve(__dirname, 'packages/core/src'),
      '@oas-ui/theme': resolve(__dirname, 'packages/theme/index.css'),
      '@oas-ui/ui': resolve(__dirname, 'packages/ui/src'),
      '@oas-ui/icons': resolve(__dirname, 'packages/icons/src'),
      '@oas-ui/i18n': resolve(__dirname, 'packages/i18n/src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.test.ts'],
    globals: true,
  },
})
