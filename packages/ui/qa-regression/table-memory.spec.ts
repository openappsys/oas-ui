// 复核回归：table 大宽表内存基线——column-virtual 渲染规模上限 + 滚动/编辑器 heap 稳定。
// 依据 docs/PRD.md「table 单元格性能专项」内存基线条目。阈值口径：
// - 节点数类：本地实测值 × 1.3（余量），实测值写在断言旁注释，后续基线漂移可调；
// - heap 类：相对基线增幅百分比（滚动 20%、编辑器 15%）。
// performance.memory 仅 Chromium 提供——本文件在非 chromium project 整体跳过。

import { expect, test, type Page } from '@playwright/test'
import { up } from './helpers'

// ==================== 采样与建表工具 ====================

/** 取 3 次 usedJSHeapSize 的中位数（Chromium 该值有 MB 级噪声，单次采样不稳） */
async function heapMedian(page: Page): Promise<number> {
  const samples: number[] = []
  for (let i = 0; i < 3; i++) {
    samples.push(
      await page.evaluate(
        () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory!.usedJSHeapSize,
      ),
    )
    await page.waitForTimeout(80)
  }
  samples.sort((a, b) => a - b)
  return samples[1]!
}

/**
 * 强制 GC：window.gc() 可用时两连发；否则走 CDP HeapProfiler.collectGarbage 两连发
 * （minor + major，单次调用可能只清新生代）；两者都不可用时用多次大数组分配制造
 * GC 压力兜底（大对象分配触发 major GC）。本文件只跑 chromium，CDP 恒可用。
 */
async function forceGC(page: Page): Promise<void> {
  const hasGc = await page.evaluate(() => typeof (window as { gc?: unknown }).gc === 'function')
  if (hasGc) {
    await page.evaluate(() => (window as { gc: () => void }).gc())
    await page.evaluate(() => (window as { gc: () => void }).gc())
    return
  }
  try {
    const session = await page.context().newCDPSession(page)
    try {
      await session.send('HeapProfiler.collectGarbage')
      await session.send('HeapProfiler.collectGarbage')
    } finally {
      await session.detach()
    }
  } catch {
    await page.evaluate(() => {
      const junk: number[][] = []
      for (let i = 0; i < 40; i++) junk.push(new Array(1 << 19).fill(0))
      if (junk.length !== 40) throw new Error('unreachable')
    })
  }
}

/** 递归统计表内全部元素节点与自定义元素（WC）实例数。口径：宿主元素 + 各层 shadowRoot 内元素 */
async function countTable(page: Page, sel: string): Promise<{ all: number; wc: number }> {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel)
    if (!host) return { all: 0, wc: 0 }
    let all = 1
    let wc = host.tagName.includes('-') ? 1 : 0
    const walk = (root: ShadowRoot): void => {
      for (const el of Array.from(root.querySelectorAll('*'))) {
        all++
        if (el.tagName.includes('-')) wc++
        if (el.shadowRoot) walk(el.shadowRoot)
      }
    }
    if (host.shadowRoot) walk(host.shadowRoot)
    return { all, wc }
  }, sel)
}

/** 60 列 × 40 行大宽表：column-virtual + height 行虚拟双开，checkable + 左右固定列 */
async function mountWideTable(page: Page): Promise<void> {
  await page.goto('/components/table.html', { waitUntil: 'load' })
  await up(page, 'oas-table')
  await page.evaluate(() => {
    const COLS = 60
    const ROWS = 40
    const columns = Array.from({ length: COLS }, (_, i) => ({
      key: `c${i}`,
      title: `列${i}`,
      width: 120,
      ...(i === 0 ? { fixed: 'left' as const } : {}),
      ...(i === COLS - 1 ? { fixed: 'right' as const } : {}),
    }))
    const data = Array.from({ length: ROWS }, (_, r) =>
      Object.fromEntries(Array.from({ length: COLS }, (_, c) => [`c${c}`, `r${r}c${c}`])),
    )
    const el = document.createElement('oas-table')
    el.id = 'qa-table-memory'
    el.setAttribute('column-virtual', '')
    el.setAttribute('height', '300')
    el.setAttribute('row-height', '36')
    el.setAttribute('checkable', '')
    document.body.append(el)
    ;(el as unknown as { columns: unknown; data: unknown }).columns = columns
    ;(el as unknown as { columns: unknown; data: unknown }).data = data
  })
  // 渲染稳定：数据行与全列总宽就位后再等一拍（懒加载资源就绪，减少采样期干扰）
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#qa-table-memory')
      if (!t?.shadowRoot) return false
      const scroll = t.shadowRoot.querySelector('.table-scroll') as HTMLElement | null
      return !!scroll && scroll.scrollWidth > 60 * 120 && t.shadowRoot.querySelectorAll('tbody td[data-col]').length > 0
    },
    null,
    { timeout: 10000 },
  )
  await page.waitForTimeout(500)
}

// ==================== 基线断言 ====================

test.describe('table 大宽表内存回归基线', () => {
  // performance.memory 仅 Chromium 提供（Firefox 无实现）——非 chromium project 整组跳过
  test.skip(({ browserName }) => browserName !== 'chromium', 'performance.memory 仅 Chromium 提供')

  test('渲染规模上限：60 列 × 40 行 column-virtual 表 DOM 节点数与 WC 实例数有界', async ({ page }) => {
    await mountWideTable(page)
    const { all, wc } = await countTable(page, '#qa-table-memory')
    // 实测基线（2026-09，chromium headless）：DOM 节点 430、WC 实例 1（当前仅宿主自身——
    // 行选择框为原生 input 实现）；阈值 = 实测 × 1.3。组件渲染结构演进（如行内改用 WC 控件）
    // 会触碰阈值，属预期基线漂移：核对增量合理后更新此处的实测注释与阈值
    expect(all, '表内 DOM 节点总数上限（实测 430 × 1.3）').toBeLessThan(560)
    expect(wc, '表内自定义元素实例数上限（实测 1 × 1.3）').toBeLessThan(1.3)
  })

  test('滚动内存稳定：20 帧交替滚动 + 强制 GC 后 heapUsed 增幅 < 基线 20%', async ({ page }) => {
    await mountWideTable(page)
    // 预热：首次滚动的路径初始化（监听绑定/窗口重建首跑）属一次性分配，不进基线
    await page.evaluate(() => {
      const scroll = document
        .querySelector('#qa-table-memory')!
        .shadowRoot!.querySelector('.table-scroll') as HTMLElement
      scroll.scrollLeft = 400
      scroll.scrollTop = 100
    })
    await page.waitForTimeout(200)
    await page.evaluate(() => {
      const scroll = document
        .querySelector('#qa-table-memory')!
        .shadowRoot!.querySelector('.table-scroll') as HTMLElement
      scroll.scrollLeft = 0
      scroll.scrollTop = 0
    })
    await page.waitForTimeout(200)
    await forceGC(page)
    const before = await countTable(page, '#qa-table-memory')
    const base = await heapMedian(page)

    // 连续 20 帧：横向/纵向交替，scrollLeft/scrollTop 递增赋值，每帧等待 rAF
    await page.evaluate(async () => {
      const scroll = document
        .querySelector('#qa-table-memory')!
        .shadowRoot!.querySelector('.table-scroll') as HTMLElement
      const raf = () => new Promise((r) => requestAnimationFrame(() => r(null)))
      for (let f = 1; f <= 20; f++) {
        if (f % 2 === 1) scroll.scrollLeft = f * 250
        else scroll.scrollTop = f * 60
        await raf()
      }
    })
    // 归零回初始视口：窗口重建应回到初始渲染规模——若滚动帧产生残留节点，归零后仍会偏高
    // （滚动停在中段时窗口含上下 overscan 行，节点数合法地多于初始对齐态，故不能在中段比对）
    await page.evaluate(() => {
      const scroll = document
        .querySelector('#qa-table-memory')!
        .shadowRoot!.querySelector('.table-scroll') as HTMLElement
      scroll.scrollLeft = 0
      scroll.scrollTop = 0
    })
    await page.waitForTimeout(300)
    await forceGC(page)
    const after = await countTable(page, '#qa-table-memory')
    const afterHeap = await heapMedian(page)
    const growth = afterHeap - base
    console.log(
      `[table-memory 基线] 滚动 heap 基线=${base} 滚动后=${afterHeap} 增幅=${growth}(${((growth / base) * 100).toFixed(2)}%) DOM 节点 ${before.all}→${after.all} WC ${before.wc}→${after.wc}`,
    )
    expect(after.all, '归零后 DOM 节点数恢复初始规模（滚动帧窗口重建不得累积残留节点）').toBeLessThanOrEqual(before.all)
    // 实测基线（2026-09，chromium headless）：强制 GC 后增幅 ≈0%（CDP full GC 完全回位）；
    // 阈值 = 增幅 < 基线 20%。若实测持续贴上限可放宽到 30% 并在此说明理由
    expect(growth, '强制 GC 后 heapUsed 增幅 < 基线 20%').toBeLessThan(base * 0.2)
  })

  test('编辑器挂载不泄漏：双击进编辑 → Esc 取消 ×20 后 heapUsed 增幅 < 基线 15%', async ({ page }) => {
    await page.goto('/components/table.html', { waitUntil: 'load' })
    await up(page, 'oas-table')
    // 小表即可：重点是编辑器（oas-input WC 实例）创建/销毁循环的留存，不需要大宽表规模
    await page.evaluate(() => {
      const el = document.createElement('oas-table')
      el.id = 'qa-table-edit-memory'
      el.setAttribute('editable', '')
      el.setAttribute('height', '240')
      el.setAttribute(
        'columns',
        JSON.stringify(
          Array.from({ length: 12 }, (_, i) => ({
            key: `c${i}`,
            title: `列${i}`,
            width: '120px',
            editable: true,
            editComponent: 'oas-input',
          })),
        ),
      )
      el.setAttribute(
        'data',
        JSON.stringify(
          Array.from({ length: 8 }, (_, r) =>
            Object.fromEntries(Array.from({ length: 12 }, (_, c) => [`c${c}`, `${r}-${c}`])),
          ),
        ),
      )
      document.body.appendChild(el)
    })
    await page.waitForFunction(
      () => {
        const t = document.querySelector('#qa-table-edit-memory')
        return !!t && !!t.shadowRoot && t.shadowRoot.querySelectorAll('tbody td[data-col]').length > 0
      },
      null,
      { timeout: 10000 },
    )
    await page.waitForTimeout(500)

    // 一轮「双击进编辑 → Esc 取消」：合成 dblclick 走组件的原生 dblclick 兜底链路；
    // Escape 派发到编辑器根元素（组件在编辑器上监听 keydown）。每轮校验编辑器确实挂载并退出。
    const cycle = (warmup: boolean): Promise<void> =>
      page.evaluate(async (warmup) => {
        const t = document.querySelector('#qa-table-edit-memory')!
        const td = t.shadowRoot!.querySelector('tbody td[data-col]') as HTMLTableCellElement
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
        const open = () => {
          td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
          return wait(100).then(() => {
            if (!td.querySelector('.cell-editor-component')) throw new Error('编辑器未挂载')
          })
        }
        const esc = () => {
          td.querySelector('.cell-editor-component')!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
          )
          return wait(100).then(() => {
            if (td.querySelector('.cell-editor-component')) throw new Error('编辑器未退出')
          })
        }
        if (warmup) {
          await open()
          await esc()
          return
        }
        for (let i = 0; i < 20; i++) {
          await open()
          await esc()
        }
      }, warmup)

    // 预热一轮：编辑链路首次初始化属一次性分配，不进基线
    await cycle(true)
    await page.waitForTimeout(200)
    await forceGC(page)
    const before = await countTable(page, '#qa-table-edit-memory')
    const base = await heapMedian(page)

    await cycle(false)
    await page.waitForTimeout(300)
    await forceGC(page)
    const after = await countTable(page, '#qa-table-edit-memory')
    const afterHeap = await heapMedian(page)
    const growth = afterHeap - base
    console.log(
      `[table-memory 基线] 编辑器 heap 基线=${base} 20 轮后=${afterHeap} 增幅=${growth}(${((growth / base) * 100).toFixed(2)}%) DOM 节点 ${before.all}→${after.all} WC ${before.wc}→${after.wc}`,
    )
    // 实测基线（2026-09，chromium headless）：20 轮后 heap 增幅 ≈0%、DOM 节点与 WC 实例数
    // 与轮前完全一致；阈值 = 增幅 < 基线 15%。若实测持续贴上限可放宽到 30% 并在此说明理由
    expect(after.wc, '编辑器销毁后表内无残留 WC 实例（oas-input 编辑器不留存）').toBe(before.wc)
    expect(growth, '强制 GC 后 heapUsed 增幅 < 基线 15%').toBeLessThan(base * 0.15)
  })
})
