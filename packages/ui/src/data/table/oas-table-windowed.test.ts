import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

/**
 * windowed（服务端行窗口模式）机制测试。
 *
 * 契约见 shared/window-data.ts：
 * - 属性 `windowed`（布尔）+ `total`（全量行数）+ `window-start`（data[0] 的绝对行下标）；
 *   `data` 只承载 [window-start, window-start+len) 的已装载切片。
 * - 可视行窗口 → expandWindow（±8 margin）→ 未被已装载区间覆盖时派发
 *   `oas-window-request`（detail { start, end, reason }，半开、绝对行下标；同 need 去重）。
 * - 本地跨全量操作（排序/过滤/分组/分页切片/树形展开/合计）禁用（devWarn 一次），
 *   行为上不得把部分数据当全量做聚合/切片。
 * - 非 windowed：行为完全不变。
 */

interface WinReq {
  start: number
  end: number
  reason: string
}

/** mount（监听器先于连接挂上，首帧 init 请求也能捕获） */
function mountWindowed(attrs: Record<string, string>): { el: OASTable; reqs: WinReq[] } {
  const el = new OASTable()
  el.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: '名称', sortable: true },
      { key: 'age', title: '年龄' },
    ]),
  )
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  const reqs: WinReq[] = []
  el.addEventListener('oas-window-request', (e) => {
    const d = (e as CustomEvent).detail
    reqs.push({ start: d.start, end: d.end, reason: d.reason })
  })
  document.body.appendChild(el)
  return { el, reqs }
}

const rowsOf = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]

const trsOf = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]

const wrapOf = (el: OASTable): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('.table-scroll')!

/** 绝对行 [start, start+len) 的窗口切片（行内容带绝对行号便于断言） */
const slice = (start: number, len: number): string =>
  JSON.stringify(Array.from({ length: len }, (_, i) => ({ name: `行${start + i}`, age: 20 + i })))

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('OASTable windowed（服务端行窗口模式）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('windowed 生效：data 视为 [window-start, window-start+len) 的绝对行切片渲染', () => {
    const { el } = mountWindowed({ windowed: '', total: '100', 'window-start': '10', data: slice(10, 5) })
    expect(rowsOf(el).length).toBe(5)
    expect(rowsOf(el)[0]!.textContent).toContain('行10')
    expect(rowsOf(el)[4]!.textContent).toContain('行14')
  })

  it('按行能力在切片上正常：cell-click 事件 rowIndex 为绝对行号', () => {
    const { el } = mountWindowed({ windowed: '', total: '100', 'window-start': '10', data: slice(10, 5) })
    let detail: unknown
    el.addEventListener('oas-cell-click', (e) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('td[data-col="name"]') as HTMLElement).click()
    expect((detail as { rowIndex: number }).rowIndex).toBe(10)
  })

  it('首帧派发 oas-window-request（reason=init，绝对半开区间含 margin）', () => {
    // 视口 200/40=5 行 + buffer4 → 可视 [0,9)；±margin8 → 期望 [0,17)；装载 [0,5) 未覆盖
    const { reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      data: slice(0, 5),
    })
    expect(reqs).toEqual([{ start: 0, end: 17, reason: 'init' }])
  })

  it('宿主回填覆盖期望区间后不再重复派发', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      data: slice(0, 5),
    })
    expect(reqs.length).toBe(1)
    el.setAttribute('data', slice(0, 17)) // 恰好覆盖 [0,17)
    expect(reqs.length).toBe(1) // 覆盖 → 静默（不重派）
  })

  it('滚动触发 reason=scroll 的请求；同 need 去重', async () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      data: slice(0, 17),
    })
    expect(reqs.length).toBe(0) // 已覆盖，无 init 请求
    const wrap = wrapOf(el)
    wrap.scrollTop = 400
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 可视 [6,19) → 期望 [0,27)；装载 [0,17) 未覆盖
    expect(reqs).toEqual([{ start: 0, end: 27, reason: 'scroll' }])
    // 同 need（滚动位置未变）再触发不重派
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.length).toBe(1)
  })

  it('data 变更后请求 reason=data（need 变化/覆盖情况变化才派；同 need 不重派）', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      data: slice(0, 5),
    })
    expect(reqs).toEqual([{ start: 0, end: 17, reason: 'init' }])
    // 宿主回填但未覆盖（need 同 [0,17)）→ 契约去重：不重派
    el.setAttribute('data', slice(0, 10))
    expect(reqs.length).toBe(1)
    // 宿主覆盖 [0,17)（去重态重置）后再换窗 → 覆盖情况变化 → data 原因再派
    el.setAttribute('data', slice(0, 17))
    expect(reqs.length).toBe(1)
    el.setAttribute('window-start', '500')
    el.setAttribute('data', slice(500, 10))
    expect(reqs[1]).toEqual({ start: 0, end: 17, reason: 'data' })
  })

  it('宿主回填新窗口 + 滚动后渲染行跳变到新绝对行（spacer 按绝对行号定位）', async () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      data: slice(0, 17),
    })
    // 宿主装载 [100,140)
    el.setAttribute('window-start', '100')
    el.setAttribute('data', slice(100, 40))
    expect(reqs.some((r) => r.reason === 'data')).toBe(true)
    // 滚到装载区内（行100 顶对齐视口）
    const wrap = wrapOf(el)
    wrap.scrollTop = 4040
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const trs = trsOf(el)
    expect(trs[0]!.className).toContain('spacer')
    // 行0..99 未装载 → 顶部占位 = 100 * 40
    expect((trs[0]!.firstElementChild as HTMLElement).style.height).toBe('4000px')
    expect(rowsOf(el)[0]!.textContent).toContain('行100')
  })

  it('虚拟 windowed：可视区间与装载区不相交时不渲染行、全占位（不把部分数据当全量）', () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '20',
      height: '200',
      'row-height': '40',
      data: slice(20, 20),
    })
    // 可视 [0,9) ∩ 装载 [20,40) = 空 → 0 数据行，占位合计 = 100 * 40
    expect(rowsOf(el).length).toBe(0)
    const totalH = trsOf(el).reduce(
      (s, tr) => s + parseFloat((tr.firstElementChild as HTMLElement).style.height || '0'),
      0,
    )
    expect(totalH).toBe(4000)
  })

  it('容器尺寸变化路径（onWrapResize）：同 need 跨触发源去重；视口变高派发更大期望区间', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      height: '200',
      'row-height': '40',
      data: slice(0, 5),
    })
    expect(reqs).toEqual([{ start: 0, end: 17, reason: 'init' }])
    type Probe = { onWrapResize(): void }
    ;(el as unknown as Probe).onWrapResize()
    expect(reqs.length).toBe(1) // 同 need（init 已派）不重复
    // 视口变高（height 200→400 → 可见行数变化）→ 期望区间扩大为 [0,22)
    el.setAttribute('height', '400')
    expect(reqs[1]).toEqual({ start: 0, end: 22, reason: 'data' })
  })

  it('非虚拟 windowed（无 height）：装载切片全量渲染、不外扩请求（初始装载由宿主自理）', () => {
    const { el, reqs } = mountWindowed({ windowed: '', total: '100', 'window-start': '5', data: slice(5, 7) })
    expect(rowsOf(el).length).toBe(7)
    expect(reqs).toEqual([])
  })

  it('windowed 未装载（data 空）不误显空态文案（全量意义上数据存在）', () => {
    const { el } = mountWindowed({ windowed: '', total: '100', data: '[]' })
    expect(el.shadowRoot!.textContent).not.toContain('暂无数据')
  })

  it('total 为 0 / 非法时 windowed 不生效（回落普通模式，行为不变）', () => {
    const { el, reqs } = mountWindowed({ windowed: '', total: '0', 'window-start': '10', data: slice(0, 3) })
    expect(rowsOf(el).length).toBe(3)
    expect(rowsOf(el)[0]!.textContent).toContain('行0') // window-start 被忽略
    expect(reqs).toEqual([])
    const { el: el2, reqs: reqs2 } = mountWindowed({ windowed: '', total: 'abc', data: slice(0, 3) })
    expect(rowsOf(el2).length).toBe(3)
    expect(reqs2).toEqual([])
  })

  it('非 windowed（缺 windowed 属性）：不派发窗口请求，本地虚拟滚动行为不变', async () => {
    const { el, reqs } = mountWindowed({ total: '1000', height: '200', 'row-height': '40', data: slice(0, 50) })
    expect(reqs).toEqual([])
    const wrap = wrapOf(el)
    wrap.scrollTop = 400
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs).toEqual([])
    // 本地切片：scrollTop=400 → 可视窗 start=6，首行是行6（data 内相对下标语义不受影响）
    expect(rowsOf(el)[0]!.textContent).toContain('行6')
  })

  it('windowed 本地排序禁用：点表头不改行序 + devWarn 去重 + oas-sort-change 照常派发（宿主通道）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // 逆序窗口数据：行2, 行1, 行0
    const { el } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '0',
      data: JSON.stringify([
        { name: '行2', age: 30 },
        { name: '行1', age: 25 },
        { name: '行0', age: 20 },
      ]),
    })
    let sortDetail: unknown
    el.addEventListener('oas-sort-change', (e) => (sortDetail = (e as CustomEvent).detail))
    const th = el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!
    th.click()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('windowed')
    expect(sortDetail).toEqual({ key: 'name', order: 'asc' })
    // 行序不变（本地未排序；宿主按事件做服务端排序后回填）
    expect(rowsOf(el)[0]!.textContent).toContain('行2')
    // 同实例再触发只告警一次（去重）
    th.click()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(rowsOf(el)[0]!.textContent).toContain('行2')
    warn.mockRestore()
  })

  it('windowed group-by 禁用：无分节头行 + devWarn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountWindowed({ windowed: '', total: '10', 'group-by': 'name', data: slice(0, 4) })
    expect(el.shadowRoot!.querySelector('tr.group-header')).toBeNull()
    expect(rowsOf(el).length).toBe(4)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('windowed 树形展开禁用：子行不渲染、无展开钮 + devWarn（expanded 预置也不漏出子行）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = JSON.stringify([
      { name: '父', age: 1, children: [{ name: '子', age: 2 }] },
      { name: '行1', age: 3 },
    ])
    // row-key=name：让 expanded='父' 真正命中父行 key——若本地树展开未被禁用，子行会渲染（断言有效）
    const { el } = mountWindowed({ windowed: '', total: '10', 'row-key': 'name', data, expanded: '父' })
    expect(el.shadowRoot!.querySelector('button.toggle')).toBeNull()
    expect(rowsOf(el).length).toBe(2)
    // 断言限定 tbody（shadow 整体 textContent 含 style 内 CSS 中文注释「子表头/叶子列」，不可作子串判据）
    const bodyText = el.shadowRoot!.querySelector('tbody')!.textContent ?? ''
    expect(bodyText).not.toContain('子')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('windowed filterable 禁用：过滤面板不打开 + devWarn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountWindowed({
      windowed: '',
      total: '10',
      columns: JSON.stringify([
        { key: 'name', title: '名称', filterable: true },
        { key: 'age', title: '年龄' },
      ]),
      data: slice(0, 4),
    })
    el.shadowRoot!.querySelector<HTMLElement>('.filter-btn')!.click()
    expect(el.shadowRoot!.querySelector('.filter-panel')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('windowed 本地分页切片禁用：已装载行全渲染，分页器 total 直通全量', () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '100',
      pagination: '',
      'page-size': '2',
      data: slice(0, 5),
    })
    // page-size=2 也不切片（切片在部分数据上是错误结果）
    expect(rowsOf(el).length).toBe(5)
    const pager = el.shadowRoot!.querySelector('oas-pagination')
    expect(pager?.getAttribute('total')).toBe('100')
  })

  it('windowed summary 禁用：不渲染合计行（部分数据聚合禁止）+ devWarn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountWindowed({
      windowed: '',
      total: '100',
      summary: JSON.stringify([{ key: 'age', type: 'sum' }]),
      data: slice(0, 4),
    })
    expect(el.shadowRoot!.querySelector('tr.summary')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
