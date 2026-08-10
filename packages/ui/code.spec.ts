import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// 组件总览页（index.md）是纯目录导航、不含 demo 块（预期行为），
// 示例代码检查只面向 demo 页，故收 PAGES 时跳过它。
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .filter((f) => f !== 'index.md')
  .map((f) => `/components/${basename(f, '.md')}.html`)

for (const page of PAGES) {
  test(`示例代码展示：${page}`, async ({ page: p }) => {
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(600)
    const blocks = p.locator('.demo-block')
    const count = await blocks.count()
    for (let i = 0; i < count; i++) {
      const block = blocks.nth(i)
      await block.locator('.demo-block__toggle').click()
      const code = (await block.locator('.demo-block__code code').innerText()).trim()
      expect(code.length, `${page} 第 ${i + 1} 个 DemoBlock 示例代码为空`).toBeGreaterThan(0)
      // 图标墙块（/components/icon.html 第 4 个 DemoBlock）源码只有 <div id="icon-gallery">，
      // oas-icon 由 onMounted 动态 import 生成（纯 SVG 画廊），故按页+序精准豁免；
      // 不放宽整页断言——其余所有 demo 块仍必须含 oas-* 标签。
      const isIconWallBlock = page === '/components/icon.html' && i === 3
      if (!isIconWallBlock) {
        // 代码里应包含至少一个 oas- 组件标签
        expect(code, `${page} 第 ${i + 1} 个 DemoBlock 无组件标签`).toMatch(/oas-[a-z-]+/)
      }
    }
  })
}
