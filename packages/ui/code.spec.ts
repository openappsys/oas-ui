import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
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
      // 代码里应包含至少一个 oas- 组件标签
      expect(code, `${page} 第 ${i + 1} 个 DemoBlock 无组件标签`).toMatch(/oas-[a-z-]+/)
    }
  })
}
