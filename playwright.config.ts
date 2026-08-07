import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './packages/ui',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [{ name: 'chromium', use: {} }],
})
