import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

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

describe('OASTable server 行模型 a2：row-model 属性', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('row-model="server" 缺 total：devWarn 一次 + 按 client 行为（本地排序照常执行）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      'row-model': 'server',
      data: JSON.stringify([
        { name: '乙', age: 2 },
        { name: '甲', age: 1 },
      ]),
    })
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
    const { el, reqs, errs } = mountReq({ 'row-model': 'server', total: '10' })
    el.setAttribute('current', '2') // requestId 2 在途
    expect(reqs.length).toBe(2)
    el.reportRowsError({ requestId: 1, reason: 'init' }) // 晚到旧失败
    expect(errs.length).toBe(0)
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
    el.reportRowsError({ requestId: 999 }) // 超前未知序号
    expect(errs.length).toBe(0)
    expect(errorBar(el)!.hasAttribute('hidden')).toBe(true)
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
