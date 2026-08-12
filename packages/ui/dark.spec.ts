import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// 组件总览页（index.md）是纯目录导航、不含 demo 块（预期行为），
// 暗色冒烟只面向 demo 页，故收 PAGES 时跳过它，避免误报「无 demo 块」。
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .filter((f) => f !== 'index.md')
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
      const body = blocks.nth(i).locator('.demo-block__body')
      // toHaveCSS 自动重试，等待 background 0.2s transition 结束（固定 waitForTimeout 在 CI 高负载下会采到中间帧，如 rgb(25,25,28)）
      await expect(body, `${page} 第 ${i + 1} 个块未跟随暗色`).toHaveCSS(
        'background-color',
        'rgb(24, 24, 27)',
      )
    }
    expect(errors.filter((e) => !e.includes('Hydration'))).toEqual([])
  })
}
