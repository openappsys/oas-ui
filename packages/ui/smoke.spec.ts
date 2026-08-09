import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/components/${basename(f, '.md')}.html`)

for (const page of PAGES) {
  test(`demo 冒烟：${page}`, async ({ page: p }) => {
    const errors: string[] = []
    p.on('pageerror', (e) => errors.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(600)
    const blocks = p.locator('.demo-block')
    const count = await blocks.count()
    expect(count).toBeGreaterThan(0)
    // 每个 DemoBlock 的 body 应有至少一个可渲染元素
    for (let i = 0; i < count; i++) {
      const body = blocks.nth(i).locator('.demo-block__body')
      await expect(body.locator('*').first()).toBeAttached()
    }
    // 允许少数控制台报错（如 demo 故意触发、外部资源 CDN 不可达），但禁止未捕获异常
    const filtered = errors.filter(
      (e) =>
        !e.includes('404') &&
        !e.includes('Hydration completed') &&
        !e.includes('net::ERR_') && // 外部资源（picsum 等 CDN）网络/DNS 失败，非组件问题
        !e.includes('Failed to load resource'),
    )
    expect(filtered).toEqual([])
  })
}
