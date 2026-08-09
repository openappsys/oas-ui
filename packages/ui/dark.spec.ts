import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/components/${basename(f, '.md')}.html`)

for (const page of PAGES) {
  test(`全局暗色冒烟：${page}`, async ({ page: p }) => {
    const errors: string[] = []
    p.on('pageerror', (e) => errors.push(e.message))
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    // 切换全局暗色
    await p.evaluate(() => document.documentElement.classList.add('dark'))
    await p.waitForTimeout(300)
    const blocks = p.locator('.demo-block')
    const n = await blocks.count()
    expect(n).toBeGreaterThan(0)
    // 每个块背景应为暗色，无未捕获异常
    for (let i = 0; i < n; i++) {
      const bg = await blocks
        .nth(i)
        .locator('.demo-block__body')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg, `${page} 第 ${i + 1} 个块未跟随暗色`).toBe('rgb(24, 24, 27)')
    }
    expect(errors.filter((e) => !e.includes('Hydration'))).toEqual([])
  })
}
