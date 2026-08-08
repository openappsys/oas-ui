import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/components/${basename(f, '.md')}.html`)

for (const page of PAGES) {
  test(`暗色块冒烟：${page}`, async ({ page: p }) => {
    const errors: string[] = []
    p.on('pageerror', (e) => errors.push(e.message))
    await p.goto(page, { waitUntil: 'networkidle' })
    const blocks = p.locator('.demo-block')
    const n = await blocks.count()
    expect(n).toBeGreaterThan(0)
    // 全部 DemoBlock 切暗色
    for (let i = 0; i < n; i++) {
      await blocks.nth(i).locator('.demo-block__theme').click()
    }
    await p.waitForTimeout(400)
    // 每个块背景应为暗色，无未捕获异常
    for (let i = 0; i < n; i++) {
      const bg = await blocks
        .nth(i)
        .locator('.demo-block__body')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg, `${page} 第 ${i + 1} 个块未切暗色`).toBe('rgb(24, 24, 27)')
    }
    expect(errors.filter((e) => !e.includes('Hydration'))).toEqual([])
  })
}
