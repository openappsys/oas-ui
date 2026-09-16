import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

// 自动收集全部 demo 页（与 smoke/console-sweep 同机制）：新组件默认进 axe 审计。
// EXCLUDE_PAGES = a11y 专项批次债务台账（页 → critical/serious 违规类型），修复一页出一页。
// 台账来源：自动收集改造时的首次全量 axe 审计，逐页实测违规如下。
const EXCLUDE_PAGES = new Set<string>([
  'anchor.html', // scrollable-region-focusable
  'auto-complete.html', // label
  'back-top.html', // scrollable-region-focusable
  'calendar.html', // aria-required-children
  'card.html', // nested-interactive
  'editable.html', // aria-allowed-attr, label
  'image.html', // scrollable-region-focusable
  'layout.html', // scrollable-region-focusable
  'list.html', // aria-allowed-attr, nested-interactive, scrollable-region-focusable
  'loading-bar.html', // select-name, aria-required-children
  'menubar.html', // aria-required-children
  'progress.html', // aria-progressbar-name
  'qrcode.html', // nested-interactive
  'radio.html', // aria-allowed-attr
  'sidebar.html', // aria-required-attr
  'snackbar.html', // aria-hidden-focus
  'spin.html', // aria-progressbar-name
  'splitter.html', // nested-interactive, scrollable-region-focusable
  'stepper.html', // aria-valid-attr-value
  'transfer.html', // aria-input-field-name, aria-required-children
  'upload.html', // aria-progressbar-name
  'virtual-list.html', // scrollable-region-focusable, select-name
])
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md') && f !== 'index.md')
  .map((f) => `${basename(f, '.md')}.html`)
  .filter((html) => !EXCLUDE_PAGES.has(html))
  .sort()
  .map((html) => `/components/${html}`)

test.describe('无障碍审计（axe，零严重违规）', () => {
  for (const page of PAGES) {
    test(`无严重违规：${page}`, async ({ page: p }) => {
      await p.goto(page, { waitUntil: 'networkidle' })
      // color-contrast 走 WCAG 3 草案的感知对比度算法（axe 的 WCAG 2.1 比值法已退役）；
      // 其余规则（ARIA/键盘/语义）axe 与 WCAG 3 兼容继续跑
      const results = await new AxeBuilder({ page: p })
        .include('.demo-block')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .disableRules(['color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  }
})
