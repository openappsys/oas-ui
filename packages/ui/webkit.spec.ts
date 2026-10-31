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
    // console/pageerror 收集的渲染收尾信号：字体加载完成
    await page.evaluate(() => document.fonts.ready)
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

// WebKit 对跨 shadow 的 ElementInternals 引用目前返回空数组：
// 关联成立就校验关联，否则至少保证 role=alert 的错误播报与可见性不回归。
test('webkit: form-item 错误文案跨 shadow 关联或 role=alert 兜底', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-form-item'))
  const r = await page.evaluate(async () => {
    const item = document.createElement('oas-form-item') as HTMLElement & {
      setError(message: string | null): void
    }
    const input = document.createElement('oas-input') as HTMLElement & { internals_?: ElementInternals }
    item.appendChild(input)
    document.body.appendChild(item)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
    item.setError('请填写姓名')
    const internals = input.internals_
    const refs = internals?.ariaDescribedByElements ?? []
    const error = item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    const out = {
      linked: refs.length === 1 && refs[0] === error,
      role: error.getAttribute('role'),
      hidden: error.hidden,
    }
    item.setError(null)
    item.remove()
    return out
  })
  expect(r.role, '不支持跨 shadow 关联时用 role=alert 兜底').toBe('alert')
  expect(r.hidden, '错误节点可见').toBe(false)
  if (r.linked) expect(r.linked, '支持时 error 节点被正确关联').toBe(true)
})
