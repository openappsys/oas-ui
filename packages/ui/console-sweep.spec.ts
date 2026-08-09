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

for (const page of PAGES) {
  test(`console 零告警/零报错 ${page}`, async ({ page: p }) => {
    const warns: string[] = []
    const errs: string[] = []
    p.on('console', (m) => {
      if (m.type() === 'warning') warns.push(m.text())
      if (m.type() === 'error') errs.push(m.text())
    })
    p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
    await p.goto(page, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(800)

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
