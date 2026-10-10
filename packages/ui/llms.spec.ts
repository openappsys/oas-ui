// 回归：llmstxt.org 产物在生产站点可从站点根访问（llms.txt / llms-full.txt / 每页 .md 镜像）。
// 背景（2026-10-10）：每页 .md 镜像曾写入 public/，与 dev 的 .md 页面路由同路径冲突致整站 404；
// 现改为构建期 buildEnd 写入 dist。本用例锁「生产可访问」+ gen --check 另锁「public 无残留」（见 scripts/llms/gen.mjs）。
import { test, expect } from '@playwright/test'

test('llms：站点根 llms.txt / llms-full.txt / 每页 .md 镜像可访问', async ({ request }) => {
  const llms = await request.get('/llms.txt')
  expect(llms.status(), '/llms.txt 可访问').toBe(200)
  expect(await llms.text(), 'llms.txt 为 llmstxt 结构').toContain('# OAS-UI')

  const full = await request.get('/llms-full.txt')
  expect(full.status(), '/llms-full.txt 可访问').toBe(200)

  const md = await request.get('/components/button.md')
  expect(md.status(), '/components/button.md 镜像可访问').toBe(200)
  expect((md.headers()['content-type'] ?? '').toLowerCase(), '镜像 content-type 为 markdown').toContain('markdown')
  expect(await md.text(), '镜像为源 markdown（H1 存在）').toContain('# ')

  const enMd = await request.get('/en/components/button.md')
  expect(enMd.status(), '/en/… .md 镜像可访问').toBe(200)
})
