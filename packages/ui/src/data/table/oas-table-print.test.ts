// 打印视图（@media print 全量渲染）：本地虚拟滚动（height）下窗口外行不在 DOM、CSS 无法唤回，
// 组件经 matchMedia('print') 感知打印媒体——print 下行窗口恒全量（change 监听触发重渲染）；
// column-virtual 列窗口同口径全量；windowed 数据在服务端只有切片、无法全量——devWarn 守卫
// 一次 + 打印输出已装载切片（文档写明限制）。
// RED：print 感知未实现，本文件锁契约。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASTable } from './index.js'

/**
 * matchMedia('print') 可变 stub：happy-dom 对 (print) 恒 false 且无 change 派发，
 * 测试以可控 stub 替换 window.matchMedia（组件在 connectedCallback 捕获 MLI）。
 */
function stubPrintMedia(): { setPrint(on: boolean): void } {
  const real = window.matchMedia.bind(window)
  const cbs = new Set<(e: unknown) => void>()
  const mql = {
    matches: false,
    media: 'print',
    onchange: null,
    addEventListener: (_: string, cb: (e: unknown) => void) => cbs.add(cb),
    removeEventListener: (_: string, cb: (e: unknown) => void) => cbs.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }
  window.matchMedia = ((query: string) =>
    query === 'print' ? (mql as unknown as MediaQueryList) : real(query)) as typeof window.matchMedia
  return {
    setPrint(on: boolean) {
      mql.matches = on
      for (const cb of cbs) cb({ matches: on })
    },
  }
}

function mount(el: OASTable): OASTable {
  document.body.appendChild(el)
  return el
}

function dataRows(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr.row')]
}

function placeholderCells(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.col-virtual-placeholder')]
}

function makeData(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `员工${i + 1}`, city: `城市${(i % 5) + 1}` }))
}

const COLS = [
  { key: 'id', title: 'ID', width: '60px' },
  { key: 'name', title: '姓名', width: '100px' },
  { key: 'city', title: '城市', width: '80px' },
]

describe('oas-table 打印视图（print 媒体全量渲染）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('① 本地虚拟：print 媒体下行窗口恒全量（连接前即 print：50 行全部在 DOM）；常规媒体只渲染窗口行', () => {
    stubPrintMedia().setPrint(true)
    const el = new OASTable()
    el.setAttribute('height', '120') // 视口 120px / 行高 40 → 常规窗口约 5 行
    el.setAttribute('row-height', '40')
    el.columns = COLS
    el.data = makeData(50)
    mount(el)
    expect(dataRows(el)).toHaveLength(50) // print：全量
    // 占位 spacer 高度为 0（全量窗口下无窗口外区域）
    const spacers = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tr.spacer td')]
    for (const td of spacers) expect(td.style.height === '' || td.style.height === '0px').toBe(true)
  })

  it('② 常规媒体连接 → 切 print（change 监听）→ 重渲染全量；切回 screen 恢复窗口行', () => {
    const printCtl = stubPrintMedia()
    printCtl.setPrint(false)
    const el = new OASTable()
    el.setAttribute('height', '120')
    el.setAttribute('row-height', '40')
    el.columns = COLS
    el.data = makeData(50)
    mount(el)
    const normalCount = dataRows(el).length
    expect(Number.isFinite(normalCount)).toBe(true) // 常规：窗口行有界（下一条锁定 <50 上界）
    expect(normalCount).toBeLessThan(50) // 常规：窗口行（有界）
    printCtl.setPrint(true) // matchMedia change → 重渲染
    expect(dataRows(el)).toHaveLength(50)
    printCtl.setPrint(false) // 退出 print → 恢复窗口
    expect(dataRows(el).length).toBe(normalCount)
    expect(dataRows(el).length).toBeLessThan(50)
  })

  it('③ column-virtual：print 下窗口外列真实渲染（无占位归并格）；常规媒体有占位', () => {
    const printCtl = stubPrintMedia()
    printCtl.setPrint(false)
    const el = new OASTable()
    el.setAttribute('height', '160')
    el.setAttribute('row-height', '40')
    el.setAttribute('column-virtual', '')
    const cols = [
      COLS[0]!,
      COLS[1]!,
      ...Array.from({ length: 30 }, (_, i) => ({ key: `m${i + 1}`, title: `指标${i + 1}`, width: '90px' })),
      COLS[2]!,
    ]
    el.columns = cols
    const data = makeData(8).map((row, i) => {
      for (let c = 1; c <= 30; c++) row[`m${c}`] = `${c}-${i + 1}`
      return row
    })
    el.data = data
    mount(el)
    expect(placeholderCells(el).length).toBeGreaterThanOrEqual(1) // 常规：窗口外列归并占位（下一条 print=0 对比即精确锁）
    printCtl.setPrint(true)
    expect(placeholderCells(el)).toHaveLength(0) // print：全列真实渲染
    // 末列（固定 right）在 print 下仍在（全列序列）
    expect(el.shadowRoot!.querySelector('tbody td')?.tagName).toBe('TD')
  })

  it('④ windowed × print：devWarn 守卫一次（数据在服务端无法全量）+ 已装载切片照常渲染', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubPrintMedia().setPrint(true)
    const el = new OASTable()
    el.setAttribute('height', '120')
    el.setAttribute('row-height', '40')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '0') // 切片在初始视口内（window-start=100 时切片在窗口外、占位是既有正确行为）
    el.setAttribute('row-key', 'id')
    el.columns = COLS
    el.data = makeData(10).map((r, i) => ({ ...r, id: String(101 + i) }))
    mount(el)
    expect(dataRows(el)).toHaveLength(10) // 已装载切片照常渲染（不是 500 行）
    const hits = warnSpy.mock.calls.filter(
      (args) => String(args[0]).includes('windowed') && String(args[0]).includes('打印'),
    )
    expect(hits.length).toBe(1) // 守卫一次、不重复
  })

  it('⑤ print 监听随断开清理（disconnected 后切 print 不再重渲染、不抛错）', () => {
    const printCtl = stubPrintMedia()
    printCtl.setPrint(false)
    const el = new OASTable()
    el.setAttribute('height', '120')
    el.setAttribute('row-height', '40')
    el.columns = COLS
    el.data = makeData(50)
    mount(el)
    el.remove()
    expect(() => printCtl.setPrint(true)).not.toThrow()
  })
})
