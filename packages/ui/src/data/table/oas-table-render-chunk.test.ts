import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
// structural-render 能力注册：bodyRow 结构槽回调需能力注入后才真正执行（晚注册也生效，见
// late-structural-capability.test.ts；本文件结构槽用例依赖注册后的回调分发）
import './structural-render/index.js'

/**
 * render-chunk 分批渲染（时间切片）单测：fake rAF 手动推进帧，确定性断言
 * 首帧 chunk 数 / 逐帧追加 / 最终完整 / 代次取消 / 断连取消 / 缺省零漂移 /
 * 虚拟同开告警 / 分批期间选择变更 / 分组与结构槽同口径 / merge 末帧归并 / 合计末帧落位。
 *
 * 对应 PRD「未发布：table 公共能力补齐批」批 D（渲染组织 / 时间切片）。
 */

type RafCb = () => void

let rafHandles: Map<number, RafCb>
let rafSeq = 0

/**
 * matchMedia('print') 可变 stub（同 oas-table-print.test.ts 口径）：happy-dom 对 (print) 恒 false
 * 且无 change 派发，测试以可控 stub 替换 window.matchMedia（组件在 connectedCallback 捕获 MLI）。
 * 原始引用在模块加载时捕获一次：stub 内部与 afterEach 统一恢复都用它——否则每层 stub 会套住
 * 上一层（`real` 取自当前 window.matchMedia），后例靠前例残留状态自救，顺序耦合。
 */
const originalMatchMedia = window.matchMedia

function stubPrintMedia(): { setPrint(on: boolean): void } {
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
    query === 'print'
      ? (mql as unknown as MediaQueryList)
      : originalMatchMedia.call(window, query)) as typeof window.matchMedia
  return {
    setPrint(on: boolean) {
      mql.matches = on
      for (const cb of cbs) cb({ matches: on })
    },
  }
}

function stubRaf(): void {
  rafHandles = new Map()
  vi.stubGlobal('requestAnimationFrame', (cb: RafCb): number => {
    const id = ++rafSeq
    rafHandles.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    rafHandles.delete(id)
  })
}

/** 手动推进 n 个 rAF 帧（每帧执行本帧开始时排队的回调；帧内新排入的下一帧再算） */
function flushRafFrames(n: number): void {
  for (let f = 0; f < n; f++) {
    const pending = [...rafHandles.values()]
    rafHandles.clear()
    for (const cb of pending) cb()
  }
}

/** 推进直到无待执行帧（分批渲染跑完）；防死循环上限 */
function flushRafAll(maxFrames = 100): void {
  for (let f = 0; f < maxFrames && rafHandles.size > 0; f++) flushRafFrames(1)
}

const COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄' },
])

const rowData = (n: number): string =>
  JSON.stringify(Array.from({ length: n }, (_, i) => ({ name: `用户 ${i + 1}`, age: i + 1 })))

function mount(attrs: Record<string, string> = {}, dataN = 300): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', COLUMNS)
  el.setAttribute('row-key', 'name')
  el.setAttribute('data', rowData(dataN))
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

const bodyRows = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('tbody tr')] as HTMLElement[]
const dataRows = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('tbody tr.row')] as HTMLElement[]

describe('OASTable render-chunk 分批渲染（时间切片）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    stubRaf()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    // 恢复原始 matchMedia（stubPrintMedia 直接赋值替换，vi.unstubAllGlobals 管不到）：
    // 每个用例自带 print 态，不再依赖前一个用例的残留或自救
    window.matchMedia = originalMatchMedia
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('首帧只渲染 chunk 行，aria-rowcount 首帧即写全量（读屏行数与最终一致）', () => {
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length, '首帧 = chunk 行').toBe(100)
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'), '首帧即全量行数').toBe('300')
    expect(rafHandles.size, '在途分批帧已排队').toBe(1)
  })

  it('逐帧追加：每帧恰好 chunk 行，直至完整且行序不变', () => {
    const el = mount({ 'render-chunk': '100' })
    flushRafFrames(1)
    expect(dataRows(el).length).toBe(200)
    flushRafFrames(1)
    expect(dataRows(el).length).toBe(300)
    expect(rafHandles.size, '追加完毕不再排帧').toBe(0)
    const rows = dataRows(el)
    expect(rows[0]!.getAttribute('data-key'), '行序不漂移').toBe('用户 1')
    expect(rows[299]!.getAttribute('data-key')).toBe('用户 300')
    expect(rows[299]!.getAttribute('aria-rowindex'), '末行 aria-rowindex 逐帧补齐').toBe('300')
    // 合计/底部状态行缺席时，数据行即 tbody 全部
    expect(bodyRows(el).length).toBe(300)
  })

  it('缺省 / 0 / 非法值 = 全量同步渲染（零行为漂移，不排任何 rAF 帧）', () => {
    const cases: Record<string, string>[] = [
      {},
      { 'render-chunk': '0' },
      { 'render-chunk': 'abc' },
      { 'render-chunk': '-5' },
    ]
    for (const attr of cases) {
      document.body.innerHTML = ''
      rafHandles.clear()
      const el = mount(attr)
      expect(dataRows(el).length, `render-chunk=${JSON.stringify(attr)} 时全量同步渲染`).toBe(300)
      expect(rafHandles.size, '全量同步路径不排分批帧').toBe(0)
    }
  })

  it('display 行数 ≤ chunk：一轮铺完，行为与全量同步逐字节一致', () => {
    const el = mount({ 'render-chunk': '500' }, 20)
    expect(dataRows(el).length).toBe(20)
    expect(rafHandles.size).toBe(0)
  })

  it('一轮铺完 + 合计行：恰好一行合计且值正确（统一尾程单份落位，防双份回归）', () => {
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '500')
    el.setAttribute('summary', JSON.stringify([{ key: 'age', type: 'sum' }]))
    el.setAttribute('data', rowData(20))
    document.body.appendChild(el)
    expect(dataRows(el).length).toBe(20)
    const summaries = el.shadowRoot!.querySelectorAll('[part="summary-row"]')
    expect(summaries.length, '合计行恰好一行').toBe(1)
    expect(summaries[0]!.textContent).toContain(String(((1 + 20) * 20) / 2))
    expect(rafHandles.size).toBe(0)
  })

  it('一轮铺完 + merge 列：归并照常（行序列完整即归并，不依赖多帧）', () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'city', title: '城市', merge: true },
        { key: 'name', title: '姓名' },
      ]),
    )
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '10')
    el.setAttribute(
      'data',
      JSON.stringify([
        { city: '北京', name: '用户 1' },
        { city: '北京', name: '用户 2' },
      ]),
    )
    document.body.appendChild(el)
    const cityCells = [...el.shadowRoot!.querySelectorAll('td[data-col="city"]')]
    expect(cityCells.length, '两行合并为一个城市格').toBe(1)
    expect((cityCells[0] as HTMLTableCellElement).rowSpan).toBe(2)
  })

  it('数据更新取消旧分批代次：陈旧帧不再追加，新展示集重新分批', () => {
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length).toBe(100)
    flushRafFrames(1)
    expect(dataRows(el).length).toBe(200)
    // 中途数据更新（签名变化 → 全量渲染 → 取消旧代次）：新展示集 5 行一轮铺完
    el.setAttribute('data', rowData(5))
    expect(dataRows(el).length, '新渲染立即落位').toBe(5)
    flushRafAll()
    expect(dataRows(el).length, '旧代次剩余 100 行不得追加').toBe(5)
  })

  it('排序触发的新一轮渲染同样取消旧代次（陈旧分批帧作废）', () => {
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length).toBe(100)
    el.setAttribute('sort-key', 'age')
    el.setAttribute('sort-order', 'desc')
    // 排序后 display 仍 300 行：新一轮首帧 100 行
    expect(dataRows(el).length).toBe(100)
    flushRafFrames(1)
    expect(dataRows(el).length).toBe(200)
    // 排序生效：首行是 age 最大的行（用户 300）
    expect(dataRows(el)[0]!.getAttribute('data-key')).toBe('用户 300')
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
  })

  it('断连取消未完成分批：陈旧帧不再执行（不抛错、句柄清空）', () => {
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length).toBe(100)
    expect(rafHandles.size).toBe(1)
    el.remove()
    expect(rafHandles.size, '断连即取消在途 rAF 句柄').toBe(0)
    expect(() => flushRafAll(), '无在途帧可执行').not.toThrow()
  })

  it('虚拟滚动同开：devWarn 一次并忽略（走虚拟窗口渲染，不分批）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-key', 'name')
    el.setAttribute('height', '300')
    el.setAttribute('row-height', '40')
    el.setAttribute('render-chunk', '100')
    el.setAttribute('data', rowData(500))
    document.body.appendChild(el)
    const rendered = dataRows(el).length
    expect(rendered, '虚拟窗口渲染（远小于全量 500）').toBeLessThan(500)
    expect(rendered, '虚拟窗口非空（分批被忽略，DOM 行数 = 窗口量级）').toBeGreaterThanOrEqual(1)
    const hits = warn.mock.calls.filter((c) => String(c[0]).includes('render-chunk'))
    expect(hits.length, '同开告警恰好一次').toBe(1)
    // 再次全量渲染（数据更新）：告警不重复
    el.setAttribute('data', rowData(400))
    const hits2 = warn.mock.calls.filter((c) => String(c[0]).includes('render-chunk'))
    expect(hits2.length, '实例级一次性告警').toBe(1)
  })

  it('分批期间变更选择：后续批次按新选择落位，已渲染行走补丁', () => {
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length).toBe(100)
    el.setAttribute('selected', '用户 250')
    // 已渲染的 100 行无该行（走不到补丁）；追加批次必须按新快照落位
    flushRafAll()
    const rows = dataRows(el)
    expect(rows.length).toBe(300)
    const target = rows.find((r) => r.getAttribute('data-key') === '用户 250')!
    expect(target.getAttribute('data-selected'), '末批按当时的 selected 快照渲染').toBe('true')
    const other = rows.find((r) => r.getAttribute('data-key') === '用户 1')!
    expect(other.getAttribute('data-selected')).toBe('false')
  })

  it('分组视图：组行与数据行随 display 序列切段，末帧完整且组数正确', () => {
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-key', 'name')
    el.setAttribute('group-by', 'city')
    el.setAttribute('render-chunk', '50')
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 300 }, (_, i) => ({
          name: `用户 ${i + 1}`,
          age: i + 1,
          city: ['北京', '上海', '深圳'][i % 3]!,
        })),
      ),
    )
    document.body.appendChild(el)
    expect(bodyRows(el).length, '首帧 = 50（组行 + 数据行混合切段）').toBe(50)
    expect(rafHandles.size).toBe(1)
    flushRafAll()
    expect(bodyRows(el).length, '3 组组行 + 300 数据行').toBe(303)
    expect(el.shadowRoot!.querySelectorAll('tbody tr.group-header').length, '组行完整').toBe(3)
  })

  it('结构槽 bodyRow 每批逐行调用（与全量渲染同口径）', () => {
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', rowData(300))
    el.setAttribute('render-chunk', '100')
    const marked: string[] = []
    el.structuralRenderers = {
      bodyRow: ({ el: tr }) => {
        marked.push(tr.getAttribute('data-key') ?? '')
      },
    }
    document.body.appendChild(el)
    expect(marked.length, '首帧调用 chunk 次').toBe(100)
    flushRafAll()
    expect(marked.length, '末帧累计全部数据行').toBe(300)
    expect(marked[0]).toBe('用户 1')
    expect(marked[299]).toBe('用户 300')
  })

  it('merge 列归并在末帧一次性后处理（中段不切断 rowspan）', () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'city', title: '城市', merge: true },
        { key: 'name', title: '姓名' },
      ]),
    )
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '2')
    el.setAttribute(
      'data',
      JSON.stringify([
        { city: '北京', name: '用户 1' },
        { city: '北京', name: '用户 2' },
        { city: '上海', name: '用户 3' },
        { city: '上海', name: '用户 4' },
      ]),
    )
    document.body.appendChild(el)
    // 首帧 2 行：merge 尚未归并（需要完整连续行序列）
    let cityCells = [...el.shadowRoot!.querySelectorAll('td[data-col="city"]')]
    expect(cityCells.length, '首帧每行各自的城市格').toBe(2)
    flushRafAll()
    cityCells = [...el.shadowRoot!.querySelectorAll('td[data-col="city"]')]
    expect(cityCells.length, '末帧归并：4 行剩 2 个城市格').toBe(2)
    expect((cityCells[0] as HTMLTableCellElement).rowSpan, '北京组合并 rowspan=2').toBe(2)
    expect((cityCells[1] as HTMLTableCellElement).rowSpan, '上海组合并 rowspan=2').toBe(2)
  })

  it('合计行随末帧落位，聚合值与全量口径一致', () => {
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '100')
    el.setAttribute('summary', JSON.stringify([{ key: 'age', type: 'sum' }]))
    el.setAttribute('data', rowData(300))
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="summary-row"]'), '首帧不提前放合计行').toBeNull()
    expect(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount')).toBe('300')
    flushRafAll()
    const summary = el.shadowRoot!.querySelector('[part="summary-row"]')
    expect(summary?.getAttribute('part'), '末帧合计行落位').toBe('summary-row')
    expect(summary!.textContent).toContain(String(((1 + 300) * 300) / 2))
    // 合计行在全部数据行之后
    const trs = bodyRows(el)
    expect(trs[trs.length - 1]!.getAttribute('part')).toBe('summary-row')
  })

  it('分批期间 selected 变化走行级补丁：不触发全量重渲染、分批不被打断', () => {
    const el = mount({ 'render-chunk': '100' })
    flushRafFrames(1)
    expect(dataRows(el).length).toBe(200)
    // selected 是唯一走补丁快路径的属性：变更后已渲染行即时同步，剩余帧照常追加
    el.setAttribute('selected', '用户 1,用户 150')
    expect(dataRows(el)[0]!.getAttribute('data-selected')).toBe('true')
    expect(dataRows(el)[199]!.getAttribute('data-selected')).toBe('false')
    flushRafFrames(1)
    expect(dataRows(el).length, '补丁不打断分批').toBe(300)
    expect(
      dataRows(el)
        .find((r) => r.getAttribute('data-key') === '用户 150')!
        .getAttribute('data-selected'),
      '末批按新快照补齐选中态',
    ).toBe('true')
  })

  it('print 媒体下连接（初始即 print）：全量同步渲染，不排任何分批帧', () => {
    stubPrintMedia().setPrint(true)
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length, 'print 下不分批——300 行一次性全量落位').toBe(300)
    expect(rafHandles.size, 'print 下不排分批帧').toBe(0)
    expect(dataRows(el)[299]!.getAttribute('data-key'), '末行真实渲染').toBe('用户 300')
  })

  it('screen → print → screen 往返：print 全量不截断 + 在途代次取消 + 恢复分批配置', () => {
    const printCtl = stubPrintMedia()
    printCtl.setPrint(false)
    const el = mount({ 'render-chunk': '100' })
    expect(dataRows(el).length, 'screen 首帧 chunk 行').toBe(100)
    expect(rafHandles.size, '在途分批帧').toBe(1)
    // 分批进行中进入 print：matchMedia change → 重渲染——全量同步、在途句柄取消、陈旧代次作废
    printCtl.setPrint(true)
    expect(dataRows(el).length, 'print 下立即全量（非首帧 100 行定格）').toBe(300)
    expect(rafHandles.size, '在途分批帧已取消').toBe(0)
    flushRafAll()
    expect(dataRows(el).length, '陈旧代次剩余帧不得再追加（不泄漏）').toBe(300)
    expect(dataRows(el)[299]!.getAttribute('data-key'), '末行真实渲染').toBe('用户 300')
    // 退出 print 回 screen：恢复 render-chunk 分批配置（首帧 chunk 行 + 在途帧重新排队）
    printCtl.setPrint(false)
    expect(dataRows(el).length, 'screen 恢复分批首帧').toBe(100)
    expect(rafHandles.size, 'screen 恢复分批在途帧').toBe(1)
    flushRafAll()
    expect(dataRows(el).length, 'screen 分批跑完仍完整').toBe(300)
  })

  it('print 下合计行随全量同步尾程落位（不分批、不待末帧）', () => {
    stubPrintMedia().setPrint(true)
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-key', 'name')
    el.setAttribute('render-chunk', '100')
    el.setAttribute('summary', JSON.stringify([{ key: 'age', type: 'sum' }]))
    el.setAttribute('data', rowData(300))
    document.body.appendChild(el)
    expect(dataRows(el).length).toBe(300)
    const summary = el.shadowRoot!.querySelector('[part="summary-row"]')
    expect(summary?.getAttribute('part'), 'print 全量渲染同帧落位合计行').toBe('summary-row')
    expect(summary!.textContent).toContain(String(((1 + 300) * 300) / 2))
    expect(rafHandles.size).toBe(0)
  })

  // ===== 分批完成后的滚动位恢复（与全量同步路径同口径） =====
  // 缺陷背景：垫高在首帧被提前移除 → 首帧 200 行的高度成为可达上界，scrollTop 被钳制；
  // 异步末帧也不恢复。修复后垫高保留到末帧，内容完整后移除并写回保存位。

  /** 同量替换数据（行数不变、内容全变）——触发一轮新的分批渲染 */
  const replacedData = (n: number): string =>
    JSON.stringify(Array.from({ length: n }, (_, i) => ({ name: `改名 ${i + 1}`, age: i + 1 })))

  it('首帧保留稳定清空的垫高，末帧内容完整后移除（防首帧高度钳制）', () => {
    const el = mount({ 'render-chunk': '100' })
    const body = el.shadowRoot!.querySelector('tbody') as HTMLElement
    // happy-dom 无布局：显式给旧表体一个高度，模拟真实浏览器稳定清空前的度量
    Object.defineProperty(body, 'offsetHeight', { value: 9245, configurable: true })
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length, '首帧 chunk 行').toBe(100)
    expect(body.style.minHeight, '首帧不得提前拆垫高').toBe('9245px')
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(body.style.minHeight, '末帧内容完整后移除垫高').toBe('')
  })

  it('末帧内容完整后写回保存的滚动位（分批期间被钳回也恢复）', () => {
    const el = mount({ 'render-chunk': '100', 'max-height': '400' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 300
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length).toBe(100)
    wrap.scrollTop = 0 // 模拟浏览器在内容不足时的钳制
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(wrap.scrollTop, '末帧按保存位恢复（旧值不被钳制位吞掉）').toBe(300)
  })

  it('分批期间主动写入滚动位（writeScrollPosition）→ 末帧不用旧值回滚', () => {
    const el = mount({ 'render-chunk': '100', 'max-height': '400' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 300
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length).toBe(100)
    wrap.scrollTop = 0 // 模拟首帧钳制
    el.writeScrollPosition(900) // 分批期间用户主动写入（键盘导航 / 滚轮导航同口径入口）
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(wrap.scrollTop, '主动写入优先于帧尾恢复（不得被旧值覆盖）').toBe(900)
  })

  it('分批期间真实用户手势滚动（wheel）→ 末帧不把位置拉回保存位', () => {
    const el = mount({ 'render-chunk': '100', 'max-height': '400' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 300
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length).toBe(100)
    // 首帧钳制后用户滚轮手势滚到别处（原生滚动不经过 writeScrollPosition，无写入代次）
    wrap.scrollTop = 0
    wrap.dispatchEvent(new Event('wheel'))
    wrap.scrollTop = 120
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(wrap.scrollTop, '用户手势位置优先于保存位').toBe(120)
  })

  it('分批期间点击行 / touchstart（无滚动）不算滚动意图 → 末帧仍恢复保存位', () => {
    const el = mount({ 'render-chunk': '100', 'max-height': '400' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 300
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length).toBe(100)
    wrap.scrollTop = 0 // 模拟首帧钳制
    // 普通按压 / 点击数据行单元格（含触屏 tap 的 touchstart）：不产生滚动位变化
    const cell = dataRows(el)[0]!.querySelector('td')!
    for (const type of ['pointerdown', 'touchstart', 'pointerup', 'click']) {
      cell.dispatchEvent(new Event(type, { bubbles: true }))
    }
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(wrap.scrollTop, '按压/点击不让位：末帧仍恢复保存位').toBe(300)
  })

  it('分批期间触摸拖动（touchmove）→ 末帧不把位置拉回保存位', () => {
    const el = mount({ 'render-chunk': '100', 'max-height': '400' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 300
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length).toBe(100)
    wrap.scrollTop = 0
    wrap.dispatchEvent(new Event('touchmove'))
    wrap.scrollTop = 150
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(wrap.scrollTop, '触摸拖动是真实滚动意图，位置优先于保存位').toBe(150)
  })

  it('分批期间拖动滚动条（pointerdown 命中滚动容器自身）→ 末帧不把位置拉回保存位', () => {
    const el = mount({ 'render-chunk': '100', 'max-height': '400' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 300
    el.setAttribute('data', replacedData(300))
    expect(dataRows(el).length).toBe(100)
    wrap.scrollTop = 0
    // 滚动条按压的事件目标即滚动容器自身（内容区按压 target 是行/单元格）
    wrap.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    wrap.scrollTop = 180
    flushRafAll()
    expect(dataRows(el).length).toBe(300)
    expect(wrap.scrollTop, '滚动条拖动是真实滚动意图，位置优先于保存位').toBe(180)
  })
})
