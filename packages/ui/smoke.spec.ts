import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// 组件总览页（index.md）是纯目录导航、不含 demo 块（预期行为，近期新增），
// 冒烟扫描只面向 demo 页，故收 PAGES 时跳过它，避免误报「无 demo 块」。
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .filter((f) => f !== 'index.md')
  .map((f) => `/components/${basename(f, '.md')}.html`)

// 文件内 test 并行：每页 1 test 曾串行共享 1 个 worker；各 test 独立 page + 独立监听
test.describe.configure({ mode: 'parallel' })

for (const page of PAGES) {
  test(`demo 冒烟：${page}`, async ({ page: p }) => {
    const errors: string[] = []
    p.on('pageerror', (e) => errors.push(e.message))
    p.on('console', (m) => {
      // warning 也计入（如 Vue isCustomElement 未配置会刷屏，此前漏检）
      if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
    })
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('.demo-block', { state: 'attached' })
    // 缓冲等 hydration 后组件脚本执行完，console/pageerror 才能收全
    await p.waitForTimeout(300)
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
