import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// 每页零 console 告警/报错的门禁：
// 曾经漏检的类目（Vue isCustomElement 告警、demo 全局未挂载的 ReferenceError）都靠这里兜底。
// 白名单仅放允许的无害噪音（外部资源 CDN 不可达等），新增告警一律红灯。
const WARN_ALLOW = [/net::ERR_/, /Failed to load resource/, /vite/, /hydrating/]
const ERR_ALLOW = [/net::ERR_/, /Failed to load resource/]

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/components/${basename(f, '.md')}.html`)

// 文件内 test 并行：每页 1 test 曾串行共享 1 个 worker；各 test 独立 page + 独立 console 监听
test.describe.configure({ mode: 'parallel' })

for (const page of PAGES) {
  test(`console 无警告/报错 ${page}`, async ({ page: p }) => {
    const warns: string[] = []
    const errs: string[] = []
    p.on('console', (m) => {
      if (m.type() === 'warning') warns.push(m.text())
      if (m.type() === 'error') errs.push(m.text())
    })
    p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    // PAGES 含 index.md（无 demo-block），不能用 waitForSelector 统一等待；固定短缓冲等脚本执行完
    await p.waitForTimeout(300)

    const badWarns = warns.filter((w) => !WARN_ALLOW.some((re) => re.test(w)))
    const badErrs = errs.filter((e) => !ERR_ALLOW.some((re) => re.test(e)))
    expect(
      badErrs,
      `${page} console error:\n${[...new Set(badErrs)].slice(0, 5).join('\n')}`,
    ).toEqual([])
    expect(
      badWarns,
      `${page} console warning:\n${[...new Set(badWarns)].slice(0, 5).join('\n')}`,
    ).toEqual([])
  })
}
