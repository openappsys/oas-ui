import { test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))

// 文件内 test 并行：每页 1 test 曾串行共享 1 个 worker；各 test 独立 page，截图互不影响
test.describe.configure({ mode: 'parallel' })

for (const name of PAGES) {
  test(`视觉截图：${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 800 })
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    // index 页无 demo-block，等待失败可忽略；其余页等块渲染后截图更稳
    await page.waitForSelector('.demo-block', { state: 'attached', timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    await page.screenshot({ path: `test-results/visual/light-${name}.png`, fullPage: true })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `test-results/visual/dark-${name}.png`, fullPage: true })
  })
}
