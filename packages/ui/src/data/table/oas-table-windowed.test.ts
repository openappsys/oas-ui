import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
// v2.6.4 起默认入口不含编辑；本文件覆盖编辑交互，显式注册。
import './edit/index.js'

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
  /** 视觉映射 / 视觉协议生效时附带的可视窗口视觉坐标（旧路径无此字段） */
  visualStart?: number
  visualEnd?: number
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
    reqs.push({ start: d.start, end: d.end, reason: d.reason, visualStart: d.visualStart, visualEnd: d.visualEnd })
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

  // ---- windowed × 行内嵌 expand：expand 行在视觉 flow 中占一根行高、但不占绝对数据行号 ----
  //
  // 缺陷固化：renderWindowedBody 曾只按 abs（数据行号）给 display 条目铺位，expand 不递增——
  // 而 expand 又是独立定高 <tr>，在 DOM flow 中实际多占一行高。后果：expand 与下一数据行
  // 共享槽位 → 后续行错位、tbody 总高随滚动裁剪漂移、窗口边界下一数据行被误裁剪/误纳入。

  /** windowed+expand 记账回归共用 fixture：行50..55 共 6 行，行51 带 expand 内容且展开 */
  const mountWindowedExpand = (): { el: OASTable } =>
    mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '50',
      height: '200',
      'row-height': '40',
      'row-key': 'name',
      data: JSON.stringify([
        { name: '行50', age: 20 },
        { name: '行51', age: 21, expand: '<div>详情51</div>' },
        { name: '行52', age: 22 },
        { name: '行53', age: 23 },
        { name: '行54', age: 24 },
        { name: '行55', age: 25 },
      ]),
      expanded: '行51',
    })

  /** tbody 总高 = spacer td 的 style.height + 非 spacer tr 的 style.height（windowed 定高记账口径） */
  const tbodyHeight = (el: OASTable): number =>
    trsOf(el).reduce((sum, tr) => {
      if (tr.classList.contains('spacer')) {
        return sum + parseFloat((tr.firstElementChild as HTMLElement).style.height || '0')
      }
      return sum + parseFloat(tr.style.height || '0')
    }, 0)

  it('windowed × 行内嵌 expand：DOM 顺序与绝对数据行号不受影响，tbody 总高含 expand 槽位（4040）且不随滚动漂移', async () => {
    const { el } = mountWindowedExpand()
    const wrap = wrapOf(el)
    wrap.scrollTop = 2000
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // DOM 顺序：行51 → expand-row → 行52（expand 独立 <tr> 紧随数据行占一根行高的视觉槽位）
    const trs = trsOf(el)
    const i51 = trs.findIndex((tr) => (tr.textContent ?? '').includes('行51'))
    expect(trs[i51]!.getAttribute('data-row-index'), '行51 绝对数据行号不变').toBe('51')
    expect(trs[i51 + 1]!.className, 'expand 内容行紧随行51').toContain('expand-row')
    expect(trs[i51 + 1]!.hasAttribute('data-row-index'), 'expand 不写绝对数据行号').toBe(false)
    expect(trs[i51 + 2]!.getAttribute('data-row-index'), '行52 绝对数据行号不被 expand 占用').toBe('52')
    // 总高 = total*40 + 当前已装载 display 中的 expand 数*40 = 4000 + 40
    expect(tbodyHeight(el), 'scrollTop=2000 总高含 expand 槽位').toBe(4040)
    // 滚动后总高稳定（缺陷实现 expand 不入账：4000）
    wrap.scrollTop = 2280
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(tbodyHeight(el), 'scrollTop=2280 总高不随滚动漂移').toBe(4040)
  })

  it('windowed × 行内嵌 expand：窗口边界 culling 按 flow 槽位（下一数据行不被共享槽位误裁剪/误纳入）', async () => {
    const { el } = mountWindowedExpand()
    const wrap = wrapOf(el)
    // 窗口下缘恰落在「共享槽（abs 记账）/flow 槽（实际 DOM flow）」之间：
    // 可视窗口 [1560,2120)（含 buffer），行52 的 flow 槽位为 [2120,2160) → 不得纳入
    wrap.scrollTop = 1740
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const rendered = rowsOf(el).map((r) => r.getAttribute('data-row-index'))
    expect(rendered, '只渲染行50、行51（行52 的 flow 槽位在窗口外，不误纳入）').toEqual(['50', '51'])
    expect(el.shadowRoot!.querySelectorAll('tbody tr.expand-row').length, 'expand 行照常渲染').toBe(1)
    expect(tbodyHeight(el), '总高 4040（total*40 + expand 槽位）').toBe(4040)
    const trs = trsOf(el)
    const lastTr = trs[trs.length - 1]!
    expect(lastTr.className, '末行是 bottom spacer').toContain('spacer')
    expect(
      (lastTr.firstElementChild as HTMLElement).style.height,
      'bottom spacer = contentH - lastFlowEnd = 4040 - 2120（缺陷实现 1880）',
    ).toBe('1920px')
  })

  it('windowed × 行内嵌 expand：末行数据的 expand 不被渲染窗口上界裁掉（winBottom ≤ total*ih 幽灵空白）', async () => {
    // 缺陷固化：渲染窗口 count 用数据 total 时 win.end ≤ total → winBottom ≤ total*40，
    // 末行数据的 expand（flowY = total*40）恒被 culling 裁掉；contentH 又计入它 → 底部幽灵空白。
    // fixture：3 行数据，row0 与末行 row2 都展开（200 视口恰容纳 3 行 + 2 expand = 200px）
    const { el } = mountWindowed({
      windowed: '',
      total: '3',
      height: '200',
      'row-height': '40',
      'row-key': 'name',
      data: JSON.stringify([
        { name: '行0', age: 20, expand: '<div>详情0</div>' },
        { name: '行1', age: 21 },
        { name: '行2', age: 22, expand: '<div>详情2</div>' },
      ]),
      expanded: '行0,行2',
    })
    const trs = trsOf(el)
    // 两个 expand 内容行都渲染（缺陷实现只剩 row0 的：末行 expand 被窗口上界裁掉）
    expect(el.shadowRoot!.querySelectorAll('tbody tr.expand-row').length, '两个 expand 行都渲染').toBe(2)
    // 末行 expand 紧随 row2（row2 也要在渲染集合内）
    const i2 = trs.findIndex((tr) => tr.getAttribute('data-row-index') === '2')
    expect(i2, '末行数据 row2 在渲染集合').toBeGreaterThanOrEqual(0)
    expect(trs[i2 + 1]!.className, '最后一个 expand 紧随 row2').toContain('expand-row')
    expect(trs[i2 + 1]!.textContent, '末行 expand 内容为 row2 的').toContain('详情2')
    // 数据行号与 ARIA 全量口径不变
    expect(
      rowsOf(el).map((r) => r.getAttribute('data-row-index')),
      '数据行号不被 expand 占用',
    ).toEqual(['0', '1', '2'])
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'), 'aria-rowcount 仍为数据 total').toBe(
      '3',
    )
    // 总高 = 3*40 + 2*40 = 200（恰等于视口，无滚动）；bottom spacer 为 0（无幽灵空白）
    expect(tbodyHeight(el), 'tbody 总高 = 200').toBe(200)
    const lastTr = trs[trs.length - 1]!
    expect(lastTr.className, '末行是 bottom spacer').toContain('spacer')
    expect((lastTr.firstElementChild as HTMLElement).style.height, 'bottom spacer = 0px（缺陷实现 80px）').toBe('0px')
  })

  it('windowed 越界切片：越界行及其 expand 不进渲染窗口，最后合法行的 expand 保留（F3 补口）', async () => {
    // 缺陷固化：渲染窗口 count 用 total + expandCount 后，越界行自己的已展开 expand 会抬高
    // winBottom，使 abs >= total 的越界数据行重新渲染——违反既有「越界行不渲染」契约（F3）。
    // fixture：total=100，切片 [95,105) 越界（末 5 行越界）；行95 expand='合法95'（合法）、
    // 行100 expand='越界100'（越界行自己的 expand）。滚到装载区底部。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountWindowed({
        windowed: '',
        total: '100',
        'window-start': '95',
        height: '200',
        'row-height': '40',
        'row-key': 'name',
        data: JSON.stringify(
          Array.from({ length: 10 }, (_, i) => ({
            name: `行${95 + i}`,
            ...(i === 0 ? { expand: '合法95' } : {}),
            ...(i === 5 ? { expand: '越界100' } : {}),
          })),
        ),
        expanded: '行95,行100',
      })
      const wrap = wrapOf(el)
      wrap.scrollTop = 3800
      wrap.dispatchEvent(new Event('scroll'))
      await flushRaf()
      // 数据行号仅 95..99：越界行100 不得因 expand 抬窗而重新渲染
      expect(
        rowsOf(el).map((r) => r.getAttribute('data-row-index')),
        '数据行号仅 95..99',
      ).toEqual(['95', '96', '97', '98', '99'])
      // 只有合法行95 一个 expand；越界100 的 expand 不随行渲染
      expect(el.shadowRoot!.querySelectorAll('tbody tr.expand-row').length, '只有合法95一个 expand').toBe(1)
      // 断言限定 tbody（shadow 整体 textContent 含 style 内中文，不可作子串判据）
      const bodyText = el.shadowRoot!.querySelector('tbody')!.textContent ?? ''
      expect(bodyText, '无越界行100 内容').not.toContain('行100')
      expect(bodyText, '无越界100 expand 内容').not.toContain('越界100')
      // 合法行95 的 expand 保留
      expect(bodyText, '合法行 expand 保留').toContain('合法95')
      // ARIA 全量口径不变
      expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'), 'aria-rowcount=100').toBe('100')
      // 既有切片越界 devWarn 仍在（只核对含既有提示，不断言零告警）
      const msgs = warn.mock.calls.map((c) => String(c[0]))
      expect(
        msgs.some((m) => m.includes('超出全量范围')),
        '既有切片越界 devWarn 仍在',
      ).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })
})

// ==================== 视觉映射与可选视觉协议（visual-total / visual-start） ====================

/**
 * 目标：
 * 1. 本地 expand>12：渲染与请求共用 abs/flow 映射，请求区间覆盖真实可见数据行
 *    （含 expand 属主行），不再按均匀 data 网格猜测；start/end 永远数据坐标，
 *    visualStart/visualEnd 为可视窗口的视觉坐标（附加字段）。
 * 2. 可选 visual-total / visual-start 协议：切片前已有展开的宿主场景——协议生效时
 *    flow 从 visual-start×行高起、渲染 count=visual-total，展开由宿主完全控制
 *    （本地 toggle 只发 oas-expand + devWarn，不改 expanded）。
 * 3. abs / ARIA / displaySnapshot / 焦点 / 非 windowed 路径不变；协议缺失/非法整体回落。
 */

/** tbody 记账总高（spacer td 的 style.height + 非 spacer tr 的 style.height） */
function tbodyAccountedHeight(el: OASTable): number {
  return trsOf(el).reduce((sum, tr) => {
    if (tr.classList.contains('spacer')) {
      return sum + parseFloat((tr.firstElementChild as HTMLElement).style.height || '0')
    }
    return sum + parseFloat(tr.style.height || '0')
  }, 0)
}

describe('OASTable windowed × 视觉映射（expand>12 请求映射）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('本地全展开 >12：请求区间按 abs/flow 映射覆盖真实可见行（含 expand 属主），visualStart/End 为可视视觉坐标', async () => {
    // fixture：window-start=100 / total=1000 / 41 行全部带 expand 且展开 / scrollTop=4440。
    // 视觉行数 = 1000 + 41 = 1041；可视窗口（视觉坐标）= [107,120) → flow [4280,4800)。
    // 相交条目：data 104..109 与 expand 103..109（expand 条目回连属主数据行 [abs-1, abs)），
    // 最小 start=103 / 最大 end=110 → ±margin → 期望 [95,118)（旧均匀 data 网格为 [99,128)）。
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '100',
      height: '200',
      'row-height': '40',
      'row-key': 'name',
      data: JSON.stringify(
        Array.from({ length: 41 }, (_, i) => ({
          name: `行${100 + i}`,
          age: 20 + i,
          expand: `<div>详情${100 + i}</div>`,
        })),
      ),
      expanded: Array.from({ length: 41 }, (_, i) => `行${100 + i}`).join(','),
    })
    expect(reqs[0], '首帧 init 请求（无相交条目 → 回退可视窗口区间，附带视觉字段）').toEqual({
      start: 0,
      end: 17,
      reason: 'init',
      visualStart: 0,
      visualEnd: 9,
    })
    const wrap = wrapOf(el)
    wrap.scrollTop = 4440
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const scrollReq = reqs.find((r) => r.reason === 'scroll')
    expect(scrollReq, '滚动后应派发 scroll 请求').toBeTruthy()
    // start/end 仍是数据坐标（覆盖真实可见数据行 104..109 与 expand 属主 103..109）
    expect(scrollReq!.start, '映射后数据 start=103-8=95（旧均匀网格 99）').toBe(95)
    expect(scrollReq!.end, '映射后数据 end=110+8=118').toBe(118)
    // visualStart/visualEnd 为可视窗口的视觉坐标（不是切片 visual-start）
    expect(scrollReq!.visualStart, '可视窗口视觉起点 107').toBe(107)
    expect(scrollReq!.visualEnd, '可视窗口视觉终点 120（不含）').toBe(120)
    // 渲染真实可见行：数据行 104..109 与其 expand（属主行内容在 DOM）
    expect(
      rowsOf(el).map((r) => r.getAttribute('data-row-index')),
      '真实可见数据行 104..109',
    ).toEqual(['104', '105', '106', '107', '108', '109'])
    const bodyText = el.shadowRoot!.querySelector('tbody')!.textContent ?? ''
    expect(bodyText, '可见 expand 属主 103 的内容行在 DOM').toContain('详情103')
    expect(bodyText, '可见 expand 属主 109 的内容行在 DOM').toContain('详情109')
  })

  it('展开数变化使可视区间变化时，即使数据 need 相同也重新派发；同窗口（含视觉字段）不重复派发', async () => {
    // fixture：total=100 / window-start=92 / 8 行全展开（视觉行数 108）/ scrollTop=4120。
    // 可视窗口（视觉）= [99,108) → 相交条目 min start=95 / max end=100 → [87,100)。
    // 折叠行92 → 视觉行数 107 → scrollTop 4120 视觉窗口变为 [98,107)，相交映射仍为 [87,100)
    // （数据 need 相同）→ 视觉字段变化 → 必须重派；再滚动（一切未变）→ 同窗口不重派。
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '92',
      height: '200',
      'row-height': '40',
      'row-key': 'name',
      data: JSON.stringify(
        Array.from({ length: 8 }, (_, i) => ({
          name: `行${92 + i}`,
          age: 20 + i,
          expand: `<div>详情${92 + i}</div>`,
        })),
      ),
      expanded: Array.from({ length: 8 }, (_, i) => `行${92 + i}`).join(','),
    })
    const wrap = wrapOf(el)
    wrap.scrollTop = 4120
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.at(-1), '折叠前：视觉窗口 [99,108) → 期望 [87,100)').toEqual({
      start: 87,
      end: 100,
      reason: 'scroll',
      visualStart: 99,
      visualEnd: 108,
    })
    // 宿主回写 expanded（折叠行92）：视觉行数 108→107 → 可视窗口 [99,108)→[98,107)
    el.setAttribute('expanded', Array.from({ length: 7 }, (_, i) => `行${93 + i}`).join(','))
    expect(reqs.at(-1), '数据 need 同为 [87,100) 但视觉字段变化 → 必须重派（reason=data）').toEqual({
      start: 87,
      end: 100,
      reason: 'data',
      visualStart: 98,
      visualEnd: 107,
    })
    // 再触发滚动（位置未变、窗口未变）→ 同窗口（含视觉字段）不重复派发
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.filter((r) => r.reason === 'data').length, 'data 原因仅派发一次').toBe(1)
    expect(reqs.length, '总派发数不变（同窗口去重）').toBe(3)
  })
})

describe('OASTable windowed × 可选视觉协议（visual-total / visual-start）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** 协议 fixture：visual-start=57 / visual-total=2000 / window-start=50 / data 50..55（行51 expand） */
  const mountVisual = (extra: Record<string, string> = {}): { el: OASTable; reqs: WinReq[] } =>
    mountWindowed({
      windowed: '',
      total: '100',
      'visual-total': '2000',
      'visual-start': '57',
      'window-start': '50',
      height: '200',
      'row-height': '40',
      'row-key': 'name',
      data: JSON.stringify([
        { name: '行50', age: 20 },
        { name: '行51', age: 21, expand: '<div>详情51</div>' },
        { name: '行52', age: 22 },
        { name: '行53', age: 23 },
        { name: '行54', age: 24 },
        { name: '行55', age: 25 },
      ]),
      expanded: '行51',
      ...extra,
    })

  it('协议生效：flow 从 visual-start×行高起、contentH=visual-total×行高；请求附带视觉字段', async () => {
    const { el, reqs } = mountVisual()
    // 首帧（scrollTop=0）：可视窗口 [0,9) 与切片（flow 2280 起）无相交 → 回退数据区间 [0,17)
    expect(reqs[0]).toEqual({ start: 0, end: 17, reason: 'init', visualStart: 0, visualEnd: 9 })
    const wrap = wrapOf(el)
    wrap.scrollTop = 2280
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 可视窗口（视觉坐标，count=2000）：[53,66)；相交条目：data50..55 + expand51（属主 50）
    // → min start=50 / max end=56 → ±margin → [42,64)
    expect(reqs.at(-1), '请求 start/end 为数据坐标、视觉字段为可视窗口坐标').toEqual({
      start: 42,
      end: 64,
      reason: 'scroll',
      visualStart: 53,
      visualEnd: 66,
    })
    // 渲染按视觉坐标铺位：data50 flow=57*40=2280 落在窗口内全部渲染；总高 = 2000*40 = 80000
    expect(tbodyAccountedHeight(el), 'contentH = visual-total × 行高 = 80000（非协议为 4040）').toBe(80000)
    expect(
      rowsOf(el).map((r) => r.getAttribute('data-row-index')),
      '切片数据行全部渲染',
    ).toEqual(['50', '51', '52', '53', '54', '55'])
  })

  it('协议生效：abs / data-row-index / aria-rowindex / displaySnapshot 口径不变', async () => {
    const { el } = mountVisual()
    // 协议下行50 位于视觉行 57（flow 2280）——滚动到切片起点才有渲染行可断言
    const wrap = wrapOf(el)
    wrap.scrollTop = 2280
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'), 'aria-rowcount 仍为数据 total').toBe(
      '100',
    )
    const idx = [...el.shadowRoot!.querySelectorAll('tbody tr.row')].map((tr) => tr.getAttribute('aria-rowindex'))
    expect(idx, 'aria-rowindex 仍为绝对数据行号 1 基（51..56，不被视觉行号影响）').toEqual([
      '51',
      '52',
      '53',
      '54',
      '55',
      '56',
    ])
    expect(rowsOf(el).map((r) => r.getAttribute('data-row-index'))).toEqual(['50', '51', '52', '53', '54', '55'])
    const snapshot = el.getDisplaySnapshot()!
    expect(snapshot.rowIndexByKey.get('行51'), 'displaySnapshot 行键 → 绝对数据行号不变').toBe(51)
    expect(snapshot.flatIndexByKey.get('行51'), 'displaySnapshot 扁平序仍为数据行口径（expand 不占号）').toBe(51)
  })

  it('协议生效：本地 toggle 不改 expanded，只发一次 oas-expand + devWarn 一次；未生效仍本地 toggle', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountVisual({ expanded: '' })
      // 协议下行50 位于视觉行 57（flow 2280）——滚动到切片起点行才渲染、展开钮可达
      const wrap = wrapOf(el)
      wrap.scrollTop = 2280
      wrap.dispatchEvent(new Event('scroll'))
      await flushRaf()
      const details: Array<{ key: string; expanded: boolean }> = []
      el.addEventListener('oas-expand', (e) => details.push((e as CustomEvent).detail))
      const btn = el.shadowRoot!.querySelector<HTMLElement>('tr[data-key="行51"] .expand-toggle-cell button.toggle')!
      expect(btn, '行51 有展开钮').toBeTruthy()
      btn.click()
      expect(details, '派发一次 oas-expand（宿主通道）').toEqual([{ key: '行51', expanded: true }])
      expect(el.getAttribute('expanded'), '本地不改 expanded（宿主完全控制）').toBe('')
      expect(el.shadowRoot!.querySelector('tbody tr.expand-row'), '不本地展开（等宿主回写）').toBeNull()
      expect(warn.mock.calls.length, 'devWarn 一次').toBe(1)
      btn.click()
      expect(details.length, '再次点击仍派发 oas-expand').toBe(2)
      expect(warn.mock.calls.length, 'devWarn 实例级去重（仍一次）').toBe(1)
      warn.mockRestore()
      // 对照：未提供协议 → 本地 toggle 照旧（写 expanded + 本地重渲染展开行）
      const warn2 = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const el2 = mountWindowed({
        windowed: '',
        total: '100',
        'window-start': '50',
        height: '200',
        'row-height': '40',
        'row-key': 'name',
        data: JSON.stringify([
          { name: '行50', age: 20 },
          { name: '行51', age: 21, expand: '<div>详情51</div>' },
          { name: '行52', age: 22 },
          { name: '行53', age: 23 },
          { name: '行54', age: 24 },
          { name: '行55', age: 25 },
        ]),
        expanded: '',
      })
      // 非 windowed 协议模型：flow 从 window-start×40=2000 起，滚到切片起点行才渲染
      const wrap2 = wrapOf(el2.el)
      wrap2.scrollTop = 2000
      wrap2.dispatchEvent(new Event('scroll'))
      await flushRaf()
      const btn2 = el2.el.shadowRoot!.querySelector<HTMLElement>(
        'tr[data-key="行51"] .expand-toggle-cell button.toggle',
      )!
      btn2.click()
      expect(el2.el.getAttribute('expanded'), '未提供协议：本地 toggle 照旧写 expanded').toBe('行51')
      expect(el2.el.shadowRoot!.querySelector('tbody tr.expand-row'), '未提供协议：本地展开渲染').not.toBeNull()
      expect(warn2.mock.calls.filter((c) => String(c[0]).includes('视觉协议')).length, '未提供协议：无协议告警').toBe(0)
      warn2.mockRestore()
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('协议回落：只有其一 / 非法值 / visual-total < 数据 total → devWarn 一次并整体回落当前模型', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const caseMsgs = (): string[] => warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('视觉协议'))
      // 只有 visual-total（缺 visual-start）
      const a = mountVisual()
      a.el.removeAttribute('visual-start')
      expect(caseMsgs().length, '只有其一 → 告警一次').toBe(1)
      expect(tbodyAccountedHeight(a.el), '回落当前模型：contentH = total*40 + expand 槽位').toBe(4040)
      // 非法 visual-total
      warn.mockClear()
      const b = mountVisual({ 'visual-total': 'abc' })
      expect(caseMsgs().length, '非法值 → 告警一次').toBe(1)
      expect(tbodyAccountedHeight(b.el), '非法值回落：contentH = 4040').toBe(4040)
      // visual-total < 数据 total
      warn.mockClear()
      const c = mountVisual({ 'visual-total': '50' })
      expect(caseMsgs().length, 'visual-total < 数据 total → 告警一次').toBe(1)
      expect(trsOf(c.el).length).toBeGreaterThan(0)
      // 实例级去重：同实例重渲染不重复告警
      c.el.setAttribute('data', c.el.getAttribute('data')!)
      expect(caseMsgs().length, '同实例只提示一次').toBe(1)
      // 两个属性都在场且合法 → 不告警
      warn.mockClear()
      mountVisual()
      expect(caseMsgs().length, '协议合法生效不告警').toBe(0)
      // 两属性都缺席 → 静默（不告警，保留现有模型）
      warn.mockClear()
      mountWindowed({ windowed: '', total: '100', 'window-start': '50', data: JSON.stringify([{ name: '行50' }]) })
      expect(caseMsgs().length, '协议属性全缺席 → 静默').toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('协议越界：visual-start + display 条目数 > visual-total → devWarn 一次且界外条目不渲染', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // visual-total=60（≥ 数据 total=60，协议合法）；visual-start=57 + 7 条目（6 数据 + 1 expand）
      // = 64 > 60 → 越界告警；界外条目（flow ≥ 60*40=2400：data52..55）由视觉窗口裁掉不渲染
      const { el } = mountVisual({ total: '60', 'visual-total': '60' })
      const msgs = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('视觉窗口越界'))
      expect(msgs.length, '越界告警一次').toBe(1)
      const wrap = wrapOf(el)
      wrap.scrollTop = 2280
      wrap.dispatchEvent(new Event('scroll'))
      await flushRaf()
      // 可视窗口（count=60）：[53,60) → flow [2120,2400)：data50@2280、expand51@2320、data51@2360 在窗口内；
      // data52@2400 起全部界外
      expect(
        rowsOf(el).map((r) => r.getAttribute('data-row-index')),
        '界外条目 data52..55 不渲染',
      ).toEqual(['50', '51'])
      expect(el.shadowRoot!.querySelector('tbody tr.expand-row'), '窗口内的 expand51 照常渲染').not.toBeNull()
      // ARIA 全量口径不变
      expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('60')
      // 重渲染不重复告警
      el.setAttribute('data', el.getAttribute('data')!)
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('视觉窗口越界')).length, '仍一次').toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('协议生效：键盘越界请求的数据 need 仍由目标 abs 决定，visualStart/End 按当前可视窗口补齐', async () => {
    const { el, reqs } = mountVisual({ 'grid-navigation': '' })
    const wrap = wrapOf(el)
    wrap.scrollTop = 2280
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.at(-1), '滚动请求先行（可视窗口 [53,66)）').toEqual({
      start: 42,
      end: 64,
      reason: 'scroll',
      visualStart: 53,
      visualEnd: 66,
    })
    const lastTd = rowsOf(el)[5]!.querySelector<HTMLElement>('td[data-col="name"]')!
    lastTd.focus()
    lastTd.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }),
    )
    // 目标绝对行 56 → expandWindow(56,57,100,8) = [48,65)；visualStart/End 按当前可视窗口 [53,66) 补齐
    expect(reqs.at(-1), '数据 need 由目标 abs 决定，视觉字段补齐').toEqual({
      start: 48,
      end: 65,
      reason: 'scroll',
      visualStart: 53,
      visualEnd: 66,
    })
  })
})
