import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTree, type TreeNode } from './index.js'

// console.warn 间谍：与其他 tree 用例同惯例（模块级 dev 告警去重）
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
beforeAll(() => warnSpy.mockClear())
afterAll(() => warnSpy.mockRestore())

// ===== 测试口径：height=160、row-height=32、buffer 默认 4 =====
// 可见行窗口：scrollTop=0 → [0,9)；scrollTop=480 → [11,24)；scrollTop=1440（50 行顶）→ [41,50)
const HEIGHT = '160'
const ROW_HEIGHT = '32'

/** 连续根节点切片：key/label 带绝对根序号（k{abs}/根 {abs}），便于断言绝对根序渲染 */
function mkRoots(from: number, count: number, childrenPerRoot = 0): TreeNode[] {
  return Array.from({ length: count }, (_, i) => {
    const abs = from + i
    const node: TreeNode = { key: `k${abs}`, label: `根 ${abs}` }
    if (childrenPerRoot > 0) {
      node.children = Array.from({ length: childrenPerRoot }, (_, j) => ({
        key: `k${abs}-${j}`,
        label: `子 ${abs}-${j}`,
      }))
    }
    return node
  })
}

function mount(attrs: Record<string, string>): OASTree {
  const el = new OASTree()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

/** 行查询横跨双 shadow：非虚拟在树自身 shadow，虚拟在 vlist shadow（行由 oas-item 填充） */
function allRows(el: OASTree): HTMLElement[] {
  const out = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')]
  const vroot = el.shadowRoot!.querySelector('oas-virtual-list')?.shadowRoot
  if (vroot) out.push(...vroot.querySelectorAll<HTMLElement>('[part="row"]'))
  return out
}

function rowByKey(el: OASTree, key: string): HTMLElement | null {
  return allRows(el).find((r) => r.getAttribute('data-key') === key) ?? null
}

function labels(el: OASTree): string[] {
  return allRows(el).map((r) => r.querySelector('.label')?.textContent ?? '')
}

function viewportOf(el: OASTree): HTMLElement {
  return el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!.querySelector('.viewport')!
}

function vlistItems(el: OASTree): HTMLElement | null {
  return el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!.querySelector('.items')
}

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

/** 微任务冲刷：windowed 回填锚定在 queueMicrotask 应用（批次同步属性落定后），需等一拍再断言 */
const flushMicrotasks = (): Promise<void> => new Promise((resolve) => queueMicrotask(() => queueMicrotask(resolve)))

/** 收集 console.warn 里含指定片段的调用（dev 告警断言用；warnSpy 已在模块级挂好） */
const warnMsgs = (fragment: string): string[] =>
  warnSpy.mock.calls.map((c) => String(c[0] ?? '')).filter((m) => m.includes(fragment))

/** 收集 oas-window-request（detail { start, end, reason }，绝对根下标、半开区间） */
function collectRequests(el: OASTree): Array<{ start: number; end: number; reason: string }> {
  const out: Array<{ start: number; end: number; reason: string }> = []
  el.addEventListener('oas-window-request', (e: Event) => {
    const d = (e as CustomEvent).detail
    out.push({ start: d.start, end: d.end, reason: d.reason })
  })
  return out
}

describe('OASTree windowed：服务端根节点窗口协议', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('init 请求：可见根区间前后扩 WINDOW_MARGIN 根 + 切片按绝对根序渲染', () => {
    // 切片 [100,150)，scrollTop=0 可见行 [0,9) → 根 [100,109) → 扩 margin → [92,117)
    // 已装载 [100,150) 未覆盖 [92,117)（92<100）→ init 请求
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(100, 50)))
    document.body.appendChild(el)
    expect(requests).toEqual([{ start: 92, end: 117, reason: 'init' }])
    // 切片按绝对根序渲染：首行 = window-start 处的根
    expect(labels(el)[0]).toBe('根 100')
    expect(labels(el).length).toBeGreaterThanOrEqual(9)
  })

  it('空切片 init 请求：按视口容量估算根数（ceil(height/row-height)+buffer4）+ margin，不按 1 根退化', () => {
    // 首帧未装载任何切片（无 data）：可见集为空、无从反推可视根。若按「1 个根」退化估算会得
    // [92,109)——宿主按此回填后视口仍不被覆盖，被迫链式多次收敛。正确语义：按视口容量
    // ceil(160/32)+vlist buffer 4 = 9 根估算：window-start+[0,9) = [100,109) → 扩 margin → [92,117)
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    document.body.appendChild(el)
    expect(requests).toEqual([{ start: 92, end: 117, reason: 'init' }])
  })

  it('空切片 + total=0：回落普通模式，不派发任何请求', () => {
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '0',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    document.body.appendChild(el)
    expect(requests, 'total=0 非 windowed，空切片不派发请求').toEqual([])
  })

  it('宿主回填链有界收敛：init 后切片替换回填不再震荡，终态首行/aria 保持绝对根序', () => {
    // 回归：宿主监听请求后同步回填切片（先 data 后 window-start，两次 setAttribute 各触发一次
    // update）。空切片按 1 根退化估算时请求区间偏小，链式收敛震荡且终态切片与 window-start 错位；
    // 视口容量估算后链有界收敛（13 次请求后 ws=0 处覆盖），终态绝对根序渲染。
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.addEventListener('oas-window-request', (e: Event) => {
      const d = (e as CustomEvent).detail
      // 先 data 后 window-start：先改 window-start 的中间态（新 ws + 旧切片）会派发偏离请求
      el.setAttribute('data', JSON.stringify(mkRoots(d.start, d.end - d.start)))
      el.setAttribute('window-start', String(d.start))
    })
    document.body.appendChild(el)
    // init 精确区间；随后 data 请求逐次下移 ws（每回填一次 -8 根），至 ws=0 处被覆盖收敛
    expect(requests[0]).toEqual({ start: 92, end: 117, reason: 'init' })
    expect(requests[1]).toEqual({ start: 84, end: 109, reason: 'data' })
    expect(requests[requests.length - 1]).toEqual({ start: 0, end: 21, reason: 'data' })
    expect(requests.length, '链有界收敛（不震荡不发散）').toBe(13)
    expect(el.getAttribute('window-start')).toBe('0')
    // 终态切片 [0,21)：虚拟窗口只渲染 [0,9)（视口 5 + buffer 4），首行绝对根 0；ARIA 全量口径
    expect(labels(el)).toEqual(Array.from({ length: 9 }, (_, i) => `根 ${i}`))
    expect(rowByKey(el, 'k0')!.getAttribute('aria-posinset')).toBe('1')
    expect(rowByKey(el, 'k0')!.getAttribute('aria-setsize')).toBe('500')
  })

  it('scroll 请求：滚到已装载切片底 → 期望区间越过装载边界 → reason=scroll', async () => {
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(100, 50)))
    document.body.appendChild(el)
    expect(requests).toEqual([{ start: 92, end: 117, reason: 'init' }])
    // 滚到切片底：scrollTop=1440（maxTop=50*32-160）→ 可见行 [41,50) → 根 [141,150)
    // → 扩 margin → [133,158)，158>150 未覆盖 → scroll 请求
    viewportOf(el).scrollTop = 1440
    viewportOf(el).dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(requests).toEqual([
      { start: 92, end: 117, reason: 'init' },
      { start: 133, end: 158, reason: 'scroll' },
    ])
    // 滚动后窗口行重渲染：首行 = 根 141（绝对根序）
    expect(labels(el)[0]).toBe('根 141')
  })

  it('同区间去重 + 覆盖复位：同 need 不重发；覆盖后重置允许同区间再派', async () => {
    // 切片 [0,20)（ws=0）：初始可见 [0,9) → 期望 [0,17) ⊆ 已装载 [0,20) → 不请求
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '0',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(0, 20)))
    document.body.appendChild(el)
    expect(requests).toEqual([])
    // 滚到 maxTop=480 → 可见行 [11,20) → 根 [11,20) → 扩 margin → [3,28)，28>20 → scroll 请求
    viewportOf(el).scrollTop = 480
    viewportOf(el).dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(requests).toEqual([{ start: 3, end: 28, reason: 'scroll' }])
    // 同位置再滚：同 need 去重不重发
    viewportOf(el).dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(requests).toEqual([{ start: 3, end: 28, reason: 'scroll' }])
    // 宿主回填 32 根 [0,32)：期望 [3,32) 被覆盖 → 复位去重态，不派发
    el.setAttribute('data', JSON.stringify(mkRoots(0, 32)))
    expect(requests).toEqual([{ start: 3, end: 28, reason: 'scroll' }])
    // 宿主还原 20 根切片 [0,20)：同期望 [3,28) 再度未覆盖——若未做覆盖复位会被同区间
    // 去重拦下，此处再派（reason=data）即证明复位生效
    el.setAttribute('data', JSON.stringify(mkRoots(0, 20)))
    expect(requests).toEqual([
      { start: 3, end: 28, reason: 'scroll' },
      { start: 3, end: 28, reason: 'data' },
    ])
  })

  it('total=0 / 非法 total：回落普通模式（无请求、ARIA 按根节点数）', () => {
    for (const total of ['0', 'abc']) {
      document.body.innerHTML = ''
      const el = new OASTree()
      const requests = collectRequests(el)
      for (const [k, v] of Object.entries({
        windowed: '',
        total,
        'window-start': '0',
        height: HEIGHT,
        'row-height': ROW_HEIGHT,
      }))
        el.setAttribute(k, v)
      el.setAttribute('data', JSON.stringify(mkRoots(0, 3)))
      document.body.appendChild(el)
      expect(requests, `total=${total} 不派发请求`).toEqual([])
      expect(labels(el).length).toBe(3)
      expect(rowByKey(el, 'k0')!.getAttribute('aria-setsize')).toBe('3')
      expect(rowByKey(el, 'k2')!.getAttribute('aria-posinset')).toBe('3')
    }
  })

  it('ARIA 口径：windowed 根 = 全量绝对（setsize=total、posinset=ws+根序+1）；子 = 同级已装载数', () => {
    const el = mount({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
      multiple: '',
      expanded: '["k100"]',
      data: JSON.stringify(mkRoots(100, 3, 2)),
    })
    // 根：绝对口径
    expect(rowByKey(el, 'k100')!.getAttribute('aria-setsize')).toBe('500')
    expect(rowByKey(el, 'k100')!.getAttribute('aria-posinset')).toBe('101')
    expect(rowByKey(el, 'k101')!.getAttribute('aria-posinset')).toBe('102')
    expect(rowByKey(el, 'k102')!.getAttribute('aria-posinset')).toBe('103')
    // 子：同级已装载兄弟数口径（文档约定 windowed 只保证根级绝对）
    expect(rowByKey(el, 'k100-0')!.getAttribute('aria-setsize')).toBe('2')
    expect(rowByKey(el, 'k100-0')!.getAttribute('aria-posinset')).toBe('1')
    expect(rowByKey(el, 'k100-1')!.getAttribute('aria-setsize')).toBe('2')
    expect(rowByKey(el, 'k100-1')!.getAttribute('aria-posinset')).toBe('2')
    // aria-level 不受影响
    expect(rowByKey(el, 'k100')!.getAttribute('aria-level')).toBe('1')
    expect(rowByKey(el, 'k100-0')!.getAttribute('aria-level')).toBe('2')
    // 虚拟路径 role=tree 容器（vlist .items）补 aria-multiselectable
    expect(vlistItems(el)!.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('非 windowed：setsize=根节点总数、posinset=根序，且无任何窗口请求', () => {
    const el = mount({
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
      expanded: '["k0"]',
      data: JSON.stringify(mkRoots(0, 3, 2)),
    })
    const requests = collectRequests(el)
    el.setAttribute('data', el.getAttribute('data')!)
    expect(requests).toEqual([])
    expect(rowByKey(el, 'k0')!.getAttribute('aria-setsize')).toBe('3')
    expect(rowByKey(el, 'k0')!.getAttribute('aria-posinset')).toBe('1')
    expect(rowByKey(el, 'k1')!.getAttribute('aria-posinset')).toBe('2')
    expect(rowByKey(el, 'k2')!.getAttribute('aria-posinset')).toBe('3')
    expect(rowByKey(el, 'k0-0')!.getAttribute('aria-setsize')).toBe('2')
    expect(rowByKey(el, 'k0-0')!.getAttribute('aria-posinset')).toBe('1')
  })

  it('aria-selected 与 data-selected 同步：单选切换 / multiple 点选取消', () => {
    // 单选：点 a 选中，点 b 后 a 取消
    const single = mount({
      data: JSON.stringify([
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ]),
    })
    allRows(single)[0]!.click()
    expect(rowByKey(single, 'a')!.getAttribute('data-selected')).toBe('true')
    expect(rowByKey(single, 'a')!.getAttribute('aria-selected')).toBe('true')
    expect(rowByKey(single, 'b')!.getAttribute('aria-selected')).toBe('false')
    allRows(single)[1]!.click()
    expect(rowByKey(single, 'a')!.getAttribute('data-selected')).toBe('false')
    expect(rowByKey(single, 'a')!.getAttribute('aria-selected')).toBe('false')
    expect(rowByKey(single, 'b')!.getAttribute('aria-selected')).toBe('true')
    // multiple：再点同节点取消选中，两属性同步翻转
    document.body.innerHTML = ''
    const multi = mount({
      multiple: '',
      data: JSON.stringify([
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ]),
    })
    allRows(multi)[0]!.click()
    expect(rowByKey(multi, 'a')!.getAttribute('aria-selected')).toBe('true')
    allRows(multi)[0]!.click()
    expect(rowByKey(multi, 'a')!.getAttribute('data-selected')).toBe('false')
    expect(rowByKey(multi, 'a')!.getAttribute('aria-selected')).toBe('false')
  })

  it('懒加载 + windowed 组合：init 请求照常、展开触发 oas-load、宿主回填子节点渲染', () => {
    const el = new OASTree()
    const requests = collectRequests(el)
    const loads: string[] = []
    el.addEventListener('oas-load', (e: Event) => loads.push((e as CustomEvent).detail.key))
    for (const [k, v] of Object.entries({
      lazy: '',
      windowed: '',
      total: '100',
      'window-start': '0',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify([{ key: 'lz', label: '懒加载', loaded: false }]))
    document.body.appendChild(el)
    // 1 根切片：可见根 [0,1) → 扩 margin → [0,9) 未覆盖 → init 请求
    expect(requests).toEqual([{ start: 0, end: 9, reason: 'init' }])
    // 展开未加载节点 → loading + oas-load
    const toggle = rowByKey(el, 'lz')!.querySelector<HTMLButtonElement>('[part="toggle"]')!
    toggle.click()
    expect(loads).toEqual(['lz'])
    expect(rowByKey(el, 'lz')!.querySelector('.toggle-spinner')).toBeTruthy()
    // 宿主回填：loaded + children → 子行渲染、懒加载机制不破坏
    el.setAttribute(
      'data',
      JSON.stringify([
        {
          key: 'lz',
          label: '懒加载',
          loaded: true,
          children: [{ key: 'lz-c1', label: '懒子 1' }],
        },
      ]),
    )
    const child = rowByKey(el, 'lz-c1')
    expect(child).toBeTruthy()
    expect(child!.getAttribute('aria-setsize')).toBe('1')
    expect(child!.getAttribute('aria-posinset')).toBe('1')
    expect(rowByKey(el, 'lz')!.getAttribute('aria-setsize')).toBe('100')
    // 同期望区间去重：回填后可见根仍 [0,1) → 不重发
    expect(requests).toEqual([{ start: 0, end: 9, reason: 'init' }])
  })

  it('非虚拟 windowed（无 height）：不外扩请求（防 margin 发散），初始装载由宿主自理', () => {
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({ windowed: '', total: '500', 'window-start': '100' })) el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(100, 10)))
    document.body.appendChild(el)
    expect(requests).toEqual([])
    expect(labels(el)[0]).toBe('根 100')
  })

  // ===== 复审修复回归 =====

  it('C1 windowed × filter：本地过滤禁用（devWarn 一次），请求不按过滤序号折算、命中不丢', () => {
    // 有缺陷的实现：filter="根 145" 后可见集只剩 1 根，visibleRootIndex 按过滤后序号折算
    // → init 请求退化为 [100,101) 扩 margin = {92,109}，宿主回填 [92,109) 会把命中根 145 排除
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(100, 50)))
    el.setAttribute('filter', '根 145')
    document.body.appendChild(el)
    // 请求按未过滤的可见根窗口折算：[100,109) 扩 margin → {92,117}（不按过滤序号）
    expect(requests[0]).toEqual({ start: 92, end: 117, reason: 'init' })
    // 本地过滤未应用：视口照常渲染未过滤切片行（命中根 145 仍在切片语义内）
    expect(labels(el)[0]).toBe('根 100')
    expect(labels(el).length).toBeGreaterThanOrEqual(9)
    // devWarn 一次（实例级去重：再触发 update 不重复）
    expect(warnMsgs('windowed 模式下本地过滤不执行').length).toBe(1)
    el.setAttribute('data', JSON.stringify(mkRoots(100, 50)))
    expect(warnMsgs('windowed 模式下本地过滤不执行').length).toBe(1)
  })

  it('C2 扩窗回填滚动锚定：回填后视口首行仍是同一绝对根（切片本地坐标不跳行）', async () => {
    // 切片 [100,150)，滚到 scrollTop=1312（本地行 41 → 绝对根 141）；滚到装载边界派 scroll 请求
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '100',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(100, 50)))
    document.body.appendChild(el)
    expect(requests).toEqual([{ start: 92, end: 117, reason: 'init' }])
    viewportOf(el).scrollTop = 41 * 32
    viewportOf(el).dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 渲染窗口含上方 buffer 4 行：首个渲染行 = 视口顶行 - 4（k137），视口顶可见行 = k141
    expect(labels(el)[0]).toBe('根 137')
    expect(labels(el)[4]).toBe('根 141')
    expect(requests[1]).toEqual({ start: 129, end: 158, reason: 'scroll' })
    // 宿主扩窗回填（先 data 后 window-start，同真实回填顺序）：切片 [129,158) + ws=129。
    // 无锚定的实现：scrollTop 是切片本地坐标，回填后视口跳到绝对根 153（本地行 24）
    el.setAttribute('data', JSON.stringify(mkRoots(129, 29)))
    el.setAttribute('window-start', '129')
    await flushMicrotasks()
    // 锚定把同 key 行滚回视口顶：scrollTop=锚点行本地序×行高 → 首个渲染行与视口顶可见行
    // 与回填前完全一致（k137 / k141），用户视角零跳行
    expect(labels(el)[0], '回填前后首个渲染行相同（不跳行）').toBe('根 137')
    expect(labels(el)[4], '扩窗回填后视口顶可见行仍是绝对根 141（锚定补偿滚回）').toBe('根 141')
    expect(viewportOf(el).scrollTop).toBe((141 - 129) * 32)
  })

  it('C2 切片顶（scrollTop 0）回填不锚定：保持切片顶语义（init 回填链收敛不被拉跑）', async () => {
    // scrollTop 0 时视口顶 = 已装载切片首行，回填后保持在切片顶（锚定反而按陈旧绝对根拉跑）
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '0',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(0, 20)))
    document.body.appendChild(el)
    expect(requests).toEqual([])
    // 切片尾部扩容回填（ws 不变）：scrollTop 0 保持，首行仍是切片首根
    el.setAttribute('data', JSON.stringify(mkRoots(0, 40)))
    await flushMicrotasks()
    expect(labels(el)[0]).toBe('根 0')
    expect(viewportOf(el).scrollTop).toBe(0)
    expect(requests).toEqual([])
  })

  it('I1 windowed × check-all：禁用顶部全选项（不产生错误全选结果）+ devWarn 一次', () => {
    const el = mount({
      windowed: '',
      total: '500',
      'window-start': '0',
      checkable: '',
      'check-all': '',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
      data: JSON.stringify(mkRoots(0, 20)),
    })
    const row = el.shadowRoot!.querySelector<HTMLElement>('.check-all')!
    expect(row.hidden, 'windowed 下顶部全选项行隐藏（不渲染可点通道）').toBe(true)
    expect(warnMsgs('windowed 模式下 check-all 只覆盖已装载切片').length).toBe(1)
    // 再触发 update 不重复告警
    el.setAttribute('data', JSON.stringify(mkRoots(0, 21)))
    expect(warnMsgs('windowed 模式下 check-all 只覆盖已装载切片').length).toBe(1)
    // 反证：非 windowed 同配置全选项行照常
    const el2 = mount({
      total: '500',
      checkable: '',
      'check-all': '',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
      data: JSON.stringify(mkRoots(0, 20)),
    })
    expect(el2.shadowRoot!.querySelector<HTMLElement>('.check-all')!.hidden).toBe(false)
  })

  it('I2 windowed 键盘到切片底/顶：派发 oas-window-request（need 覆盖目标根 ±margin，reason=scroll）', async () => {
    // 切片 [0,20)（ws=0）：初始无请求
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '0',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(0, 20)))
    document.body.appendChild(el)
    expect(requests).toEqual([])
    // End：焦点落切片底（k19，键盘定位经 scrollToIndex 滚动；真实浏览器滚动会触发原生 scroll
    // → 组件同步 lastScrollTop，happy-dom 不自动派发 → 手动补发同真实链路）
    // → 请求装载下一根：target=20 → [20,21) 扩 margin → [12,29)
    rowByKey(el, 'k0')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }))
    viewportOf(el).dispatchEvent(new Event('scroll'))
    expect(rowByKey(el, 'k19')).toBeTruthy()
    expect(requests).toEqual([{ start: 12, end: 29, reason: 'scroll' }])
    // 已在底部再 ArrowDown：同 need 去重不重发
    rowByKey(el, 'k19')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(requests).toEqual([{ start: 12, end: 29, reason: 'scroll' }])
    // 宿主回填 [12,29)（先 data 后 window-start）：先 data（need [0,17) 被覆盖 → 复位不派），
    // 后 ws=12（前向 margin 未覆盖 → 按协议派 data 请求 [4,29)，宿主可继续回填）——协议内行为
    el.setAttribute('data', JSON.stringify(mkRoots(12, 17)))
    el.setAttribute('window-start', '12')
    await flushMicrotasks()
    expect(requests[1]).toEqual({ start: 4, end: 29, reason: 'data' })
    // 回填锚定把原视口顶（绝对根 15）滚回顶部 → 渲染窗 [0,12)：k12..k23；再到底部 → 请求下一区间
    rowByKey(el, 'k23')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }))
    expect(requests[2]).toEqual({ start: 21, end: 38, reason: 'scroll' })
    // 反证：切片中部 ArrowDown 不派请求（上一条 End 已把渲染窗滚到 [8,17)：k20..k28）
    const before = requests.length
    rowByKey(el, 'k20')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(requests.length).toBe(before)
    // 顶部对称：ws=20 切片 [20,40)——先有 init 请求（前向 margin 未装载），Home 落首行
    // → 请求前一根：target=19 → [19,20) 扩 margin → [11,28)
    document.body.innerHTML = ''
    const el2 = new OASTree()
    const requests2 = collectRequests(el2)
    for (const [k, v] of Object.entries({
      windowed: '',
      total: '500',
      'window-start': '20',
      height: HEIGHT,
      'row-height': ROW_HEIGHT,
    }))
      el2.setAttribute(k, v)
    el2.setAttribute('data', JSON.stringify(mkRoots(20, 20)))
    document.body.appendChild(el2)
    expect(requests2).toEqual([{ start: 12, end: 37, reason: 'init' }])
    rowByKey(el2, 'k25')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }))
    expect(requests2).toEqual([
      { start: 12, end: 37, reason: 'init' },
      { start: 11, end: 28, reason: 'scroll' },
    ])
  })

  it('I3 过滤态 aria 元数据基于可见集（非 windowed 连带回归）：命中 1 根 → setsize=posinset=1', () => {
    // 有缺陷的实现：aria 按全量 _data 计数（setsize=3、posinset=2），读屏把全量当展示集
    const el = mount({ filter: '根 1', data: JSON.stringify(mkRoots(0, 3, 2)) })
    expect(rowByKey(el, 'k1')!.getAttribute('aria-setsize')).toBe('1')
    expect(rowByKey(el, 'k1')!.getAttribute('aria-posinset')).toBe('1')
    // 命中子树整体可见：子级按可见同级计数
    expect(rowByKey(el, 'k1-0')!.getAttribute('aria-setsize')).toBe('2')
    expect(rowByKey(el, 'k1-0')!.getAttribute('aria-posinset')).toBe('1')
    expect(rowByKey(el, 'k1-1')!.getAttribute('aria-posinset')).toBe('2')
    // 多命中：按可见根序编号
    const el2 = mount({ filter: '根', data: JSON.stringify(mkRoots(0, 3)) })
    expect(rowByKey(el2, 'k0')!.getAttribute('aria-setsize')).toBe('3')
    expect(rowByKey(el2, 'k2')!.getAttribute('aria-posinset')).toBe('3')
    // 清过滤恢复全量口径
    el2.removeAttribute('filter')
    expect(rowByKey(el2, 'k0')!.getAttribute('aria-posinset')).toBe('1')
    expect(rowByKey(el2, 'k2')!.getAttribute('aria-setsize')).toBe('3')
  })

  it('I4 windowed 切片越 total：posinset 夹到 [1,total] + devWarn 一次（对齐 table/resource）', () => {
    // 切片 [95,105) > total 100：k99 自然 posinset=100，k104 越界（105）夹到 100
    const el = new OASTree()
    const requests = collectRequests(el)
    for (const [k, v] of Object.entries({ windowed: '', total: '100', 'window-start': '95' })) el.setAttribute(k, v)
    el.setAttribute('data', JSON.stringify(mkRoots(95, 10)))
    document.body.appendChild(el)
    expect(requests, '非虚拟 windowed 不派请求').toEqual([])
    expect(rowByKey(el, 'k99')!.getAttribute('aria-setsize')).toBe('100')
    expect(rowByKey(el, 'k99')!.getAttribute('aria-posinset')).toBe('100')
    expect(rowByKey(el, 'k104')!.getAttribute('aria-posinset'), '越界 posinset 夹到 total').toBe('100')
    expect(warnMsgs('切片超出全量范围').length).toBe(1)
    // 再触发 update 不重复告警
    el.setAttribute('data', JSON.stringify(mkRoots(95, 10)))
    expect(warnMsgs('切片超出全量范围').length).toBe(1)
  })
})
