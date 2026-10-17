import { test, expect } from '@playwright/test'

// 「服务端窗口取数」指南页的可运行 demo 回归：
// 首屏分段装载、跳滚换窗且保留 scrollTop、段内小幅滚动不再发请求、console 零告警。
// 防止文档 demo 的脚本/文案随组件演进腐化（guide 页不在 components 自动收集面内）。
test('guide windowed demo：首屏装载、跳滚换窗、段内滚动零请求、console 零告警', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto('/guide/windowed-data.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-table'), undefined, { timeout: 15000 })
  await page.waitForFunction(
    () => {
      const log = document.getElementById('guide-windowed-demo-log')
      return !!log && !/等待|Waiting/.test(log.textContent || '')
    },
    undefined,
    { timeout: 15000 },
  )

  const initial = await page.evaluate(() => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const log = document.getElementById('guide-windowed-demo-log')
    return {
      ws: el.getAttribute('window-start'),
      rows: el.shadowRoot.querySelectorAll('tbody tr[part="row"]').length,
      log: log?.textContent ?? '',
    }
  })
  expect(initial.ws, '首屏窗口从 0 开始').toBe('0')
  expect(initial.rows, '首屏渲染窗口行').toBeGreaterThan(0)
  expect(initial.log, '首屏已装载一个分段（200 行）').toContain('已装载 200 行')

  const jumped = await page.evaluate(async () => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const wrap = el.shadowRoot.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 800000
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 1200))
    return {
      scrollTop: wrap.scrollTop,
      ws: el.getAttribute('window-start'),
      rows: el.shadowRoot.querySelectorAll('tbody tr[part="row"]').length,
      log: document.getElementById('guide-windowed-demo-log')?.textContent ?? '',
    }
  })
  expect(Number(jumped.ws), '跳滚后窗口换到段起点（非 0）').toBeGreaterThan(0)
  expect(jumped.scrollTop, '换窗后 scrollTop 保留（不被钳回 0）').toBeGreaterThan(700000)
  expect(jumped.rows, '换窗后仍渲染窗口行').toBeGreaterThan(0)
  expect(jumped.log, '段取数一次装载两段（400 行）').toContain('已装载 400 行')

  const sameSegment = await page.evaluate(async () => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const wrap = el.shadowRoot.querySelector('.table-scroll') as HTMLElement
    const log = document.getElementById('guide-windowed-demo-log') as HTMLElement
    const reqCount = () => Number(/请求\s*(\d+)\s*次/.exec(log.textContent || '')?.[1] ?? -1)
    const before = reqCount()
    wrap.scrollTop += 400
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 500))
    return { before, after: reqCount(), log: log.textContent ?? '' }
  })
  expect(sameSegment.before, '能解析请求次数').toBeGreaterThan(0)
  expect(sameSegment.after, '段内小幅滚动不再发请求（分段覆盖多窗口）').toBe(sameSegment.before)

  expect(issues, 'console 零 error/warning').toEqual([])
})

test('guide windowed demo（en 页）：首屏装载 + console 零告警', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))
  await page.goto('/en/guide/windowed-data.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const log = document.getElementById('guide-windowed-demo-log')
      return !!log && !/Waiting/.test(log.textContent || '')
    },
    undefined,
    { timeout: 15000 },
  )
  const rows = await page.evaluate(() => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    return el.shadowRoot.querySelectorAll('tbody tr[part="row"]').length
  })
  expect(rows, 'en 页 demo 渲染窗口行').toBeGreaterThan(0)
  expect(issues, 'console 零 error/warning').toEqual([])
})
