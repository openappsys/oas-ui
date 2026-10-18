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

  // ---- 复审补口：键盘越界请求 / rowIndex 同口径 / ARIA 行序号 / windowed×column-virtual / windowed×merge·span ----

  it('F1 键盘下越界（已装载末端）派发 oas-window-request，不得静默', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '10',
      data: slice(10, 5),
      'grid-navigation': '',
    })
    // 非虚拟 windowed：全部已装载行渲染，且不派初始请求（初始装载由宿主自理）
    expect(rowsOf(el).length).toBe(5)
    expect(reqs).toEqual([])
    const lastTd = rowsOf(el)[4]!.querySelector<HTMLElement>('td[data-col="name"]')!
    lastTd.focus()
    lastTd.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }),
    )
    // 目标绝对行 15 超出已装载 [10,15) → 期望区间 expandWindow(15,16,100,8) = [7,24)
    expect(reqs).toEqual([{ start: 7, end: 24, reason: 'scroll' }])
    // 焦点未移动（请求已发出，等宿主回填后该行可达）
    expect(el.shadowRoot!.activeElement).toBe(lastTd)
  })

  it('F1 键盘上越界派发请求；连续同键同区间去重', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '10',
      data: slice(10, 5),
      'grid-navigation': '',
    })
    const firstTd = rowsOf(el)[0]!.querySelector<HTMLElement>('td[data-col="name"]')!
    firstTd.focus()
    firstTd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
    // 目标绝对行 9 超出已装载 [10,15) → expandWindow(9,10,100,8) = [1,18)
    expect(reqs).toEqual([{ start: 1, end: 18, reason: 'scroll' }])
    firstTd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
    expect(reqs.length).toBe(1)
  })

  it('F1 非 windowed 键盘到末端不受影响（不派发窗口请求）', () => {
    const { el, reqs } = mountWindowed({
      total: '100',
      'window-start': '10',
      data: slice(10, 5),
      'grid-navigation': '',
    })
    const lastTd = rowsOf(el)[4]!.querySelector<HTMLElement>('td[data-col="name"]')!
    lastTd.focus()
    lastTd.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    expect(reqs).toEqual([])
    expect(el.shadowRoot!.activeElement).toBe(lastTd)
  })

  it('F2 oas-edit 与 oas-cell-click 的 rowIndex 同口径（windowed 绝对行号）', () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '10',
      data: slice(10, 5),
      editable: '',
      columns: JSON.stringify([
        { key: 'name', title: '名称', editable: true },
        { key: 'age', title: '年龄' },
      ]),
    })
    let cellIdx = -1
    let editIdx = -1
    el.addEventListener('oas-cell-click', (e) => (cellIdx = (e as CustomEvent).detail.rowIndex))
    el.addEventListener('oas-edit', (e) => (editIdx = (e as CustomEvent).detail.rowIndex))
    // 第一行 = 绝对行 10：先 cell-click，再双击进编辑提交
    rowsOf(el)[0]!.querySelector<HTMLElement>('td[data-col="age"]')!.click()
    const nameTd = rowsOf(el)[0]!.querySelector<HTMLTableCellElement>('td[data-col="name"]')!
    nameTd.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    const input = nameTd.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input).not.toBeNull()
    input!.value = '改名'
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(cellIdx, 'cell-click 绝对行号').toBe(10)
    expect(editIdx, 'edit 与 cell-click 同口径（曾为切片内 0 基序号）').toBe(10)
  })

  it('F3 windowed：aria-rowcount=total，每行 aria-rowindex 为绝对行号 1 基', () => {
    const { el } = mountWindowed({ windowed: '', total: '100', 'window-start': '10', data: slice(10, 5) })
    const table = el.shadowRoot!.querySelector('table')!
    expect(table.getAttribute('aria-rowcount')).toBe('100')
    const idx = [...el.shadowRoot!.querySelectorAll('tbody tr.row')].map((tr) => tr.getAttribute('aria-rowindex'))
    expect(idx).toEqual(['11', '12', '13', '14', '15'])
  })

  it('F3 非 windowed：aria-rowcount=展示集数据行数，aria-rowindex 按行序 1 基', () => {
    const { el } = mountWindowed({ data: slice(0, 6) })
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('6')
    const idx = [...el.shadowRoot!.querySelectorAll('tbody tr.row')].map((tr) => tr.getAttribute('aria-rowindex'))
    expect(idx).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('F3 非 windowed 虚拟：aria-rowcount 为全量行数（不受渲染窗口限制）', () => {
    const { el } = mountWindowed({ height: '200', 'row-height': '40', data: slice(0, 50) })
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('50')
    const trs = [...el.shadowRoot!.querySelectorAll('tbody tr.row')]
    expect(trs.length).toBeLessThan(50)
    expect(trs[0]!.getAttribute('aria-rowindex')).toBe('1')
  })

  it('F2/F3 windowed 虚拟（回填后绝对行渲染）：cell-click rowIndex 与 aria-rowindex 均为绝对行号', async () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '100',
      height: '200',
      'row-height': '40',
      data: slice(100, 40),
    })
    // 滚到装载区内：可视 [97,110) ∩ 装载 [100,140) → 渲染 100 起
    const wrap = wrapOf(el)
    wrap.scrollTop = 4040
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('1000')
    expect(rowsOf(el)[0]!.getAttribute('aria-rowindex')).toBe('101')
    let detail: { rowIndex: number } | undefined
    el.addEventListener('oas-cell-click', (e) => (detail = (e as CustomEvent).detail))
    rowsOf(el)[0]!.querySelector<HTMLElement>('td[data-col="name"]')!.click()
    // 虚拟路径曾传 dataIndex=0（窗口内 0 基）→ 宿主映射错行
    expect(detail!.rowIndex).toBe(100)
  })

  it('F4 windowed × column-virtual：降级为普通渲染（devWarn 一次）+ 行窗口照常，不崩', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      'column-virtual': '',
      data: slice(0, 5),
    })
    expect(warn.mock.calls.some((c) => String(c[0]).includes('column-virtual'))).toBe(true)
    // 降级：不渲染列窗口占位格（全列普通渲染）
    expect(el.shadowRoot!.querySelector('.col-virtual-placeholder')).toBeNull()
    // 行窗口照常：首帧 init 请求 + 已装载行渲染
    expect(reqs.length).toBeGreaterThan(0)
    expect(rowsOf(el).length).toBeGreaterThan(0)
    warn.mockRestore()
  })

  it('F5 windowed × span-method：跳过本地合并（无 rowspan / 不吞格）+ devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '0')
    el.setAttribute('data', slice(0, 4))
    el.spanMethod = () => [2, 1]
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('td[rowspan]')).toBeNull()
    for (const tr of el.shadowRoot!.querySelectorAll('tbody tr.row')) {
      expect(tr.querySelectorAll('td[data-col]').length).toBe(2)
    }
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('merge')).length).toBe(1)
    warn.mockRestore()
  })

  it('F5 windowed × merge 列：跳过本地合并（行数不减 / 每行保留该列 td）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '0',
      columns: JSON.stringify([
        { key: 'name', title: '名称', merge: true },
        { key: 'age', title: '年龄' },
      ]),
      data: JSON.stringify([
        { name: 'A', age: 1 },
        { name: 'A', age: 2 },
        { name: 'A', age: 3 },
      ]),
    })
    const trs = [...el.shadowRoot!.querySelectorAll('tbody tr.row')]
    expect(trs.length).toBe(3)
    expect(el.shadowRoot!.querySelector('td[rowspan]')).toBeNull()
    for (const tr of trs) expect(tr.querySelectorAll('td[data-col="name"]').length).toBe(1)
    expect(warn.mock.calls.some((c) => String(c[0]).includes('merge'))).toBe(true)
    warn.mockRestore()
  })

  it('F3 切片越界（window-start + 装载行数 > total）：devWarn 一次（实例级去重）+ 越界行不进渲染窗口', () => {
    // 缺陷固化：越界（宿主给的切片超出全量范围）曾完全静默——宿主误以为切片全部生效。
    // 修复=显式提示一次（对齐 resource 同款契约）；不改渲染行为。
    // 注：非虚拟 windowed 以「已装载行即视口内容」为准（宿主给多少渲染多少，无本地夹取，
    // 见 requestWindowIfNeeded 注释），故越界行「不进 DOM」只在虚拟路径成立——本用例按虚拟
    // 路径断言，并补一条「未越界不告警」（非虚拟）对照。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const sliceMsgs = (): string[] =>
        warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('超出全量范围'))
      const { el } = mountWindowed({
        windowed: '',
        total: '10',
        'window-start': '8',
        height: '200',
        'row-height': '40',
        data: slice(8, 20),
      })
      expect(sliceMsgs().length, '切片越界告警一次').toBe(1)
      expect(sliceMsgs()[0], '告警含窗口起点').toContain('window-start 8')
      expect(sliceMsgs()[0], '告警含装载行数').toContain('装载 20 行')
      expect(sliceMsgs()[0], '告警含全量行数依据').toContain('total 10')
      expect(sliceMsgs()[0], '告警含越界行数').toContain('越界 18 行')
      const indexes = rowsOf(el).map((r) => Number(r.getAttribute('data-row-index')))
      expect(indexes.length, '有渲染行（未装载区域占位留白）').toBeGreaterThan(0)
      for (const n of indexes) {
        expect(n, `渲染行绝对行号 ${n} 应在 total 内`).toBeLessThan(10)
        expect(n, `渲染行绝对行号 ${n} 不应早于 window-start`).toBeGreaterThanOrEqual(8)
      }
      // 实例级去重：后续 update 不重复告警
      el.setAttribute('data', slice(8, 20))
      expect(sliceMsgs().length, '同实例只提示一次').toBe(1)
      // 未越界（切片恰在范围内）不告警
      warn.mockClear()
      const { el: ok } = mountWindowed({ windowed: '', total: '10', 'window-start': '8', data: slice(8, 2) })
      expect(sliceMsgs().length, '未越界不告警').toBe(0)
      expect(rowsOf(ok).length).toBe(2)
    } finally {
      warn.mockRestore()
    }
  })

  // ---- I3：windowed 切片回填后的焦点回锚 ----

  it('I3 焦点回锚：回填切片后聚焦行仍在窗口内 → 焦点与 gridPos 恢复到同一 row-key', () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      'row-key': 'name',
      data: slice(0, 20),
      'grid-navigation': '',
    })
    const nameTdOf = (key: string): HTMLElement =>
      el.shadowRoot!.querySelector<HTMLElement>(`tr[data-key="${key}"] td[data-col="name"]`)!
    // 聚焦行3 的 name 格（绝对行 3，列 0）
    nameTdOf('行3').focus()
    expect(el.shadowRoot!.activeElement).toBe(nameTdOf('行3'))
    // 宿主回填新切片（行3 仍在窗口内）：update 清空 tbody 曾把焦点一起拆掉
    el.setAttribute('data', slice(0, 40))
    const restored = el.shadowRoot!.activeElement as HTMLElement | null
    expect(restored, '回填后焦点应恢复').toBeTruthy()
    expect(restored!.tagName, '焦点应落在单元格上').toBe('TD')
    expect(restored!.closest('tr')!.getAttribute('data-key'), '应回锚到同一逻辑行（row-key）').toBe('行3')
    // gridPos 重映射：焦点回容器后按方向键应续接自锚行（而非切片首行）
    const wrap = wrapOf(el)
    wrap.focus()
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }),
    )
    expect(el.shadowRoot!.activeElement, 'gridPos 应已重映射到锚行坐标').toBe(nameTdOf('行3'))
    // 焦点在格上时方向键正常漫游（回锚不破坏网格导航）
    nameTdOf('行3').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }),
    )
    expect(el.shadowRoot!.activeElement!.closest('tr')!.getAttribute('data-key')).toBe('行4')
  })

  it('I3 虚拟窗口回填：锚行仍在窗口内恢复焦点；切片变化后锚行不在 → 不强行聚焦（不回退首行）', async () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      'row-key': 'name',
      height: '200',
      'row-height': '40',
      data: slice(0, 17),
      'grid-navigation': '',
    })
    const nameTdOf = (key: string): HTMLElement | null =>
      el.shadowRoot!.querySelector<HTMLElement>(`tr[data-key="${key}"] td[data-col="name"]`)
    // 滚到行 100 区域：可视 [97,110) → 期望 [89,118) 未装载 → 派发 scroll 请求
    const wrap = wrapOf(el)
    wrap.scrollTop = 4040
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs).toEqual([{ start: 89, end: 118, reason: 'scroll' }])
    // 宿主回填 [100,140)：渲染行 100 起，聚焦行103
    el.setAttribute('window-start', '100')
    el.setAttribute('data', slice(100, 40))
    const td103 = nameTdOf('行103')!
    expect(td103, '回填后行103 在渲染窗口内').toBeTruthy()
    td103.focus()
    expect(el.shadowRoot!.activeElement).toBe(td103)
    // 宿主再次回填（切片变化，行103 仍在新切片 [95,145) 内）→ 焦点应回锚到同一 row-key
    el.setAttribute('window-start', '95')
    el.setAttribute('data', slice(95, 50))
    const restored = el.shadowRoot!.activeElement as HTMLElement | null
    expect(restored, '切片变化后焦点应恢复').toBeTruthy()
    expect(restored!.closest('tr')!.getAttribute('data-key'), '回锚到同一逻辑行').toBe('行103')
    // 负例：换窗到行103 不在的切片（[95,103) 不含行103，但行97-102 仍可见）→ 不强行聚焦
    el.setAttribute('window-start', '95')
    el.setAttribute('data', slice(95, 8))
    const after = el.shadowRoot!.activeElement as HTMLElement | null
    const afterKey = after?.closest?.('tr.row')?.getAttribute('data-key') ?? ''
    expect(afterKey, '不回退到切片首行 行97').not.toBe('行97')
    // oas-window-request 行为不变：三次回填的期望区间同为 [89,118)（滚动位置未变）→
    // 按 need 去重不重派（data 原因仅在 need 变化时派发）；scroll 请求恰一次
    expect(reqs).toEqual([{ start: 89, end: 118, reason: 'scroll' }])
  })

  it('I3 非 windowed 不受影响：data 变化重建 tbody 不做焦点回锚（维持原行为）', () => {
    const { el } = mountWindowed({
      total: '100',
      'row-key': 'name',
      data: slice(0, 5),
      'grid-navigation': '',
    })
    const nameTdOf = (key: string): HTMLElement =>
      el.shadowRoot!.querySelector<HTMLElement>(`tr[data-key="${key}"] td[data-col="name"]`)!
    nameTdOf('行1').focus()
    el.setAttribute('data', slice(0, 6))
    // 非 windowed：无回锚机制（锚行行为与改动前一致——焦点不恢复）
    const active = el.shadowRoot!.activeElement as HTMLElement | null
    expect(active?.closest?.('tr.row')?.getAttribute('data-key') ?? '').not.toBe('行1')
  })

  it('I-1 滚动帧回锚：preventScroll 回锚不调 scrollIntoView、横向 scrollLeft 保持；update 回填路径保留 scrollIntoView', async () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      'row-key': 'name',
      height: '200',
      'row-height': '40',
      data: slice(0, 20),
      'grid-navigation': '',
    })
    const nameTdOf = (key: string): HTMLElement =>
      el.shadowRoot!.querySelector<HTMLElement>(`tr[data-key="${key}"] td[data-col="name"]`)!
    const wrap = wrapOf(el)
    // 聚焦行3 后横向滚动：滚动帧重建 tbody 曾用 focus() + scrollIntoView 把视口拉回锚格
    nameTdOf('行3').focus()
    expect(el.shadowRoot!.activeElement).toBe(nameTdOf('行3'))
    const target = el as unknown as { scrollCellIntoView: (td: HTMLTableCellElement) => void }
    const spy = vi.spyOn(target, 'scrollCellIntoView')
    wrap.scrollLeft = 300
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const restored = el.shadowRoot!.activeElement as HTMLElement | null
    expect(restored?.tagName, '滚动帧重建后焦点应回锚（preventScroll 路径）').toBe('TD')
    expect(restored!.closest('tr')!.getAttribute('data-key'), '回锚到同一 row-key').toBe('行3')
    expect(wrap.scrollLeft, '横向滚动位置不被回锚拉回').toBe(300)
    expect(spy, '滚动帧回锚不得调用 scrollIntoView（会把滚动位置拉回锚格）').not.toHaveBeenCalled()
    // gridPos 已重映射：方向键自锚行续接（回锚不破坏网格导航）
    restored!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }),
    )
    expect(el.shadowRoot!.activeElement!.closest('tr')!.getAttribute('data-key')).toBe('行4')
    // 对照：update 路径（宿主回填切片）保留 focus + scrollIntoView——保证回填后锚行可见
    spy.mockClear()
    el.setAttribute('data', slice(0, 40))
    const updated = el.shadowRoot!.activeElement as HTMLElement | null
    expect(updated?.closest('tr')?.getAttribute('data-key'), 'update 回填路径焦点仍回锚').toBe('行4')
    expect(spy, 'update 回填路径保留 scrollIntoView（锚行可见）').toHaveBeenCalled()
    spy.mockRestore()
  })
})
