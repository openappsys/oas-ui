import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// 组件总览页（index.md）是纯目录导航、不含 demo 块（预期行为），
// 示例代码检查只面向 demo 页，故收 PAGES 时跳过它。
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .filter((f) => f !== 'index.md')
  .map((f) => `/components/${basename(f, '.md')}.html`)

// 文件内 test 并行：每页 1 test 曾串行共享 1 个 worker；各 test 独立 page，无共享状态
test.describe.configure({ mode: 'parallel' })

for (const page of PAGES) {
  test(`示例代码展示：${page}`, async ({ page: p }) => {
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('.demo-block', { state: 'attached' })
    const blocks = p.locator('.demo-block')
    const count = await blocks.count()
    for (let i = 0; i < count; i++) {
      const block = blocks.nth(i)
      await block.locator('.demo-block__toggle').click()
      const code = block.locator('.demo-block__code code')
      // 点击后代码块异步渲染（v-show + 高亮），用自动重试等待非空，避免并行高负载下读空 flaky
      await expect(code, `${page} 第 ${i + 1} 个 DemoBlock 示例代码为空`).not.toBeEmpty()
      // 图标墙块（/components/icon.html 第 4 个 DemoBlock）源码只有 <div id="icon-gallery">，
      // oas-icon 由 onMounted 动态 import 生成（纯 SVG 画廊），故按页+序精准豁免；
      // 不放宽整页断言——其余所有 demo 块仍必须含 oas-* 标签。
      const isIconWallBlock = page === '/components/icon.html' && i === 3
      if (!isIconWallBlock) {
        // 代码里应包含至少一个 oas- 组件标签
        await expect(code, `${page} 第 ${i + 1} 个 DemoBlock 无组件标签`).toContainText(
          /oas-[a-z-]+/,
        )
      }
    }
  })
}
