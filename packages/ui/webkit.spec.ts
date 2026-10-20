import { test, expect } from '@playwright/test'

// WebKit 抽样：覆盖基础控件、表单、数据表、甘特、日程、资源、图表七类代表页。
// 目的不是复制 Chromium 全量，而是尽早暴露 WebKit 的布局/浮层/虚拟滚动差异。
const PAGES = [
  { path: '/components/button.html', tag: 'oas-button' },
  { path: '/components/form.html', tag: 'oas-form' },
  { path: '/components/table.html', tag: 'oas-table' },
  { path: '/components/gantt.html', tag: 'oas-gantt' },
  { path: '/components/scheduler.html', tag: 'oas-scheduler' },
  { path: '/components/resource.html', tag: 'oas-resource' },
  { path: '/components/chart.html', tag: 'oas-chart' },
  { path: '/components/prompt-input.html', tag: 'oas-prompt-input' },
]

for (const pageCase of PAGES) {
  test(`webkit smoke: ${pageCase.path}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.goto(pageCase.path, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      (tag) => {
        const el = document.querySelector(tag) as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
        return !!el?.shadowRoot
      },
      pageCase.tag,
      { timeout: 15000 },
    )
    await expect(page.locator(pageCase.tag).first()).toBeVisible()
    await page.waitForTimeout(250)
    expect(errors, `WebKit console/pageerror: ${pageCase.path}`).toEqual([])
  })
}

test('webkit interaction: prompt-input 键盘提交', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/prompt-input.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-prompt-input') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
    return !!el?.shadowRoot?.querySelector('[part="textarea"]')
  })
  const textarea = page.locator('#prompt-input-basic [part="textarea"]')
  await textarea.fill('WebKit 键盘提交')
  await textarea.press('Enter')
  await expect(page.locator('#prompt-input-output')).toContainText('已提交：WebKit 键盘提交')
  await expect(textarea).toHaveValue('')
  expect(errors, 'WebKit prompt-input 交互 console/pageerror').toEqual([])
})
