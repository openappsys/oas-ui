import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
// a8 编辑仅本地断言需编辑能力（主入口 v2.6.4 起不含编辑；显式注册，与族内其他测试同路径）
import './edit/index.js'

/**
 * server 行模型批（a2：`row-model` 属性注册与生效前提）。
 *
 * 冻结契约（PRD ①）：
 * - `row-model="server"` 且 `total` 属性在场（外部分页形态）才生效；
 *   前提不满足 → 一次性 devWarn + 按 client 行为执行（零行为变化）；
 * - 与 `windowed` 同开 → windowed 优先 + 一次性 devWarn（server 忽略）；
 * - client 模式（缺省）一切现状不变。
 */

const COLUMNS = JSON.stringify([
  { key: 'name', title: '名称', sortable: true },
  { key: 'age', title: '年龄' },
])

function mount(attrs: Record<string, string>): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', COLUMNS)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

const rowsOf = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]

/** 等待微任务队列清空（server 前提告警复核在 queueMicrotask 回调中落定） */
const flushMicrotask = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('OASTable server 行模型 a2：row-model 属性', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('row-model="server" 缺 total：devWarn 一次 + 按 client 行为（本地排序照常执行）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      'row-model': 'server',
      data: JSON.stringify([
        { name: '乙', age: 2 },
        { name: '甲', age: 1 },
      ]),
    })
    // 前提告警经微任务复核后落一次（F7：延后判定规避逐 prop 赋值瞬时空窗误报）
    await flushMicrotask()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('row-model')
    // 同实例再渲染不重复告警（一次）
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '丙', age: 3 },
        { name: '乙', age: 2 },
      ]),
    )
    await flushMicrotask()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    // client 行为：点击表头本地排序照常生效（码点序 丙(0x4E19) < 乙(0x4E59)，asc 首行 = 丙）
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    const first = rowsOf(el)[0]!.textContent ?? ''
    expect(first).toContain('丙')
  })

  it('row-model="server" + windowed 同开：windowed 优先 + devWarn 一次（server 忽略）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-model', 'server')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '10')
    // 非虚拟 windowed：全部已装载行即视口内容（windowed 契约——切片行按绝对位渲染）
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '行10', age: 20 },
        { name: '行11', age: 21 },
      ]),
    )
    document.body.appendChild(el)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('windowed')
    // windowed 行为完整保留：切片行照 windowed 契约渲染（server 判定未接管）
    expect(rowsOf(el).length).toBe(2)
    expect(rowsOf(el)[0]!.textContent).toContain('行10')
    // 同实例再渲染不重复互斥告警（一次）
    el.setAttribute('data', JSON.stringify([{ name: '行10', age: 20 }]))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('缺省（无 row-model）与 row-model="client"：零告警零行为变化', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plain = mount({ data: JSON.stringify([{ name: '甲', age: 1 }]), total: '5' })
    expect(warn).not.toHaveBeenCalled()
    expect(rowsOf(plain).length).toBe(1)
    document.body.innerHTML = ''
    const client = mount({ 'row-model': 'client', data: JSON.stringify([{ name: '甲', age: 1 }]), total: '5' })
    expect(warn).not.toHaveBeenCalled()
    expect(rowsOf(client).length).toBe(1)
    warn.mockRestore()
  })
})

describe('OASTable server 行模型 a3：本地过滤/排序整体跳过（缝位）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const DATA_ABC = JSON.stringify([
    { name: '甲', age: 3 },
    { name: '乙', age: 2 },
    { name: '丙', age: 1 },
  ])

  /** server 挂载后模拟宿主首载回填（server 模式挂载即在途 → 内建 loading 行；回填清 loading 出数据） */
  function mountServerWith(attrs: Record<string, string>): OASTable {
    const el = mount(attrs)
    el.setAttribute('data', attrs.data ?? DATA_ABC)
    return el
  }

  it('server：filter-values 在场不执行本地过滤（data 原样渲染；client 对照过滤生效）', () => {
    const server = mountServerWith({
      'row-model': 'server',
      total: '100',
      data: DATA_ABC,
      'filter-values': JSON.stringify({ name: '甲' }),
    })
    expect(rowsOf(server).length).toBe(3)
    document.body.innerHTML = ''
    const client = mount({ total: '100', data: DATA_ABC, 'filter-values': JSON.stringify({ name: '甲' }) })
    expect(rowsOf(client).length).toBe(1)
    expect(rowsOf(client)[0]!.textContent).toContain('甲')
  })

  it('server：sort-key/sort-order 在场不执行本地排序（data 原样渲染；client 对照排序生效）', () => {
    const server = mountServerWith({
      'row-model': 'server',
      total: '100',
      data: DATA_ABC,
      'sort-key': 'age',
      'sort-order': 'asc',
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    })
    // data 原样：甲(3) 乙(2) 丙(1)——本地排序会把它变成 丙(1) 乙(2) 甲(3)
    expect(rowsOf(server).length).toBe(3)
    expect(rowsOf(server)[0]!.textContent).toContain('甲')
    expect(rowsOf(server)[2]!.textContent).toContain('丙')
    document.body.innerHTML = ''
    const client = mount({
      total: '100',
      data: DATA_ABC,
      'sort-key': 'age',
      'sort-order': 'asc',
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    })
    expect(rowsOf(client)[0]!.textContent).toContain('丙')
    expect(rowsOf(client)[2]!.textContent).toContain('甲')
  })

  it('server：分页器口径保留（current 越界钳制写回 + total 直通分页器）', () => {
    const server = mountServerWith({
      'row-model': 'server',
      total: '10',
      data: DATA_ABC,
      pagination: '',
      current: '99',
    })
    // 越界钳制仍生效（宿主切片口径的既有行为）：current 99 → 钳到 1
    expect(server.getAttribute('current')).toBe('1')
    expect(rowsOf(server).length).toBe(3)
    const pager = server.shadowRoot!.querySelector('.pagination oas-pagination')
    expect(pager).not.toBeNull()
    expect(pager!.getAttribute('total')).toBe('10')
  })

  it('server：交互排序只派 oas-sort-change，不改行序（服务端排序由宿主回填）', () => {
    const el = mountServerWith({
      'row-model': 'server',
      total: '100',
      data: DATA_ABC,
      columns: JSON.stringify([
        { key: 'name', title: '名称', sortable: true },
        { key: 'age', title: '年龄' },
      ]),
    })
    let detail: unknown
    el.addEventListener('oas-sort-change', (e) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    expect(detail).toEqual({ key: 'name', order: 'asc' })
    // 排序服务端化：本地不重排——在途即内建 loading 行（数据区暂由 loading 占位）
    expect(el.shadowRoot!.querySelector('td.loading')).not.toBeNull()
    // 宿主按服务端排序结果回填 → 行序由回填数据决定（本地不改序）
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '丁', age: 0 },
        { name: '甲', age: 3 },
      ]),
    )
    expect(rowsOf(el).length).toBe(2)
    expect(rowsOf(el)[0]!.textContent).toContain('丁')
  })
})

describe('OASTable server 行模型 a4：oas-rows-request 请求协议', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  interface Req {
    requestId: number
    start: number
    end: number
    sortModel: Array<{ key: string; order: string }>
    filterValues: Record<string, string | number>
    reason: string
    totalKnown: boolean
  }

  /** mount（监听器先于连接挂上，首帧 init 请求也能捕获） */
  function mountReq(attrs: Record<string, string>, data = '[]'): { el: OASTable; reqs: Req[] } {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称', sortable: true },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('data', data)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    const reqs: Req[] = []
    el.addEventListener('oas-rows-request', (e: Event) => {
      const d = (e as CustomEvent).detail
      reqs.push({
        requestId: d.requestId,
        start: d.start,
        end: d.end,
        sortModel: d.sortModel,
        filterValues: d.filterValues,
        reason: d.reason,
        totalKnown: d.totalKnown,
      })
      // 事件通道契约（同 oas-window-request）：可冒泡、可穿出 Shadow DOM
      expect(e.bubbles).toBe(true)
      expect(e.composed).toBe(true)
    })
    document.body.appendChild(el)
    return { el, reqs }
  }

  it('首载派发 init：detail 完整（requestId=1 / [0,10) / 空 sortModel / totalKnown=true），data 为空也先派', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100' })
    expect(reqs).toEqual([
      { requestId: 1, start: 0, end: 10, sortModel: [], filterValues: {}, reason: 'init', totalKnown: true },
    ])
    // 空数据首载：请求已派发（早退分支不吞首载请求——windowed 先例顺序）
    expect(el.shadowRoot!.querySelector('tbody')).not.toBeNull()
  })

  it('data 非空首载同样派 init（data 属性是回填通道不是请求屏障）', () => {
    const { reqs } = mountReq({ 'row-model': 'server', total: '100' }, JSON.stringify([{ name: '甲', age: 1 }]))
    expect(reqs.length).toBe(1)
    expect(reqs[0]!.reason).toBe('init')
  })

  it('翻页：current 变更派 paginate（requestId 递增 / start 端点随页推导）', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100' })
    el.setAttribute('current', '2')
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({
      requestId: 2,
      start: 10,
      end: 20,
      sortModel: [],
      filterValues: {},
      reason: 'paginate',
      totalKnown: true,
    })
    el.setAttribute('current', '3')
    expect(reqs.length).toBe(3)
    expect(reqs[2]!.start).toBe(20)
    expect(reqs[2]!.end).toBe(30)
  })

  it('排序交互派 sort：sortModel 沿用 sort-key/sort-order 词汇', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100' })
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    expect(reqs.length).toBe(2)
    expect(reqs[1]!.reason).toBe('sort')
    expect(reqs[1]!.sortModel).toEqual([{ key: 'name', order: 'asc' }])
    expect(reqs[1]!.requestId).toBe(2)
  })

  it('multi-sort 在场：sortModel 按数组序组装多键', () => {
    const { reqs } = mountReq({
      'row-model': 'server',
      total: '100',
      'multi-sort': JSON.stringify([
        { key: 'name', order: 'desc' },
        { key: 'age', order: 'asc' },
      ]),
    })
    expect(reqs.length).toBe(1)
    expect(reqs[0]!.sortModel).toEqual([
      { key: 'name', order: 'desc' },
      { key: 'age', order: 'asc' },
    ])
  })

  it('过滤变更派 filter：filterValues 为 filter-values 现值对象原样', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100' })
    el.setAttribute('filter-values', JSON.stringify({ name: '甲' }))
    expect(reqs.length).toBe(2)
    expect(reqs[1]!.reason).toBe('filter')
    expect(reqs[1]!.filterValues).toEqual({ name: '甲' })
  })

  it('同值属性写不重发（current/sort/filter-values 同值均静默）；data 写不发（回填是响应）', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100' })
    expect(reqs.length).toBe(1)
    el.setAttribute('current', '2')
    expect(reqs.length).toBe(2)
    el.setAttribute('current', '2') // 同值写
    expect(reqs.length).toBe(2)
    // 排序状态成对写（sort-key 无 order 时不是激活排序，与 resolveSorts 口径一致）
    el.setAttribute('sort-key', 'name')
    el.setAttribute('sort-order', 'asc')
    expect(reqs.length).toBe(3)
    el.setAttribute('sort-key', 'name') // 同值写
    el.setAttribute('sort-order', 'asc')
    expect(reqs.length).toBe(3)
    el.setAttribute('filter-values', JSON.stringify({ name: '甲' }))
    expect(reqs.length).toBe(4)
    el.setAttribute('filter-values', JSON.stringify({ name: '甲' })) // 同值写
    expect(reqs.length).toBe(4)
    // data 回填（响应而非新请求——防请求循环）
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    expect(reqs.length).toBe(4)
    // 同值 data 写（markRenderDirty 重渲染通道）也不发
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    expect(reqs.length).toBe(4)
  })

  it('client 模式一切场景零请求（翻页/排序/过滤均不派）', () => {
    const { el, reqs } = mountReq({ total: '100' })
    expect(reqs.length).toBe(0)
    el.setAttribute('current', '2')
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    el.setAttribute('filter-values', JSON.stringify({ name: '甲' }))
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    expect(reqs.length).toBe(0)
  })
})

describe('OASTable server 行模型 a5：时序规则（页码重置 + 在途新请求）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  interface Req {
    requestId: number
    start: number
    end: number
    reason: string
  }

  function mountReq(attrs: Record<string, string>): { el: OASTable; reqs: Req[] } {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称', sortable: true },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('data', '[]')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    const reqs: Req[] = []
    el.addEventListener('oas-rows-request', (e: Event) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, start: d.start, end: d.end, reason: d.reason })
    })
    document.body.appendChild(el)
    return { el, reqs }
  }

  it('排序变更先 current 置 1 再派请求（事件派发时属性已可见；请求区间 = 新口径首页）', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100', current: '3' })
    // 首载 init 以 current=3 的状态派发（宿主显式页码不受 init 重置）
    expect(reqs.length).toBe(1)
    expect(reqs[0]!.start).toBe(20)
    // 派发瞬间断言 current 属性已是 '1'（先置后派）
    el.addEventListener('oas-rows-request', () => {
      if (reqs.length >= 2) expect(el.getAttribute('current')).toBe('1')
    })
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    expect(el.getAttribute('current')).toBe('1')
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ requestId: 2, start: 0, end: 10, reason: 'sort' })
  })

  it('过滤变更先 current 置 1 再派请求', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100', current: '2' })
    expect(reqs.length).toBe(1)
    el.setAttribute('filter-values', JSON.stringify({ name: '甲' }))
    expect(el.getAttribute('current')).toBe('1')
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ requestId: 2, start: 0, end: 10, reason: 'filter' })
  })

  it('页大小变更先 current 置 1 再派请求（区间按新 pageSize）', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100', current: '3' })
    expect(reqs.length).toBe(1)
    el.setAttribute('page-size', '20')
    expect(el.getAttribute('current')).toBe('1')
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ requestId: 2, start: 0, end: 20, reason: 'paginate' })
  })

  it('在途再变更：以最新状态派新请求（requestId 递增），未回填不拦截新请求', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '100' })
    expect(reqs.length).toBe(1)
    // 第一请求在途（宿主未回填）→ 再翻页：旧请求作废语义由 requestId 承载（宿主只认最新）
    el.setAttribute('current', '2')
    expect(reqs.length).toBe(2)
    expect(reqs[1]!.requestId).toBe(2)
    // 在途再排序：新请求以最新排序状态派发（区间仍从首页 0 起——排序已重置页码）
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    expect(reqs.length).toBe(3)
    expect(reqs[2]!.requestId).toBe(3)
    expect(reqs[2]!.reason).toBe('sort')
    expect(reqs[2]!.start).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('client 模式排序不重置页码（现状保持：current 仍为 3）', () => {
    const { el, reqs } = mountReq({ total: '100', pagination: '', current: '3' })
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    expect(el.getAttribute('current')).toBe('3')
    expect(reqs.length).toBe(0)
  })
})

describe('OASTable server 行模型 a6：内建 loading + 失败反馈', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  interface Err {
    requestId: number
    reason?: string
  }

  function mountReq(attrs: Record<string, string>): {
    el: OASTable
    reqs: { requestId: number; reason: string }[]
    errs: Err[]
  } {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('data', '[]')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    const reqs: { requestId: number; reason: string }[] = []
    const errs: Err[] = []
    el.addEventListener('oas-rows-request', (e: Event) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    el.addEventListener('oas-rows-error', (e: Event) => {
      const d = (e as CustomEvent).detail
      errs.push({ requestId: d.requestId, reason: d.reason })
    })
    document.body.appendChild(el)
    return { el, reqs, errs }
  }

  const loadingRow = (el: OASTable): HTMLElement | null => el.shadowRoot!.querySelector('td.loading')
  const errorBar = (el: OASTable): HTMLElement | null => el.shadowRoot!.querySelector('.rows-error')

  it('在途内建 loading：首载请求后渲染 loading 行（无需宿主 loading 属性），回填后消失', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '10' })
    expect(reqs.length).toBe(1)
    expect(loadingRow(el)).not.toBeNull()
    // 宿主回填 → loading 清除 + 数据行渲染
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    expect(loadingRow(el)).toBeNull()
    expect(rowsOf(el).length).toBe(1)
    // 不回写宿主属性：loading 属性仍缺席
    expect(el.hasAttribute('loading')).toBe(false)
  })

  it('宿主显式 loading 属性照常生效（取或显示；既有行为不变）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    el.setAttribute('total', '10')
    el.setAttribute('row-model', 'server')
    el.setAttribute('loading', '')
    document.body.appendChild(el)
    // 无请求在途时（首载 init 后回填过？——首载即派发并置在途，loading 行来源两者取或，视觉一致）
    expect(loadingRow(el)).not.toBeNull()
  })

  it('reportRowsError 生效：派 oas-rows-error + 错误条可见 + 旧数据保留', () => {
    const { el, reqs, errs } = mountReq({ 'row-model': 'server', total: '10' })
    // 首轮回填旧数据
    el.setAttribute('data', JSON.stringify([{ name: '旧', age: 1 }]))
    // 翻页 → 新请求在途（requestId 2）
    el.setAttribute('current', '2')
    expect(reqs.length).toBe(2)
    el.reportRowsError({ requestId: 2, reason: 'paginate', error: new Error('boom') })
    expect(errs).toEqual([{ requestId: 2, reason: 'paginate' }])
    const bar = errorBar(el)
    expect(bar).not.toBeNull()
    expect(bar!.hasAttribute('hidden')).toBe(false)
    expect(bar!.getAttribute('role')).toBe('alert')
    expect(bar!.textContent).toContain('加载失败')
    expect(bar!.textContent).toContain('重试')
    // 失败保留旧数据（交互连续性）：仍渲染回填过的行
    expect(rowsOf(el).length).toBe(1)
    expect(el.shadowRoot!.querySelector('tbody')!.textContent).toContain('旧')
  })

  it('晚到旧失败静默丢弃：requestId 不匹配在途序号时不派事件、错误条不显示', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, reqs, errs } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('current', '2') // requestId 2 在途
    expect(reqs.length).toBe(2)
    el.reportRowsError({ requestId: 1, reason: 'init' }) // 晚到旧失败
    expect(errs.length).toBe(0)
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
    el.reportRowsError({ requestId: 999 }) // 超前未知序号
    expect(errs.length).toBe(0)
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
    warn.mockRestore()
  })

  it('重试按钮：click → refreshRows 强刷（reason=refresh、requestId+1）→ 成功回填 → 错误条消失', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('data', JSON.stringify([{ name: '旧', age: 1 }]))
    el.setAttribute('current', '2')
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(false)
    // 点击重试
    el.shadowRoot!.querySelector<HTMLElement>('.rows-error-retry')!.click()
    expect(reqs.length).toBe(3)
    expect(reqs[2]).toEqual({ requestId: 3, reason: 'refresh' })
    // 重试派发即清失败条（进入新在途轮次）
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
    // 成功回填 → loading 清、数据渲染
    el.setAttribute('data', JSON.stringify([{ name: '新', age: 2 }]))
    expect(loadingRow(el)).toBeNull()
    expect(el.shadowRoot!.querySelector('tbody')!.textContent).toContain('新')
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
  })

  it('成功回填清错误条：失败后宿主直接写 data（不经重试）→ 错误条消失', () => {
    const { el } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('current', '2')
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(false)
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
    expect(loadingRow(el)).toBeNull()
  })

  it('client 模式 reportRowsError 静默 no-op（无事件、无错误条）', () => {
    const { el, errs } = mountReq({ total: '10' })
    el.reportRowsError({ requestId: 1, reason: 'init' })
    expect(errs.length).toBe(0)
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
  })
})

describe('OASTable server 行模型 a7：refreshRows() 强刷', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function mountReq(attrs: Record<string, string>): { el: OASTable; reqs: { requestId: number; reason: string }[] } {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('data', '[]')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    const reqs: { requestId: number; reason: string }[] = []
    el.addEventListener('oas-rows-request', (e: Event) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    document.body.appendChild(el)
    return { el, reqs }
  }

  it('同状态强刷绕过同值去重：reason=refresh、requestId 递增、在途 loading 置位', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '10' })
    expect(reqs).toEqual([{ requestId: 1, reason: 'init' }])
    // 回填（成功路径，状态此后与请求签名同值）
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
    // 同状态 refreshRows：绕过签名去重强制重发
    el.refreshRows()
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ requestId: 2, reason: 'refresh' })
    // 强刷即进入在途 loading（内建视觉）
    expect(el.shadowRoot!.querySelector('td.loading')).not.toBeNull()
    // 回填 → loading 清
    el.setAttribute('data', JSON.stringify([{ name: '乙', age: 2 }]))
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
  })

  it('{ purge: true } v1 无缓存等价 refresh（reason=refresh）', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    el.refreshRows({ purge: true })
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ requestId: 2, reason: 'refresh' })
  })

  it('client 模式 refreshRows 静默 no-op', () => {
    const { el, reqs } = mountReq({ total: '10' })
    el.refreshRows()
    el.refreshRows({ purge: true })
    expect(reqs.length).toBe(0)
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
  })
})

describe('OASTable server 行模型 a8：能力闸门矩阵', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** server 挂载 + 首载回填（脱离内建 loading 在途态，便于断言闸门后的渲染产物） */
  function mountServer(attrs: Record<string, string>, data = '[]'): OASTable {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      attrs.columns ??
        JSON.stringify([
          { key: 'name', title: '名称' },
          { key: 'age', title: '年龄' },
        ]),
    )
    el.setAttribute('data', data)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.body.appendChild(el)
    el.setAttribute('data', data)
    return el
  }

  it('导出仅当前页切片 + devWarn 一次（不阻断：内容照常生成）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer(
      { 'row-model': 'server', total: '100', exportable: '' },
      JSON.stringify([{ name: '甲', age: 1 }]),
    )
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
      ]),
    )
    const content = el.exportData('csv')
    expect(content).toContain('甲')
    expect(content).toContain('乙')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('导出')
    el.exportData('csv')
    expect(warn).toHaveBeenCalledTimes(1) // 去重一次
    warn.mockRestore()
  })

  it('print 媒体下 devWarn 一次（打印仅当前页切片；与 windowed 守卫同口径）', () => {
    const real = window.matchMedia.bind(window)
    const cbs = new Set<(e: unknown) => void>()
    const mql = {
      matches: true,
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer({ 'row-model': 'server', total: '100' }, JSON.stringify([{ name: '甲', age: 1 }]))
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('打印')
    el.setAttribute('data', JSON.stringify([{ name: '乙', age: 2 }]))
    expect(warn).toHaveBeenCalledTimes(1) // 去重一次
    warn.mockRestore()
    window.matchMedia = real
  })

  it('合计 scope=all 禁用（无合计行 + devWarn）；scope=page 页内合计照常', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer(
      {
        'row-model': 'server',
        total: '100',
        summary: JSON.stringify([{ key: 'age', type: 'sum' }]),
      },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
      ]),
    )
    expect(el.shadowRoot!.querySelector('tr.summary')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('summary-scope')
    document.body.innerHTML = ''
    warn.mockRestore()
    // scope=page：页内合计显式声明 → 照常生效（页内切片聚合恰好正确）
    const page = mountServer(
      {
        'row-model': 'server',
        total: '100',
        'summary-scope': 'page',
        summary: JSON.stringify([{ key: 'age', type: 'sum' }]),
      },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
      ]),
    )
    expect(page.shadowRoot!.querySelector('tr.summary')!.textContent).toContain('3')
  })

  it('分组禁用：group-by 在场无分节头 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer(
      { 'row-model': 'server', total: '100', 'group-by': 'name' },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '甲', age: 2 },
      ]),
    )
    expect(el.shadowRoot!.querySelector('tr.group-header')).toBeNull()
    expect(rowsOf(el).length).toBe(2)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('group-by')
    warn.mockRestore()
  })

  it('行拖拽禁用：无手柄列 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer(
      { 'row-model': 'server', total: '100', 'row-draggable': '' },
      JSON.stringify([{ name: '甲', age: 1 }]),
    )
    expect(el.shadowRoot!.querySelector('.row-drag-cell')).toBeNull()
    expect(el.shadowRoot!.querySelector('.row-drag-handle')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('row-draggable')
    warn.mockRestore()
  })

  it('列拖拽禁用：setColumnOrder 拦截写回 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer({ 'row-model': 'server', total: '100' }, JSON.stringify([{ name: '甲', age: 1 }]))
    let fired = 0
    el.addEventListener('oas-column-order', () => fired++)
    el.setColumnOrder(['age', 'name'])
    expect(fired).toBe(0)
    expect(el.hasAttribute('column-keys')).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('列拖拽')
    warn.mockRestore()
  })

  it('merge 列与 span-method 禁用（与 windowed 同口径）：不合并 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer(
      {
        'row-model': 'server',
        total: '100',
        columns: JSON.stringify([
          { key: 'name', title: '名称', merge: true },
          { key: 'age', title: '年龄' },
        ]),
      },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '甲', age: 2 },
        { name: '甲', age: 3 },
      ]),
    )
    // 本地合并会对同值 name 列 rowspan——禁用后每行独立 td（无 rowspan>1）
    const cells = [...el.shadowRoot!.querySelectorAll<HTMLTableCellElement>('td[data-col="name"]')]
    expect(cells.length).toBe(3)
    for (const td of cells) expect(td.rowSpan).toBe(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('merge')
    warn.mockRestore()
  })

  it('span-method 禁用：跨行声明不生效（每格 rowspan/colspan=1）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountServer(
      { 'row-model': 'server', total: '100' },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
      ]),
    )
    el.spanMethod = (_row, _col, rowIndex, colIndex) =>
      rowIndex === 0 && colIndex === 0 ? { rowspan: 2, colspan: 1 } : undefined
    expect(el.shadowRoot!.querySelectorAll('td[data-col="name"]').length).toBe(2)
    const first = el.shadowRoot!.querySelector<HTMLTableCellElement>('td[data-col="name"]')!
    expect(first.rowSpan).toBe(1)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('页内相对行号语义（填充柄/区域选择基础）：data-row-index 为页内 0 起序', () => {
    const el = mountServer(
      { 'row-model': 'server', total: '100', pagination: '' },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
        { name: '丙', age: 3 },
      ]),
    )
    const idx = rowsOf(el).map((r) => r.getAttribute('data-row-index'))
    expect(idx).toEqual(['0', '1', '2'])
  })

  it('过滤面板照常打开且候选值来自当前页数据（页内语义）', () => {
    const el = mountServer(
      {
        'row-model': 'server',
        total: '100',
        columns: JSON.stringify([
          { key: 'name', title: '名称', filterable: true },
          { key: 'age', title: '年龄' },
        ]),
      },
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
      ]),
    )
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '甲', age: 1 },
        { name: '乙', age: 2 },
      ]),
    )
    el.shadowRoot!.querySelector<HTMLElement>('th[data-key="name"] .filter-btn')!.click()
    const panel = el.shadowRoot!.querySelector('.filter-panel')
    expect(panel).not.toBeNull()
    const options = [...panel!.querySelectorAll('.filter-option')].map((o) => o.textContent)
    expect(options).toContain('甲')
    expect(options).toContain('乙')
  })

  it('编辑仅本地：oas-edit 正常派发且不触发任何新请求（v1 无服务端编辑回写契约）', () => {
    const el = mountServer(
      {
        'row-model': 'server',
        total: '10',
        editable: '',
        columns: JSON.stringify([
          { key: 'name', title: '名称', editable: true },
          { key: 'age', title: '年龄' },
        ]),
      },
      JSON.stringify([{ name: '甲', age: 1 }]),
    )
    const reqs: unknown[] = []
    el.addEventListener('oas-rows-request', () => reqs.push(1))
    let editDetail: unknown
    el.addEventListener('oas-edit', (e) => (editDetail = (e as CustomEvent).detail))
    // 双击进入编辑 → 输入 → Enter 提交（既有本地编辑流）
    const td = el.shadowRoot!.querySelector<HTMLElement>('td[data-col="name"]')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input).not.toBeNull()
    input!.value = '甲改'
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect((editDetail as { value?: string } | undefined)?.value).toBe('甲改')
    // 编辑提交零请求（仅本地语义；翻页回填即丢失由宿主文档声明）
    expect(reqs.length).toBe(0)
  })
})

describe('OASTable server 行模型修复批（交叉审回归）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** server 挂载 + oas-rows-request / oas-rows-error 事件收集（与 a6 mountReq 同构） */
  function mountReq(attrs: Record<string, string>): {
    el: OASTable
    reqs: { requestId: number; reason: string }[]
    errs: { requestId: number; reason?: string }[]
  } {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('data', '[]')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    const reqs: { requestId: number; reason: string }[] = []
    const errs: { requestId: number; reason?: string }[] = []
    el.addEventListener('oas-rows-request', (e: Event) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    el.addEventListener('oas-rows-error', (e: Event) => {
      const d = (e as CustomEvent).detail
      errs.push({ requestId: d.requestId, reason: d.reason })
    })
    document.body.appendChild(el)
    return { el, reqs, errs }
  }

  /** 失败条查询（模板级持久节点，hidden 属性翻转可见性） */
  const errorBar = (el: OASTable): HTMLElement => el.shadowRoot!.querySelector('.rows-error')!

  /** shadow 内 style 文本（scoped CSS 随模板注入，真实渲染路径产物） */
  const styleTextOf = (el: OASTable): string => el.shadowRoot!.querySelector('style')?.textContent ?? ''

  /** F1 回归：重试按钮 hover 文字用 text-on-danger 实底反色 token（原 danger-text 在
      dark 主题与底色同值、light 近同值——hover 即文字不可读）。happy-dom 测不了真
      hover，此处断言样式源规则；视觉层由 qa-regression/table-server.spec.ts 覆盖 */
  it('F1：.rows-error-retry:hover 文字色走 --oas-color-text-on-danger（不再用 danger-text）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('data', '[]')
    document.body.appendChild(el)
    const hover = styleTextOf(el).match(/\.rows-error-retry:hover\s*\{[^}]*\}/)
    expect(hover, 'hover 规则存在于注入样式').not.toBeNull()
    expect(hover![0]).toContain('var(--oas-color-text-on-danger)')
    expect(hover![0]).not.toContain('danger-text')
  })

  /** F2 回归：显示缓存键（flatCacheSignature）缺 server 标志——client↔server 切换后
      重渲染命中旧缓存行集（client 本地排序产物被 server 模式复用，反之亦然） */
  it('F2：client↔server 切换后行集按新模式语义刷新（缓存键含 server 标志；total 不变场景）', () => {
    const reqs: { requestId: number; reason: string }[] = []
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    )
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '2')
    el.setAttribute('sort-key', 'age')
    el.setAttribute('sort-order', 'asc')
    el.addEventListener('oas-rows-request', (e) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    el.setAttribute('data', '[]')
    document.body.appendChild(el)
    expect(reqs.length, 'server 挂载即派 init').toBe(1)
    // 宿主回填当前页切片（乱序内容）→ server 不执行本地排序 → data 原样序，乙(2) 在前
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '乙', age: 2 },
        { name: '甲', age: 1 },
      ]),
    )
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
    expect(rowsOf(el)[0]!.textContent).toContain('乙')
    // 切 client（total 保留不变——宿主仍持总数语义）：本地排序恢复 → 甲(1) 在前。
    // 修复前缓存键不含 server 标志 → 与 server 时全同值 → 命中 server 行集缓存误渲染原样序
    el.setAttribute('row-model', 'client')
    expect(rowsOf(el)[0]!.textContent).toContain('甲')
    // 再切回 server：本地排序再次跳过。切走时请求状态已复位（F3 语义）→ 重新派 init（在途 loading 行）
    el.setAttribute('row-model', 'server')
    expect(reqs.length).toBe(2)
    expect(reqs[1]!.reason).toBe('init')
    expect(reqs[1]!.requestId).toBe(2)
    expect(el.shadowRoot!.querySelector('td.loading')).not.toBeNull()
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '乙', age: 2 },
        { name: '甲', age: 1 },
      ]),
    )
    expect(rowsOf(el)[0]!.textContent).toContain('乙')
  })

  it('F2：serverRowsActive 纯判定不含告警副作用（windowed 互斥/缺 total 均按 false，不烧一次性 flag）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('windowed', '')
    el.setAttribute('window-start', '0')
    el.setAttribute('data', JSON.stringify([{ name: '甲' }]))
    document.body.appendChild(el)
    expect(warn, 'windowed 互斥告警恰一次').toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  /** F3 回归：退出 server 生效形态（切 client / total 移除）三态复位——
      serverLoading / serverError / lastRowsRequestState 清零 + 强制重渲染 */
  it('F3①：loading 在途中切 client → loading 行消失（数据照 client 语义渲染）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('data', '[]')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('td.loading')).not.toBeNull()
    el.setAttribute('row-model', 'client')
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
    expect(rowsOf(el).length).toBe(0)
  })

  it('F3②：失败态切 client → 错误条消失', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('data', JSON.stringify([{ name: '旧', age: 1 }]))
    document.body.appendChild(el)
    el.setAttribute('current', '2')
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(false)
    el.setAttribute('row-model', 'client')
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
    // 旧数据行照常渲染（client 语义）
    expect(rowsOf(el).length).toBe(1)
  })

  it('F3③：失败后切 client 再切回 server → 重新派 init 请求（请求状态已复位）', () => {
    const reqs: { requestId: number; reason: string }[] = []
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('data', '[]')
    el.addEventListener('oas-rows-request', (e) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    document.body.appendChild(el)
    expect(reqs.length).toBe(1)
    el.setAttribute('current', '2')
    expect(reqs.length).toBe(2)
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    // 切 client：三态复位（含请求状态）
    el.setAttribute('row-model', 'client')
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
    // 切回 server：请求状态已清 → 以 init 重新发起
    el.setAttribute('row-model', 'server')
    expect(reqs.length).toBe(3)
    expect(reqs[2]!.reason).toBe('init')
    expect(reqs[2]!.requestId).toBe(3)
    expect(el.shadowRoot!.querySelector('td.loading')).not.toBeNull()
  })

  it('F3④：移除 total 清态（错误条消失），回加 total 重发 init', () => {
    const reqs: { requestId: number; reason: string }[] = []
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('data', JSON.stringify([{ name: '旧', age: 1 }]))
    el.addEventListener('oas-rows-request', (e) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    document.body.appendChild(el)
    el.setAttribute('current', '2')
    expect(reqs.length).toBe(2)
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(false)
    // 移除 total：server 失效 → 清态
    el.removeAttribute('total')
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
    expect(rowsOf(el).length, 'client 语义渲染旧数据').toBe(1)
    // 回加 total：server 重新生效 → 请求状态已清 → init 重发
    el.setAttribute('total', '10')
    expect(reqs.length).toBe(3)
    expect(reqs[2]!.reason).toBe('init')
  })

  /** F4 回归：同值 total 写入清态后强制重渲染（同值不进渲染签名，增量快路径会吞掉
      清态后的重渲染——错误条/loading 行卡死在屏上） */
  it('F4：错误态下宿主写同值 total → 错误条消失（同值回填清态立即生效）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '10')
    el.setAttribute('data', JSON.stringify([{ name: '旧', age: 1 }]))
    document.body.appendChild(el)
    el.setAttribute('current', '2')
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(false)
    // 同值 total 写入（宿主重发响应语义）：清 loading/失败条必须立即可见
    el.setAttribute('total', el.getAttribute('total')!)
    expect(el.shadowRoot!.querySelector('.rows-error')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('td.loading')).toBeNull()
  })

  /** F5 回归：旧成功回填清 loading 后，当前在途请求的失败曾被 `!serverLoading` 前置
      吞掉（oas-rows-error 零派发、错误条不显示）——门槛只留 requestId 单一判定 */
  it('F5：loading 被回填清零后当前序号失败仍生效（超时兜底回填 + 错误随后到达链路）', () => {
    const { el, reqs, errs } = mountReq({ 'row-model': 'server', total: '10' })
    // 请求 1（init）→ 宿主超时兜底回填占位数据（属性写清 loading；requestId 仍为 1）
    el.setAttribute('data', JSON.stringify([{ name: '占位', age: 0 }]))
    expect(reqs.length).toBe(1)
    // 同一序号的失败随后才到（宿主 fetch reject 晚于超时回填）——requestId 匹配在途序号，
    // 不得因 serverLoading 已被回填清零而吞掉
    el.reportRowsError({ requestId: 1, reason: 'init', error: new Error('timeout') })
    expect(errs).toEqual([{ requestId: 1, reason: 'init' }])
    expect(errorBar(el).hasAttribute('hidden')).toBe(false)
    // 旧数据保留 + 错误条可见（交互连续性）
    expect(rowsOf(el).length).toBe(1)
  })

  it('F5：requestId 不匹配（晚到旧失败）静默丢弃 + 实例级一次性 devWarn（可诊断性不刷屏）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, errs } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('current', '2') // 请求 2 在途
    el.reportRowsError({ requestId: 1, reason: 'init' }) // 晚到旧失败
    expect(errs.length).toBe(0)
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
    expect(warn, '晚到失败给一次性可诊断提示').toHaveBeenCalledTimes(1)
    el.reportRowsError({ requestId: 999 })
    expect(errs.length).toBe(0)
    expect(warn, '同实例去重：第二次不重复告警').toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  /** F7 回归：前提告警延后到微任务复核（框架宿主逐 prop 赋值必出现「先 row-model 后
      total」的同 tick 两写，同步判定曾立即误报「前提不满足」） */
  it('F7①：已连接后先写 row-model 再写 total（同 tick 两写）→ 零误报且 server 正常生效', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const reqs: { requestId: number; reason: string }[] = []
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    el.addEventListener('oas-rows-request', (e) => {
      const d = (e as CustomEvent).detail
      reqs.push({ requestId: d.requestId, reason: d.reason })
    })
    document.body.appendChild(el)
    // 框架宿主逐 prop 赋值形态：先 row-model（此刻 total 未到，渲染按 client 行为）
    el.setAttribute('row-model', 'server')
    // 同 tick 补 total
    el.setAttribute('total', '10')
    // 微任务合并窗口后：前提已满足 → 不告警；server 生效派 init
    await flushMicrotask()
    expect(warn, '逐 prop 赋值的临时前提空窗不误报').not.toHaveBeenCalled()
    expect(reqs.length).toBe(1)
    expect(reqs[0]!.reason).toBe('init')
    warn.mockRestore()
  })

  it('F7②：确实缺 total → 微任务复核后仍告警恰一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    el.setAttribute('row-model', 'server')
    document.body.appendChild(el)
    await flushMicrotask()
    expect(warn, '持续缺前提仍告警一次').toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('total')
    warn.mockRestore()
  })

  /** F6 回归：重试按钮匿名监听不随 bind 幂等——onReconnect（断连重连）重跑 bind 后
      监听线性叠加，单击重试触发多次 refreshRows（重复请求风暴） */
  it('F6：断连重连后单击重试只派 1 次 refresh 请求（监听不叠加）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('current', '2')
    el.reportRowsError({ requestId: 2, reason: 'paginate' })
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(false)
    // 断连重连两次（bind 重跑三次）
    const parent = el.parentElement!
    el.remove()
    parent.appendChild(el)
    el.remove()
    parent.appendChild(el)
    // 单击重试：若监听叠加会派多次 refresh
    el.shadowRoot!.querySelector<HTMLElement>('.rows-error-retry')!.click()
    expect(reqs.length).toBe(3)
    expect(reqs[2]).toEqual({ requestId: 3, reason: 'refresh' })
    warn.mockRestore()
  })

  /** F8 回归：server 模式 ARIA 行数口径对齐 windowed 全量语义——aria-rowcount 用
      total（此前误用当前页行数）、行 aria-rowindex 加页偏移（此前页内 1..n，
      读屏「第 x 行/共 N 行」跨页错乱） */
  it('F8：server 下 aria-rowcount=total、首行 rowindex=(current-1)*pageSize+1', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '100')
    el.setAttribute('pagination', '')
    el.setAttribute('page-size', '10')
    el.setAttribute('current', '2')
    el.setAttribute('data', '[]')
    document.body.appendChild(el)
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: 'a', age: 1 },
        { name: 'b', age: 2 },
        { name: 'c', age: 3 },
      ]),
    )
    const table = el.shadowRoot!.querySelector('table')!
    expect(table.getAttribute('aria-rowcount'), 'rowcount 用外部 total 全量口径').toBe('100')
    const first = rowsOf(el)[0]!
    expect(first.getAttribute('aria-rowindex'), '第 2 页首行 = (2-1)*10+1 = 11').toBe('11')
    expect(rowsOf(el)[1]!.getAttribute('aria-rowindex')).toBe('12')
    // client 模式（无 total/非 server）口径不变：rowcount = 当前展示集数据行数、rowindex 页内 1..n
    document.body.innerHTML = ''
    const client = new OASTable()
    client.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    client.setAttribute(
      'data',
      JSON.stringify([
        { name: 'a', age: 1 },
        { name: 'b', age: 2 },
      ]),
    )
    document.body.appendChild(client)
    const clientTable = client.shadowRoot!.querySelector('table')!
    expect(clientTable.getAttribute('aria-rowcount')).toBe('2')
    expect(rowsOf(client)[0]!.getAttribute('aria-rowindex')).toBe('1')
  })
})
