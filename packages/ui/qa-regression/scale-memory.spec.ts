import { expect, test, type Page } from '@playwright/test'

// Chromium-only heap soak for data components. Firefox does not expose
// performance.memory; render/DOM assertions remain in scale-perf.spec.ts.

async function forceGC(page: Page): Promise<void> {
  try {
    const session = await page.context().newCDPSession(page)
    try {
      await session.send('HeapProfiler.collectGarbage')
      await session.send('HeapProfiler.collectGarbage')
    } finally {
      await session.detach()
    }
  } catch {
    // Best effort; a browser build may not expose the CDP domain.
  }
}

async function heapMedian(page: Page): Promise<number> {
  const values: number[] = []
  for (let i = 0; i < 3; i++) {
    values.push(
      await page.evaluate(
        () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory!.usedJSHeapSize,
      ),
    )
    await page.waitForTimeout(80)
  }
  values.sort((a, b) => a - b)
  return values[1]!
}

test.describe('数据组件内存 soak', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'performance.memory 仅 Chromium 提供')

  test('list/tree/kanban/scheduler 反复挂载卸载：强制 GC 后堆不持续增长', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })

    await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () => ['oas-list', 'oas-tree', 'oas-kanban', 'oas-scheduler'].every((t) => customElements.get(t) != null),
      null,
      { timeout: 15000 },
    )
    await forceGC(page)
    const before = await heapMedian(page)

    await page.evaluate(async () => {
      const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
      for (let i = 0; i < 8; i++) {
        const list = document.createElement('oas-list') as HTMLElement & { data: unknown }
        list.setAttribute('height', '160')
        list.setAttribute('row-height', '32')
        list.data = Array.from({ length: 80 }, (_, n) => ({ title: 'l' + n }))
        document.body.append(list)
        list.remove()

        const tree = document.createElement('oas-tree') as HTMLElement & { data: unknown }
        tree.setAttribute('height', '160')
        tree.setAttribute('row-height', '32')
        tree.data = Array.from({ length: 80 }, (_, n) => ({ key: 'k' + n, label: 't' + n }))
        document.body.append(tree)
        tree.remove()

        const kanban = document.createElement('oas-kanban') as HTMLElement & { columns: unknown; cards: unknown }
        kanban.setAttribute('height', '200')
        kanban.columns = [
          { key: 'a', title: 'A' },
          { key: 'b', title: 'B' },
        ]
        kanban.cards = Array.from({ length: 60 }, (_, n) => ({ id: 'c' + n, column: n % 2 ? 'a' : 'b', title: 'card' }))
        document.body.append(kanban)
        kanban.remove()

        const scheduler = document.createElement('oas-scheduler') as HTMLElement & { events: unknown }
        scheduler.setAttribute('view', 'month')
        scheduler.setAttribute('page-show-date', '2026-08-10')
        scheduler.events = Array.from({ length: 40 }, (_, n) => ({
          date: '2026-08-' + String(1 + (n % 28)).padStart(2, '0'),
          title: 'e' + n,
        }))
        document.body.append(scheduler)
        scheduler.remove()
        await raf()
      }
    })

    await forceGC(page)
    const after = await heapMedian(page)
    const growth = after - before
    console.log(
      `[scale-memory] before=${before} after=${after} growth=${growth} (${((growth / before) * 100).toFixed(2)}%)`,
    )

    expect(growth, '反复挂载卸载后堆增长应受控（<30%）').toBeLessThan(before * 0.3)
    expect(errors).toEqual([])
  })
})
