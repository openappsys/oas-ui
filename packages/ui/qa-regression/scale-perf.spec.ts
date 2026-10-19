import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Real-browser scale/performance/lifecycle regression.
// Thresholds are intentionally generous (headless CI / hardware variance), but
// they catch full-table rendering, per-scroll rect scans, and SPA listener leaks.

function collectErrors(page: Page): string[] {
  const out: string[] = []
  page.on('pageerror', (e) => out.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /^\[oas-/.test(m.text()))) {
      out.push(`${m.type()}: ${m.text()}`)
    }
  })
  return out
}

function p95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!
}

test('table 10万行：真实浏览器首渲染、滚动帧与 DOM 上界', async ({ page, browserName }) => {
  const errors = collectErrors(page)
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })

  const result = await page.evaluate(async () => {
    const ROWS = 100_000
    const COLS = 6
    const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
    const raf2 = async (): Promise<void> => {
      await raf()
      await raf()
    }
    const el = document.createElement('oas-table') as HTMLElement & {
      columns: unknown
      data: unknown
      shadowRoot: ShadowRoot
    }
    el.id = 'qa-scale-perf-table'
    el.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px'
    el.setAttribute('height', '320')
    el.setAttribute('row-height', '36')
    document.body.append(el)

    const columns = Array.from({ length: COLS }, (_, i) => ({
      key: `c${i}`,
      title: `C${i}`,
      width: 120,
    }))
    const data = Array.from({ length: ROWS }, (_, r) =>
      Object.fromEntries(Array.from({ length: COLS }, (_, c) => [`c${c}`, `r${r}c${c}`])),
    )

    const t0 = performance.now()
    el.columns = columns
    el.data = data
    for (let i = 0; i < 120; i++) {
      await raf()
      if (el.shadowRoot.querySelectorAll('tbody tr').length > 0) break
    }
    const buildMs = performance.now() - t0

    const sr = el.shadowRoot
    const scroll = sr.querySelector<HTMLElement>('.table-scroll')!
    const rowCount = (): number => sr.querySelectorAll('tbody tr').length
    const beforeRows = rowCount()
    const maxScroll = Math.max(0, scroll.scrollHeight - scroll.clientHeight)
    const frames: number[] = []
    for (let i = 1; i <= 20; i++) {
      const start = performance.now()
      scroll.scrollTop = (maxScroll * i) / 20
      await raf()
      frames.push(performance.now() - start)
    }
    await raf2()
    const afterRows = rowCount()
    const out = { buildMs, beforeRows, afterRows, maxScroll, frames, shadowNodes: sr.querySelectorAll('*').length }
    el.remove()
    return out
  })

  const isFirefox = browserName === 'firefox'
  const buildBudget = isFirefox ? 15_000 : 8_000
  const frameBudget = isFirefox ? 250 : 120
  const frameP95 = p95(result.frames)
  console.log(
    `[scale-perf] table 100k build=${result.buildMs.toFixed(0)}ms p95=${frameP95.toFixed(1)}ms rows=${result.beforeRows}/${result.afterRows} nodes=${result.shadowNodes}`,
  )

  expect(result.buildMs, '100k 行首渲染不得退化为全量长任务').toBeLessThan(buildBudget)
  expect(result.beforeRows, '初始只能渲染可视窗口行').toBeLessThan(200)
  expect(result.afterRows, '滚动后仍只能渲染可视窗口行').toBeLessThan(200)
  expect(frameP95, '滚动帧 p95 超预算').toBeLessThan(frameBudget)
  expect(errors, 'console/page error').toEqual([])
})

test('message-scroller 500 行 track-visible：IO 驱动 data-visible + 滚动帧预算', async ({ page, browserName }) => {
  const errors = collectErrors(page)
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-message-scroller') != null, null, { timeout: 15000 })

  const result = await page.evaluate(async () => {
    const ROWS = 500
    const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
    const el = document.createElement('oas-message-scroller') as HTMLElement & {
      visibleMessageIds: string[]
      currentAnchorId: string | null
      shadowRoot: ShadowRoot
    }
    el.id = 'qa-scale-perf-msc'
    el.style.cssText = 'position:fixed;left:-10000px;top:0;width:400px;height:300px'
    el.setAttribute('track-visible', '')
    el.setAttribute('default-position', 'start')
    for (let i = 0; i < ROWS; i++) {
      const row = document.createElement('div')
      row.setAttribute('message-id', `m${i}`)
      row.textContent = `message ${i}`
      row.style.cssText = 'height:28px;box-sizing:border-box'
      el.append(row)
    }
    let events = 0
    el.addEventListener('oas-visible-change', () => events++)
    document.body.append(el)

    const vp = el.shadowRoot.querySelector<HTMLElement>('.viewport')!
    for (let i = 0; i < 60; i++) {
      await raf()
      if (el.querySelectorAll('[message-id][data-visible]').length > 0) break
    }
    const initialVisible = el.querySelectorAll('[message-id][data-visible]').length
    const maxScroll = Math.max(0, vp.scrollHeight - vp.clientHeight)
    const frames: number[] = []
    for (let i = 1; i <= 20; i++) {
      const start = performance.now()
      vp.scrollTop = (maxScroll * i) / 20
      vp.dispatchEvent(new Event('scroll'))
      await raf()
      frames.push(performance.now() - start)
    }
    await raf()
    await raf()
    const out = {
      initialVisible,
      afterVisible: el.querySelectorAll('[message-id][data-visible]').length,
      visibleIds: el.visibleMessageIds.length,
      anchor: el.currentAnchorId,
      events,
      frames,
      total: el.querySelectorAll('[message-id]').length,
    }
    el.remove()
    return out
  })

  const isFirefox = browserName === 'firefox'
  const frameP95 = p95(result.frames)
  console.log(
    `[scale-perf] message-scroller 500 rows visible=${result.initialVisible}/${result.afterVisible} ids=${result.visibleIds} events=${result.events} p95=${frameP95.toFixed(1)}ms`,
  )

  expect(result.initialVisible, 'IO 初始应标记可见消息').toBeGreaterThan(0)
  expect(result.afterVisible, '滚动后仍应有可见消息').toBeGreaterThan(0)
  expect(result.afterVisible, '可见消息数不得退化为全量').toBeLessThan(result.total)
  expect(result.visibleIds, 'visibleMessageIds 应可从 IO 快照读取').toBeGreaterThan(0)
  expect(result.events, '滚动跨越可见边界应派发 oas-visible-change').toBeGreaterThan(0)
  expect(frameP95, 'track-visible 滚动帧 p95 超预算').toBeLessThan(isFirefox ? 120 : 80)
  expect(errors, 'console/page error').toEqual([])
})

test('overlay SPA 重挂：document/window 监听净增长为 0', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { adds: 0, removes: 0, byType: {} as Record<string, number> }
    const wrap = (target: EventTarget): void => {
      const add = target.addEventListener.bind(target)
      const remove = target.removeEventListener.bind(target)
      target.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        opts?: AddEventListenerOptions,
      ) => {
        state.adds++
        state.byType[type] = (state.byType[type] ?? 0) + 1
        return add(type, listener, opts)
      }) as typeof target.addEventListener
      target.removeEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        opts?: EventListenerOptions,
      ) => {
        state.removes++
        state.byType[type] = (state.byType[type] ?? 0) - 1
        return remove(type, listener, opts)
      }) as typeof target.removeEventListener
    }
    wrap(document)
    wrap(window)
    ;(window as unknown as { __oasListenerStats: typeof state }).__oasListenerStats = state
  })

  const errors = collectErrors(page)
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => ['oas-tooltip', 'oas-dropdown', 'oas-hover-card'].every((t) => customElements.get(t) != null),
    null,
    { timeout: 15000 },
  )

  const readStats = () =>
    page.evaluate(
      () =>
        (window as unknown as { __oasListenerStats: { adds: number; removes: number; byType: Record<string, number> } })
          .__oasListenerStats,
    )
  const before = await readStats()

  await page.evaluate(async () => {
    const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
    for (let i = 0; i < 20; i++) {
      const tooltip = document.createElement('oas-tooltip')
      tooltip.setAttribute('content', 'tip')
      tooltip.setAttribute('open', '')
      const tipAnchor = document.createElement('button')
      tipAnchor.textContent = 'tip'
      tooltip.append(tipAnchor)
      document.body.append(tooltip)

      const dropdown = document.createElement('oas-dropdown')
      dropdown.setAttribute('items', JSON.stringify([{ label: 'A', value: 'a' }]))
      dropdown.setAttribute('open', '')
      const ddAnchor = document.createElement('button')
      ddAnchor.textContent = 'menu'
      dropdown.append(ddAnchor)
      document.body.append(dropdown)

      const card = document.createElement('oas-hover-card')
      card.setAttribute('title', 'card')
      card.setAttribute('content', 'body')
      card.setAttribute('open', '')
      const cardAnchor = document.createElement('button')
      cardAnchor.textContent = 'card'
      card.append(cardAnchor)
      document.body.append(card)

      await raf()
      tooltip.remove()
      dropdown.remove()
      card.remove()
      await raf()
    }
  })

  const after = await readStats()
  console.log('[scale-perf] listener stats', { before, after })
  expect(after.adds - before.adds, '重挂后新增监听应被 remove 抵消').toBeLessThanOrEqual(after.removes - before.removes)
  // 页面级懒加载会带来少量无关事件；只盯 overlay 泄漏相关类型，且允许 1 次页面噪声。
  const leakProne = [
    'keydown',
    'pointerdown',
    'pointerup',
    'click',
    'scroll',
    'resize',
    'contextmenu',
    'focusin',
    'focusout',
  ]
  const unexpected = leakProne.filter((type) => (after.byType[type] ?? 0) - (before.byType[type] ?? 0) > 1)
  expect(unexpected, `overlay 重挂后监听净增长：${unexpected.join(', ')}`).toEqual([])
  expect(errors, 'console/page error').toEqual([])
})
