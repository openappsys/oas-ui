import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  '/components/button.html',
  '/components/link.html',
  '/components/divider.html',
  '/components/form.html',
  '/components/modal.html',
  '/components/menu.html',
  '/components/table.html',
  '/components/tree.html',
  '/components/tree-select.html',
  '/components/collapse.html',
  '/components/carousel.html',
  '/components/tabs.html',
  '/components/pagination.html',
]

test.describe('无障碍审计（axe，零严重违规）', () => {
  for (const page of PAGES) {
    test(`无严重违规：${page}`, async ({ page: p }) => {
      await p.goto(page, { waitUntil: 'networkidle' })
      const results = await new AxeBuilder({ page: p })
        .include('.demo-block')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      const serious = results.violations.filter((v) =>
        ['critical', 'serious'].includes(v.impact ?? ''),
      )
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  }
})
