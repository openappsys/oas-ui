import { test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))

for (const name of PAGES) {
  test(`视觉截图：${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 800 })
    await page.goto(`/components/${name}.html`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `test-results/visual/light-${name}.png`, fullPage: true })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `test-results/visual/dark-${name}.png`, fullPage: true })
  })
}
