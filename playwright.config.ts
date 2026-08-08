import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './packages/ui',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  workers: 10,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'pnpm --filter @oas-ui/docs run build && pnpm --filter @oas-ui/docs run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: {} }],
})
