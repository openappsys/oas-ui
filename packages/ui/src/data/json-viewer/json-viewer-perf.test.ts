// 渲染热路径回归：用模块包装计数 flattenVisible / collectAncestorPaths 的真实调用次数，
// 并用 DOM 节点身份锁定「窗口未变是否重建行」。ESM 命名导出不可 spy，必须包装模块。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const perf = vi.hoisted(() => ({ flatten: 0, ancestors: 0 }))

vi.mock('./json-model.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./json-model.js')>()
  return {
    ...mod,
    flattenVisible: (...args: Parameters<typeof mod.flattenVisible>): ReturnType<typeof mod.flattenVisible> => {
      perf.flatten += 1
      return mod.flattenVisible(...args)
    },
    collectAncestorPaths: (path: string): string[] => {
      perf.ancestors += 1
      return mod.collectAncestorPaths(path)
    },
  }
})

import { OASJsonViewer } from './index.js'

function mount(attrs: Record<string, string> = {}): OASJsonViewer {
  const el = new OASJsonViewer()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function rows(el: OASJsonViewer): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')]
}

function paths(el: OASJsonViewer): string[] {
  return rows(el).map((row) => row.getAttribute('data-path') ?? '')
}

function tree(el: OASJsonViewer): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

const BIG = JSON.stringify(Array.from({ length: 10_000 }, (_, i) => i))
const BIG_ATTRS = { text: BIG, height: '200', 'row-height': '20' }
const SEARCH_TEXT = JSON.stringify(
  Array.from({ length: 400 }, (_, i) => ({ name: `item-${i}`, meta: { label: `alpha-${i}` } })),
)

describe('OASJsonViewer 渲染热路径：可见行复用', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    perf.flatten = 0
    perf.ancestors = 0
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('窗口内滚动不重新计算可见行；scrollToPath 一次调用只计算一次', () => {
    const el = mount(BIG_ATTRS)
    const viewport = tree(el)

    // 210 → 212：同一行窗口（buffer 内小幅滚动），start/end 不变
    perf.flatten = 0
    viewport.scrollTop = 210
    viewport.dispatchEvent(new Event('scroll'))
    viewport.scrollTop = 212
    viewport.dispatchEvent(new Event('scroll'))
    expect(perf.flatten, '窗口内滚动应复用已算可见行').toBe(0)

    perf.flatten = 0
    el.scrollToPath('$[5000]')
    expect(perf.flatten, 'scrollToPath 一次公开调用只应计算一次可见行').toBe(1)
  })

  it('窗口未变的滚动保留行 DOM 节点身份（不重建）', () => {
    const el = mount(BIG_ATTRS)
    const viewport = tree(el)
    viewport.scrollTop = 210
    viewport.dispatchEvent(new Event('scroll'))
    const before = paths(el)
    const firstNode = rows(el)[0]!

    viewport.scrollTop = 212
    viewport.dispatchEvent(new Event('scroll'))

    expect(paths(el)).toEqual(before)
    expect(rows(el)[0], '同窗口滚动应复用行 DOM，而不是重建').toBe(firstNode)
    expect(el.shadowRoot!.querySelector('[part="row"]')).toBe(firstNode)
  })

  it('跨窗口滚动仍更新行内容（不复用陈旧 DOM）', () => {
    const el = mount(BIG_ATTRS)
    const viewport = tree(el)
    const before = paths(el)
    viewport.scrollTop = 4000
    viewport.dispatchEvent(new Event('scroll'))
    const after = paths(el)
    expect(after.length).toBeGreaterThan(0)
    expect(after).not.toEqual(before)
    expect(after[0]).not.toBe('$')
  })

  it('窗口不变时键盘移动活动行仍更新高亮与 aria-activedescendant', () => {
    const el = mount(BIG_ATTRS)
    const viewport = tree(el)
    el.scrollToPath('$[30]')
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    const active = el.shadowRoot!.querySelector<HTMLElement>('[part="row"].active')!
    expect(active.getAttribute('data-path')).toBe('$[31]')
    const activeId = viewport.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(el.shadowRoot!.getElementById(activeId!)?.getAttribute('data-path')).toBe('$[31]')
  })

  it('数据源/展开状态变化后的首次渲染必须重新计算可见行', () => {
    const el = mount({ text: '{"a":{"b":1}}', 'default-expand-depth': '0' })
    expect(paths(el)).toEqual(['$'])

    perf.flatten = 0
    el.expandAll()
    expect(perf.flatten).toBeGreaterThan(0)
    expect(paths(el)).toContain("$['a']['b']")

    perf.flatten = 0
    el.data = { x: 1 }
    expect(perf.flatten, '换数据源必须重新计算').toBeGreaterThan(0)
    // 换数据源会重置初始化展开（default-expand-depth=0 → 只剩根）
    expect(paths(el)).toEqual(['$'])
    el.expandAll()
    expect(paths(el)).toEqual(['$', "$['x']"])
  })

  it('空/错误态与数据态切换不复用陈旧行', () => {
    const el = mount({ text: '{bad' })
    expect(el.shadowRoot!.querySelector('[part="error"]')).not.toBeNull()
    el.data = { a: 1 }
    expect(paths(el)).toEqual(['$', "$['a']"])

    el.text = '{bad'
    expect(el.shadowRoot!.querySelector('[part="error"]')).not.toBeNull()
    el.data = { a: 1, b: 2 }
    expect(paths(el)).toEqual(['$', "$['a']", "$['b']"])
  })
})

describe('OASJsonViewer 渲染热路径：搜索祖先展开缓存', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    perf.flatten = 0
    perf.ancestors = 0
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('搜索初始化后 searchNext 与滚动不再重算祖先路径', () => {
    const el = mount({ text: SEARCH_TEXT, search: 'alpha' })
    expect(perf.ancestors, '首次搜索需要计算祖先').toBeGreaterThan(0)

    perf.ancestors = 0
    el.searchNext()
    el.searchNext()
    el.searchPrev()
    const viewport = tree(el)
    viewport.scrollTop = 400
    viewport.dispatchEvent(new Event('scroll'))
    expect(perf.ancestors, '同查询的重绘应复用祖先缓存').toBe(0)
  })

  it('query 改变与 root 改变都会重新计算祖先缓存', () => {
    const el = mount({ text: SEARCH_TEXT, search: 'alpha' })
    perf.ancestors = 0
    el.setAttribute('search', 'item-2')
    expect(perf.ancestors, '换查询必须重算').toBeGreaterThan(0)

    perf.ancestors = 0
    el.data = Array.from({ length: 400 }, (_, i) => ({ name: `item-${i}`, meta: { label: `beta-${i}` } }))
    expect(perf.ancestors, '换数据源（root）必须重算').toBeGreaterThan(0)
  })

  it('搜索期间手动收起不被后续重绘/滚动顶开，清空搜索恢复', () => {
    const el = mount({ text: SEARCH_TEXT, search: 'alpha' })
    expect(paths(el).length).toBeGreaterThan(1)

    const root = rows(el).find((row) => row.getAttribute('data-path') === '$')!
    root.click()
    expect(paths(el)).toEqual(['$'])

    const viewport = tree(el)
    viewport.scrollTop = 0
    viewport.dispatchEvent(new Event('scroll'))
    expect(paths(el), '滚动重绘不得越过手动收起').toEqual(['$'])

    el.removeAttribute('search')
    expect(paths(el)).toEqual(['$'])
  })

  it('搜索命中行与计数在 next 后仍同步', () => {
    const el = mount({ text: SEARCH_TEXT, search: 'alpha' })
    const changes: Array<{ matches: number; activeIndex: number }> = []
    el.addEventListener('oas-search-change', (e) => changes.push((e as CustomEvent).detail))
    el.searchNext()
    expect(changes.at(-1)).toMatchObject({ matches: 400, activeIndex: 1 })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!.textContent).toBe('2/400')
    const active = el.shadowRoot!.querySelector<HTMLElement>('[part="row"].active')
    expect(active?.getAttribute('data-path')).toBe("$[1]['meta']['label']")
  })
})
