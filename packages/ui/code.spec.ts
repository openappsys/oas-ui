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
      // 代码块异步渲染：先 fallback（`.demo-block__code > pre`），Shiki 高亮完成后换成
      // `.demo-block__code-body`（template+script 两段、各含 <code>）。用「二选一状态」的容器定位，
      // 避免命中多个 code 触发 strict mode——快 server 下高亮更快完成，旧的 `.demo-block__code code`
      // 会同时匹配 fallback 与高亮两处/多段而挂（曾误报为空）。
      const code = block.locator('.demo-block__code-body, .demo-block__code > pre')
      await expect(code, `${page} 第 ${i + 1} 个 DemoBlock 示例代码为空`).not.toBeEmpty()
      // 图标墙块源码只有 <div id="icon-wall">，oas-icon 由 onMounted 动态 import 生成
      // （纯 SVG 画廊），故按内容精准豁免（曾用序号豁免，demo 块增减后序号漂移误伤）；
      // 不放宽整页断言——其余所有 demo 块仍必须含 oas-* 标签。
      const blockHtml = await block.locator('.demo-block__body').innerHTML()
      const isIconWallBlock = blockHtml.includes('id="icon-wall"')
      if (!isIconWallBlock) {
        // 代码里应包含至少一个 oas- 组件标签
        await expect(code, `${page} 第 ${i + 1} 个 DemoBlock 无组件标签`).toContainText(/oas-[a-z-]+/)
      }
    }
  })
}
