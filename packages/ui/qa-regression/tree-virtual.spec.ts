// 万级节点客户端虚拟滚动（virtual / item-height）：结构回归。
// 结构断言为主：渲染行数有界、窗口随滚动滑移、活跃项可键盘到达、展开根节点不白屏。
// 时序只做宽下界（防回归级恶化），不写 60fps 硬断言——CI 噪声不可控。

import { test, expect } from '@playwright/test'

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  '万级虚拟滚动结构断言在 Chromium 验证（Firefox/WebKit 抽样集不含本 spec）',
)

const NODES = 10000
const HEIGHT = 360
const ITEM_HEIGHT = 32

/** 挂一棵 1 万节点的虚拟滚动树（固定定位在页面左上，避免与演示块互相遮挡影响量测） */
async function mountTenThousand(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-tree'))
  await page.evaluate(
    async ({ nodes, height, itemHeight }) => {
      const el = document.createElement('oas-tree')
      el.id = 'qa-tree-10k'
      el.setAttribute('virtual', '')
      el.setAttribute('height', String(height))
      el.setAttribute('item-height', String(itemHeight))
      el.setAttribute(
        'data',
        JSON.stringify(
          Array.from({ length: nodes }, (_, i) => ({
            key: `n${i}`,
            label: `节点 ${i}`,
            // 每 100 个根带 20 个子节点：用于「展开根节点不白屏」
            ...(i % 100 === 0
              ? {
                  children: Array.from({ length: 20 }, (_, j) => ({
                    key: `n${i}-${j}`,
                    label: `子节点 ${i}-${j}`,
                  })),
                }
              : {}),
          })),
        ),
      )
      el.style.cssText = 'position:fixed;top:0;left:0;width:360px;z-index:2147483647;background:var(--oas-color-bg);'
      document.body.appendChild(el)
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    },
    { nodes: NODES, height: HEIGHT, itemHeight: ITEM_HEIGHT },
  )
  // 就绪信号：窗口行已挂且首行有真实 label
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('#qa-tree-10k')!
        const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
        const items = [...vroot.querySelectorAll('[part="item"]')]
        return items.length > 0 && (items[0]!.querySelector('.label')?.textContent?.length ?? 0) > 0
      }),
    )
    .toBe(true)
}

test('tree virtual：1 万节点只渲染窗口行、总高按全量线性列表、首行 ARIA 全量口径', async ({ page }) => {
  await mountTenThousand(page)
  const r = await page.evaluate(() => {
    const el = document.querySelector('#qa-tree-10k')!
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    const vroot = vlist.shadowRoot!
    const items = [...vroot.querySelectorAll('[part="item"]')]
    const firstRow = items[0]!.querySelector('[part="row"]')!
    const inner = vroot.querySelector<HTMLElement>('.inner')!
    const viewport = vroot.querySelector<HTMLElement>('[part="viewport"]')!
    return {
      rows: items.length,
      labels: items.slice(0, 3).map((it) => it.querySelector('.label')?.textContent ?? ''),
      innerHeight: inner.style.height,
      viewportHeight: viewport.getBoundingClientRect().height,
      setsize: firstRow.getAttribute('aria-setsize'),
      posinset: firstRow.getAttribute('aria-posinset'),
      role: firstRow.getAttribute('role'),
      treeRole: vroot.querySelector('.items')?.getAttribute('role'),
    }
  })
  // 有界渲染：视口 12 行 + buffer 4 ≈ 16（远小于 100，也远小于 10k）
  expect(r.rows, `1 万节点实际渲染行数 ${r.rows}`).toBeLessThan(100)
  expect(r.rows).toBe(Math.ceil(HEIGHT / ITEM_HEIGHT) + 4)
  expect(r.labels[0]).toBe('节点 0')
  expect(r.innerHeight, '虚拟总高 = 全量行数 × 行高').toBe(`${NODES * ITEM_HEIGHT}px`)
  expect(r.viewportHeight, '视口高度按 height 属性').toBe(HEIGHT)
  // ARIA：行是 treeitem、容器 role=tree，setsize/posinset 按全量根节点计数
  expect(r.role).toBe('treeitem')
  expect(r.treeRole).toBe('tree')
  expect(r.setsize).toBe(String(NODES))
  expect(r.posinset).toBe('1')
})

test('tree virtual：5 次大步滚动窗口滑移、posinset 随全量序推进、活跃项 End 可键盘到达', async ({ page }) => {
  await mountTenThousand(page)
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#qa-tree-10k')!
    const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
    const vp = vroot.querySelector<HTMLElement>('[part="viewport"]')!
    const raf = (): Promise<void> =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const firstRow = (): HTMLElement => vroot.querySelector<HTMLElement>('[part="row"]')!
    const frames: Array<{ key: string; posinset: string; rows: number }> = []
    for (let i = 0; i < 5; i++) {
      vp.scrollTop += 20000
      vp.dispatchEvent(new Event('scroll'))
      await raf()
      const row = firstRow()
      frames.push({
        key: row.getAttribute('data-key') ?? '',
        posinset: row.getAttribute('aria-posinset') ?? '',
        rows: vroot.querySelectorAll('[part="item"]').length,
      })
    }
    return { frames, scrollTop: vp.scrollTop, firstKey: firstRow().getAttribute('data-key') }
  })
  const keys = r.frames.map((f) => f.key)
  // 每一大步（20000px = 625 行）都换了窗口首行：5 次互不相同且严格推进
  expect(new Set(keys).size).toBe(5)
  const idx = keys.map((k) => Number(k.replace('n', '')))
  for (let i = 1; i < idx.length; i++) expect(idx[i]!).toBeGreaterThan(idx[i - 1]!)
  // 行数在任意滚动位置都保持有界
  for (const f of r.frames) expect(f.rows).toBeLessThan(100)
  // 首行 aria-posinset = 全量拍平序（scrollTop 20000 / 32 = 625 行，减 buffer 4 → 0 基 621 → posinset 622）
  expect(r.frames[0]!.posinset).toBe('622')
  expect(r.frames[0]!.key).toBe('n621')

  // 活跃项键盘到达：滚动后窗口首行以外，按 End 直达 1 万行末尾（真实键盘事件）
  await page.evaluate(() => {
    const el = document.querySelector('#qa-tree-10k')!
    const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
    const row = vroot.querySelector<HTMLElement>('[part="row"]')!
    row.focus()
  })
  await page.keyboard.press('End')
  // 跨窗口聚焦是「先滚入窗口 → 下一帧聚焦」两段：等真正聚焦到末行（而不是只等 tabIndex 落位）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('#qa-tree-10k')!
        const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
        return vroot.activeElement?.getAttribute('data-key') ?? null
      }),
    )
    .toBe('n9999')
  const active = await page.evaluate(() => {
    const el = document.querySelector('#qa-tree-10k')!
    const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
    const last = vroot.activeElement as HTMLElement | null
    return {
      text: last?.querySelector('.label')?.textContent ?? '',
      posinset: last?.getAttribute('aria-posinset'),
      tabIndex: last?.tabIndex,
    }
  })
  expect(active.text).toBe('节点 9999')
  expect(active.posinset, '末行全量 posinset').toBe(String(NODES))
  expect(active.tabIndex, '末行成为 roving 焦点（tabindex 0）').toBe(0)
})

test('tree virtual：滚动中展开根节点不白屏（窗口重算、子行出现、首行保留）', async ({ page }) => {
  await mountTenThousand(page)
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#qa-tree-10k')!
    const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
    const vp = vroot.querySelector<HTMLElement>('[part="viewport"]')!
    const raf = (): Promise<void> =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    // 滚到中段再滚回顶部，覆盖「滚动后窗口重算」路径
    vp.scrollTop = 12000
    vp.dispatchEvent(new Event('scroll'))
    await raf()
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
    await raf()
    const before = vroot.querySelectorAll('[part="item"]').length
    const row = vroot.querySelector<HTMLElement>('[part="row"]')!
    const toggle = row.querySelector<HTMLElement>('[part="toggle"]')!
    toggle.click()
    await raf()
    const items = [...vroot.querySelectorAll<HTMLElement>('[part="item"]')]
    const child = items.find((it) => it.querySelector('[data-key="n0-0"]'))
    return {
      expanded: el.getAttribute('expanded'),
      before,
      after: items.length,
      firstKey: items[0]?.querySelector('[part="row"]')?.getAttribute('data-key') ?? '',
      firstLabel: items[0]?.querySelector('.label')?.textContent ?? '',
      childLabel: child?.querySelector('.label')?.textContent ?? '',
      childLevel: child?.querySelector('[part="row"]')?.getAttribute('aria-level'),
      scrollTop: vp.scrollTop,
    }
  })
  expect(r.expanded, '展开状态写回 expanded 属性').toBe('["n0"]')
  // 展开子级后窗口行数仍等于视口容量（子行顶替后续根行进入窗口），且首行保留 = 不白屏
  expect(r.after, '展开后仍渲染与视口容量一致的窗口行（不白屏）').toBe(Math.ceil(HEIGHT / ITEM_HEIGHT) + 4)
  expect(r.after).toBeGreaterThanOrEqual(r.before)
  expect(r.firstKey, '首行仍是根节点 n0').toBe('n0')
  expect(r.firstLabel, '首行文字非空（不白屏）').toMatch(/\S/)
  expect(r.childLabel, '展开的子节点行进入窗口且有真实文字').toBe('子节点 0-0')
  expect(r.childLevel, '子行 ARIA 层级').toBe('2')
  expect(r.scrollTop, '展开不把滚动位置钳回 0 之外（回顶后保持 0）').toBe(0)
})

test('tree virtual：快速滚动时序宽下界（10 次滚动派发与重渲染 < 5s）', async ({ page }) => {
  await mountTenThousand(page)
  const elapsed = await page.evaluate(async () => {
    const el = document.querySelector('#qa-tree-10k')!
    const vroot = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!
    const vp = vroot.querySelector<HTMLElement>('[part="viewport"]')!
    const raf = (): Promise<void> =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const t0 = performance.now()
    for (let i = 0; i < 10; i++) {
      vp.scrollTop += 3200
      vp.dispatchEvent(new Event('scroll'))
      await raf()
    }
    return performance.now() - t0
  })
  // 防回归级恶化（不是 60fps 断言）：10 次滚动 + 窗口重渲染若超过 5s 说明出现数量级退化
  expect(elapsed, `10 次快速滚动总耗时 ${elapsed.toFixed(0)}ms`).toBeLessThan(5000)
})
