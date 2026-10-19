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

test('list / tree windowed 5 万：真实浏览器首渲染与 DOM 上界', async ({ page, browserName }) => {
  const errors = collectErrors(page)
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => customElements.get('oas-list') != null && customElements.get('oas-tree') != null,
    null,
    { timeout: 15000 },
  )

  const result = await page.evaluate(async () => {
    const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
    const raf2 = async (): Promise<void> => {
      await raf()
      await raf()
    }
    const makeList = (tag: string, rows: number, total: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag) as HTMLElement & { data?: unknown; shadowRoot: ShadowRoot }
      el.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px'
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.setAttribute('windowed', '')
      el.setAttribute('window-start', '0')
      el.setAttribute('total', total)
      el.setAttribute('height', '240')
      el.setAttribute('row-height', '32')
      el.setAttribute(
        'data',
        JSON.stringify(
          Array.from({ length: rows }, (_, i) => ({ key: 'k' + i, title: 'row ' + i, label: 'row ' + i })),
        ),
      )
      document.body.append(el)
      return el
    }
    const list = makeList('oas-list', 120, '50000', { role: 'list' })
    const tree = makeList('oas-tree', 120, '50000', {})
    const t0 = performance.now()
    for (let i = 0; i < 120; i++) {
      await raf()
      if (
        list.shadowRoot.querySelectorAll('oas-list-item').length > 0 &&
        tree.shadowRoot.querySelectorAll('[role="treeitem"]').length > 0
      )
        break
    }
    const buildMs = performance.now() - t0
    const listRows = list.shadowRoot.querySelectorAll('oas-list-item').length
    const treeVirtual = tree.shadowRoot.querySelector('oas-virtual-list') as
      | (HTMLElement & { shadowRoot: ShadowRoot })
      | null
    // tree 的行渲染在虚拟列表 shadow 内；以实际子节点数做有界性证据，避免绑死内部 class。
    const treeRows = treeVirtual
      ? treeVirtual.shadowRoot.querySelectorAll('*').length
      : tree.shadowRoot.querySelectorAll('*').length
    list.remove()
    tree.remove()
    return { buildMs, listRows, treeRows }
  })
  const budget = browserName === 'firefox' ? 15000 : 8000
  console.log('[scale-perf] list/tree windowed', result)
  expect(result.buildMs).toBeLessThan(budget)
  expect(result.listRows).toBeGreaterThan(0)
  expect(result.listRows).toBeLessThan(1000)
  expect(result.treeRows).toBeGreaterThan(0)
  expect(result.treeRows).toBeLessThan(1000)
  expect(errors).toEqual([])
})

test('kanban 3000 cards：真实浏览器首渲染与卡片 DOM 上界', async ({ page, browserName }) => {
  const errors = collectErrors(page)
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-kanban') != null, null, { timeout: 15000 })
  const result = await page.evaluate(async () => {
    const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
    const card = (i: number) => ({ id: 'c' + i, column: 'col' + (i % 5), title: 'card ' + i })
    const el = document.createElement('oas-kanban') as HTMLElement & {
      columns: unknown
      cards: unknown
      shadowRoot: ShadowRoot
    }
    el.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:320px'
    el.setAttribute('card-estimate', '60')
    document.body.append(el)
    const t0 = performance.now()
    el.columns = Array.from({ length: 5 }, (_, i) => ({ key: 'col' + i, title: 'C' + i }))
    el.cards = Array.from({ length: 3000 }, (_, i) => card(i))
    for (let i = 0; i < 120; i++) {
      await raf()
      if (el.shadowRoot.querySelectorAll('.card').length > 0) break
    }
    const buildMs = performance.now() - t0
    const cards = el.shadowRoot.querySelectorAll('.card').length
    const columns = el.shadowRoot.querySelectorAll('.column').length
    el.remove()
    return { buildMs, cards, columns }
  })
  const budget = browserName === 'firefox' ? 15000 : 8000
  console.log('[scale-perf] kanban 3000', result)
  expect(result.buildMs).toBeLessThan(budget)
  expect(result.cards).toBeGreaterThan(0)
  expect(result.cards).toBeLessThan(1500)
  expect(result.columns).toBe(5)
  expect(errors).toEqual([])
})

test('scheduler month 2000 events：真实浏览器首渲染与事件 DOM 上界', async ({ page, browserName }) => {
  const errors = collectErrors(page)
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-scheduler') != null, null, { timeout: 15000 })
  const result = await page.evaluate(async () => {
    const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
    const el = document.createElement('oas-scheduler') as HTMLElement & { events: unknown; shadowRoot: ShadowRoot }
    el.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px'
    el.setAttribute('view', 'month')
    el.setAttribute('page-show-date', '2026-08-10')
    document.body.append(el)
    const events = Array.from({ length: 2000 }, (_, i) => ({
      date: '2026-08-' + String(1 + (i % 28)).padStart(2, '0'),
      title: 'event ' + i,
    }))
    const t0 = performance.now()
    el.events = events
    for (let i = 0; i < 120; i++) {
      await raf()
      if (el.shadowRoot.querySelectorAll('.chip').length > 0) break
    }
    const buildMs = performance.now() - t0
    const chips = el.shadowRoot.querySelectorAll('.chip').length
    el.remove()
    return { buildMs, chips }
  })
  const budget = browserName === 'firefox' ? 15000 : 8000
  console.log('[scale-perf] scheduler 2000', result)
  expect(result.buildMs).toBeLessThan(budget)
  expect(result.chips).toBeGreaterThan(0)
  expect(result.chips).toBeLessThanOrEqual(2000)
  expect(errors).toEqual([])
})
