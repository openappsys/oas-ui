import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTree, type TreeNode } from './index.js'

// console.warn 间谍：与同目录其他用例同惯例（模块级 dev 告警去重）
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
beforeAll(() => warnSpy.mockClear())
afterAll(() => warnSpy.mockRestore())

/** 连续根节点：key/label 带序号；childrenPerRoot>0 时每个根带同量子节点（默认收起） */
function mkRoots(count: number, childrenPerRoot = 0, from = 0): TreeNode[] {
  return Array.from({ length: count }, (_, i) => {
    const n = from + i
    const node: TreeNode = { key: `n${n}`, label: `节点 ${n}` }
    if (childrenPerRoot > 0) {
      node.children = Array.from({ length: childrenPerRoot }, (_, j) => ({
        key: `n${n}-c${j}`,
        label: `子节点 ${n}-${j}`,
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

function vlistOf(el: OASTree): HTMLElement {
  return el.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
}

/** 虚拟窗口内的行（item 容器在 vlist shadow，行由 tree 经 oas-item 填充） */
function virtualItems(el: OASTree): HTMLElement[] {
  return [...vlistOf(el).shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
}

function itemKeys(el: OASTree): string[] {
  return virtualItems(el).map((item) => item.querySelector('[part="row"]')?.getAttribute('data-key') ?? '')
}

function rowsInTree(el: OASTree): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')]
}

function viewportOf(el: OASTree): HTMLElement {
  return vlistOf(el).shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
const flushMicro = (): Promise<void> => new Promise((resolve) => queueMicrotask(() => queueMicrotask(resolve)))

/** 虚拟窗口内的行 DOM（按 data-key 取） */
function virtualRowByKey(el: OASTree, key: string): HTMLElement | null {
  for (const item of virtualItems(el)) {
    const row = item.querySelector<HTMLElement>('[part="row"]')
    if (row?.getAttribute('data-key') === key) return row
  }
  return null
}

/** 向行派发键盘事件（onTreeKeydown 依赖 composedPath 定位行） */
function pressKey(row: HTMLElement, key: string): void {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
}

describe('OASTree 客户端虚拟滚动（virtual / item-height）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('virtual 单独开启：视口默认 360、行高默认 32，只渲染窗口行', () => {
    const el = mount({ virtual: '', data: JSON.stringify(mkRoots(500)) })
    const vlist = vlistOf(el)
    expect(vlist.hidden).toBe(false)
    expect((el.shadowRoot!.querySelector('.tree') as HTMLElement).hidden).toBe(true)
    // 默认开口落到 vlist（视口 360 = ceil(360/32)=12 行 + buffer 4）
    expect(vlist.getAttribute('height')).toBe('360')
    expect(vlist.getAttribute('item-height')).toBe('32')
    expect(viewportOf(el).style.height).toBe('360px')
    expect(virtualItems(el).length).toBe(16)
    expect(itemKeys(el)[0]).toBe('n0')
  })

  it('height 旧用法仍开启虚拟化（向后兼容，不要求 virtual 属性）', () => {
    const el = mount({ height: '200', data: JSON.stringify(mkRoots(500)) })
    expect(vlistOf(el).hidden).toBe(false)
    expect(vlistOf(el).getAttribute('height')).toBe('200')
    expect(virtualItems(el).length).toBe(11) // ceil(200/32)=7 + buffer 4
  })

  it('item-height 生效，且优先于旧名 row-height', () => {
    const itemWin = mount({
      virtual: '',
      height: '200',
      'row-height': '40',
      'item-height': '50',
      data: JSON.stringify(mkRoots(500)),
    })
    expect(vlistOf(itemWin).getAttribute('item-height')).toBe('50')
    expect(virtualItems(itemWin).length).toBe(8) // ceil(200/50)=4 + 4

    document.body.innerHTML = ''
    const legacy = mount({ height: '200', 'row-height': '40', data: JSON.stringify(mkRoots(500)) })
    expect(vlistOf(legacy).getAttribute('item-height')).toBe('40')
    expect(virtualItems(legacy).length).toBe(9) // ceil(200/40)=5 + 4
  })

  it('item-height 非法值（非数值 / 0 / 负数）回落 32', () => {
    for (const bad of ['abc', '0', '-8', '']) {
      document.body.innerHTML = ''
      const el = mount({ virtual: '', height: '200', 'item-height': bad, data: JSON.stringify(mkRoots(500)) })
      expect(vlistOf(el).getAttribute('item-height'), `非法值 "${bad}" 应回落 32`).toBe('32')
      expect(virtualItems(el).length, `非法值 "${bad}" 窗口按 32 计算`).toBe(11)
    }
  })

  it('item-height / row-height 均缺省时可用 --oas-tree-row-height token 覆盖', () => {
    const el = new OASTree()
    el.style.setProperty('--oas-tree-row-height', '40px')
    el.setAttribute('virtual', '')
    el.setAttribute('height', '200')
    el.setAttribute('data', JSON.stringify(mkRoots(500)))
    document.body.appendChild(el)
    expect(vlistOf(el).getAttribute('item-height')).toBe('40')
    expect(virtualItems(el).length).toBe(9) // ceil(200/40)=5 + 4
  })

  it('嵌套半开：只拍平已展开分支（aria-level / 同级全量 posinset）', () => {
    const data: TreeNode[] = [
      {
        key: 'a',
        label: 'A',
        children: [
          { key: 'a1', label: 'A1', children: [{ key: 'a1x', label: 'A1X' }] },
          { key: 'a2', label: 'A2' },
        ],
      },
      { key: 'b', label: 'B' },
    ]
    const el = mount({ virtual: '', expanded: '["a"]', data: JSON.stringify(data) })
    // a 展开 → a 的直接子级可见；a1 未展开 → a1x 不出现
    expect(itemKeys(el)).toEqual(['a', 'a1', 'a2', 'b'])
    const a = virtualRowByKey(el, 'a')!
    const a1 = virtualRowByKey(el, 'a1')!
    const a2 = virtualRowByKey(el, 'a2')!
    expect(a.getAttribute('aria-level')).toBe('1')
    expect(a1.getAttribute('aria-level')).toBe('2')
    // 根级全量口径：2 个根 → setsize=2 / posinset=根序
    expect(a.getAttribute('aria-setsize')).toBe('2')
    expect(a.getAttribute('aria-posinset')).toBe('1')
    expect(virtualRowByKey(el, 'b')!.getAttribute('aria-posinset')).toBe('2')
    // 同级子节点口径：a1/a2 为 2 个兄弟
    expect(a1.getAttribute('aria-setsize')).toBe('2')
    expect(a2.getAttribute('aria-posinset')).toBe('2')
  })

  it('展开/收起/数据变更后窗口重算，滚动位不被钳回 0', async () => {
    const el = mount({ virtual: '', height: '100', data: JSON.stringify(mkRoots(500, 1)) })
    const vp = viewportOf(el)
    vp.scrollTop = 1600
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // scrollTop=1600 / 行高 32 → 首可见行 50，减 buffer 4 → 46
    expect(itemKeys(el)[0]).toBe('n46')
    expect(virtualItems(el).length).toBe(12) // 视口 4 行 + 上下 buffer 各 4

    // 展开窗口内的 n50：窗口重算（子行进入窗口），滚动位保持
    virtualRowByKey(el, 'n50')!.querySelector<HTMLElement>('.toggle')!.click()
    expect(JSON.parse(el.getAttribute('expanded') ?? '[]')).toEqual(['n50'])
    expect(vp.scrollTop).toBe(1600)
    expect(itemKeys(el)[0]).toBe('n46')
    expect(itemKeys(el)).toContain('n50-c0')

    // 收起：子行退出窗口，滚动位仍不回 0
    virtualRowByKey(el, 'n50')!.querySelector<HTMLElement>('.toggle')!.click()
    expect(JSON.parse(el.getAttribute('expanded') ?? '[]')).toEqual([])
    expect(vp.scrollTop).toBe(1600)
    expect(itemKeys(el)).not.toContain('n50-c0')
    expect(itemKeys(el)[0]).toBe('n46')

    // 数据增删（重设 data）：窗口按新全量拍平列表重算，滚动位置同样保持
    el.setAttribute('data', JSON.stringify(mkRoots(600, 1)))
    expect(vp.scrollTop).toBe(1600)
    expect(itemKeys(el)[0]).toBe('n46')
  })

  it('活动项跨窗口：End 滚到末行并聚焦，↑ 回到前一行', async () => {
    const el = mount({ virtual: '', height: '100', data: JSON.stringify(mkRoots(500)) })
    const first = virtualRowByKey(el, 'n0')!
    first.focus()
    pressKey(first, 'End')
    // 末行原本不在窗口：focusRowByKey 先 scrollToIndex 再下一帧聚焦
    await flushRaf()
    expect(itemKeys(el)).toContain('n499')
    const last = virtualRowByKey(el, 'n499')!
    expect(last.tabIndex, '末行成为 roving 焦点（tabindex 0）').toBe(0)

    pressKey(last, 'ArrowUp')
    await flushRaf()
    expect(virtualRowByKey(el, 'n498')!.tabIndex).toBe(0)

    // 回到首行（Home）同样跨窗口
    pressKey(virtualRowByKey(el, 'n498')!, 'Home')
    await flushRaf()
    expect(virtualRowByKey(el, 'n0')!.tabIndex).toBe(0)
  })

  it('虚拟模式 oas-expand 事件语义不变（detail 含 key/expanded/node）', () => {
    const events: Array<{ key: string; expanded: boolean; label: string }> = []
    const el = new OASTree()
    el.addEventListener('oas-expand', (e) => {
      const d = (e as CustomEvent).detail
      events.push({ key: d.key, expanded: d.expanded, label: d.node.label })
    })
    el.setAttribute('virtual', '')
    el.setAttribute('data', JSON.stringify(mkRoots(3, 1)))
    document.body.appendChild(el)
    virtualRowByKey(el, 'n0')!.querySelector<HTMLElement>('.toggle')!.click()
    expect(events).toEqual([{ key: 'n0', expanded: true, label: '节点 0' }])
  })

  it('移除 virtual 回退全量渲染（旧行为不破）', () => {
    const el = mount({ virtual: '', data: JSON.stringify(mkRoots(60)) })
    expect(rowsInTree(el).length).toBe(0)
    expect(virtualItems(el).length).toBe(16)
    el.removeAttribute('virtual')
    expect(vlistOf(el).hidden).toBe(true)
    expect(rowsInTree(el).length).toBe(60)
  })

  it('非虚拟模式保持现有行为：全部行渲染、虚拟链不启用', () => {
    const el = mount({ data: JSON.stringify(mkRoots(200)) })
    expect((el.shadowRoot!.querySelector('.tree') as HTMLElement).hidden).toBe(false)
    expect(vlistOf(el).hidden).toBe(true)
    expect(rowsInTree(el).length).toBe(200)
  })

  it('10k 节点：构造与拍平 < 1500ms 宽下界，渲染行数有界、总高按全量线性列表', () => {
    const data = JSON.stringify(mkRoots(10000))
    // 预热一次（模块加载/JIT 首次成本不计入稳态构造），再采样 3 次取最小值：
    // 满负载并行下取最优而非单次采样，避免 CI 噪声打穿宽下界；真退化（如 O(n²)）会让每次采样一起变慢。
    mount({ virtual: '', data }).remove()
    const samples: number[] = []
    let el: OASTree | null = null
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now()
      el = mount({ virtual: '', data })
      samples.push(performance.now() - t0)
      if (i < 2) el.remove()
    }
    const best = Math.min(...samples)
    expect(el, '至少挂载一次（最后一次采样实例）').toBeInstanceOf(OASTree)
    // 阈值 1500ms：并行负载下 wall-clock 不可靠（同机不同并行度可差数倍），本用例以结构断言为主，
    // 时间只兜「数量级恶化」（O(n²) 会到秒级/更高），不追单次性能数值。
    expect(
      best,
      `10k 构造耗时样本 ${samples.map((s) => s.toFixed(1)).join('/')}ms，取最小 ${best.toFixed(1)}ms（防回归级恶化，下界宽断言）`,
    ).toBeLessThan(1500)
    expect(virtualItems(el!).length).toBeLessThan(100)
    // 全量拍平 10000 行 × 32px：虚拟总高（padding 定位依据）
    const inner = vlistOf(el!).shadowRoot!.querySelector<HTMLElement>('.inner')!
    expect(inner.style.height).toBe(`${10000 * 32}px`)
  })

  it('windowed × virtual 默认高度口径一致（估算容量用同一视口/行高）', async () => {
    // windowed 语义不因新属性改变：virtual + 无 height 时按 360/32 估算初始根窗口
    const el = new OASTree()
    const requests: Array<{ start: number; end: number; reason: string }> = []
    el.addEventListener('oas-window-request', (e) => {
      const d = (e as CustomEvent).detail
      requests.push({ start: d.start, end: d.end, reason: d.reason })
    })
    el.setAttribute('windowed', '')
    el.setAttribute('virtual', '')
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '100')
    document.body.appendChild(el)
    await flushMicro()
    // 空切片按视口容量估算 ceil(360/32)+4 = 16 根 → [100,116) 扩 margin 8 → [92,124)
    expect(requests[0]).toEqual({ start: 92, end: 124, reason: 'init' })
  })
})
