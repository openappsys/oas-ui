import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
import { applyColumnReorder } from './oas-table-column-settings.js'

const COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', sortable: true },
  { key: 'age', title: '年龄' },
])
const DATA = JSON.stringify([
  { name: '张三', age: 30 },
  { name: '李四', age: 25 },
  { name: '王五', age: 35 },
])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', COLUMNS)
  if (!attrs.data) el.setAttribute('data', DATA)
  document.body.appendChild(el)
  return el
}

function rows(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

function headers(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="header"]')] as HTMLElement[]
}

describe('OASTable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染表头与数据行', () => {
    const el = mount()
    expect(headers(el).length).toBe(2)
    expect(headers(el)[0]!.textContent).toContain('姓名')
    expect(rows(el).length).toBe(3)
    expect(rows(el)[0]!.textContent).toContain('张三')
  })

  it('点击可排序列切换排序并派发 oas-sort-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-sort-change', (e: Event) => (detail = (e as CustomEvent).detail))
    headers(el)[0]!.click()
    expect(detail).toEqual({ key: 'name', order: 'asc' })
    const firstRow = rows(el)[0]!.textContent ?? ''
    // 确定性码点排序（不依赖宿主 locale 拼音）：张(0x5F20) < 李(0x674E) < 王(0x738B)
    expect(firstRow).toContain('张三')
  })

  it('empty 空态：无数据时显示占位', () => {
    const el = mount({ data: '[]' })
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
  })

  it('点击行派发 oas-row-click', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-row-click', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(el)[1]!.click()
    expect((detail as { row: Record<string, unknown> }).row['name']).toBe('李四')
  })

  it('#20 行点击忽略交互控件内点击（内嵌按钮不触发行选中/重渲染，避免销毁内嵌浮层）', () => {
    const el = new OASTable()
    el.setAttribute('data', DATA)
    el.columns = [
      { key: 'name', title: '姓名' },
      { key: 'op', title: '操作', render: () => { const b = document.createElement('button'); b.textContent = '删除'; return b } },
    ]
    document.body.appendChild(el)
    let rowClick = 0
    el.addEventListener('oas-row-click', () => rowClick++)
    el.shadowRoot!.querySelector<HTMLElement>('td[data-col="op"] button')!.click()
    expect(rowClick, '按钮点击不应触发行点击').toBe(0)
    expect(el.getAttribute('selected')).toBeFalsy()
    // 文本单元格点击 → 行点击正常
    el.shadowRoot!.querySelector<HTMLElement>('td[data-col="name"]')!.click()
    expect(rowClick).toBe(1)
  })

  it('checkable：渲染行复选框，勾选派发 oas-check', () => {
    const el = mount({ checkable: '', 'row-key': 'name' })
    let detail: unknown
    el.addEventListener('oas-check', (e: Event) => (detail = (e as CustomEvent).detail))
    const boxes = el.shadowRoot!.querySelectorAll('.check-cell input[type="checkbox"]')
    expect(boxes.length).toBe(4)
    ;(boxes[1] as HTMLInputElement).click()
    expect((detail as { keys: string[] }).keys).toEqual(['张三'])
    expect(el.getAttribute('selected')).toBe('张三')
  })

  it('loading：显示加载占位行，不渲染数据行', () => {
    const el = mount({ loading: '' })
    expect(el.shadowRoot!.querySelector('[part="loading-row"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).toContain('加载中')
    expect(rows(el).length).toBe(0)
    // 表头仍保留
    expect(headers(el).length).toBe(2)
  })

  it('loading 与空数据同时存在时优先显示加载态', () => {
    const el = mount({ loading: '', data: '[]' })
    expect(el.shadowRoot!.querySelector('[part="loading-row"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).not.toContain('暂无数据')
  })

  it('loading 移除后恢复数据行', () => {
    const el = mount({ loading: '' })
    expect(rows(el).length).toBe(0)
    el.removeAttribute('loading')
    expect(rows(el).length).toBe(3)
    expect(rows(el)[0]!.textContent).toContain('张三')
  })

  it('locale：全选/行选择 aria-label 随 setLocale 切换', () => {
    const el = mount({ checkable: '', 'row-key': 'name' })
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('.check-cell input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('全选')
    expect(
      el
        .shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="checkbox"]')[1]!
        .getAttribute('aria-label'),
    ).toBe('选择行 张三')

    setLocale(en)
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('.check-cell input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('Select all')
    expect(
      el
        .shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="checkbox"]')[1]!
        .getAttribute('aria-label'),
    ).toBe('Select row 张三')

    setLocale('zh-CN')
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('.check-cell input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('全选')
  })

  it('locale：空态/加载文案随 setLocale 切换，empty-text 属性优先', () => {
    const empty = mount({ data: '[]' })
    expect(empty.shadowRoot!.textContent).toContain('暂无数据')
    const loading = mount({ loading: '' })
    expect(loading.shadowRoot!.textContent).toContain('加载中')
    const custom = mount({ data: '[]', 'empty-text': '没有更多' })
    expect(custom.shadowRoot!.textContent).toContain('没有更多')

    setLocale(en)
    expect(empty.shadowRoot!.textContent).toContain('No data')
    expect(loading.shadowRoot!.textContent).toContain('Loading')
    expect(custom.shadowRoot!.textContent).toContain('没有更多')

    setLocale('zh-CN')
    expect(empty.shadowRoot!.textContent).toContain('暂无数据')
    expect(loading.shadowRoot!.textContent).toContain('加载中')
  })
})

const flushRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

function cells(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('tbody td')] as HTMLElement[]
}

function scrollWrap(el: OASTable): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.table-scroll')!
}

const BIG_DATA = JSON.stringify(
  Array.from({ length: 50 }, (_, i) => ({ id: i, name: `行${i}`, age: 20 + (i % 20) })),
)

describe('OASTable 固定列', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('fixed 列：表头与单元格写入 sticky 偏移', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'id', title: 'ID', fixed: 'left', width: '60px' },
        { key: 'name', title: '姓名', width: '100px' },
        { key: 'age', title: '年龄', fixed: 'right', width: '80px' },
      ]),
      data: JSON.stringify([{ id: 1, name: '张三', age: 30 }]),
    })
    const ths = headers(el)
    expect(ths[0]!.getAttribute('data-fixed')).toBe('left')
    expect(ths[0]!.style.left).toBe('0px')
    expect(ths[1]!.getAttribute('data-fixed')).toBeNull()
    expect(ths[2]!.getAttribute('data-fixed')).toBe('right')
    expect(ths[2]!.style.right).toBe('0px')

    const tds = cells(el)
    expect(tds.length).toBe(3)
    expect(tds[0]!.getAttribute('data-fixed')).toBe('left')
    expect(tds[0]!.style.left).toBe('0px')
    expect(tds[1]!.getAttribute('data-fixed')).toBeNull()
    expect(tds[2]!.getAttribute('data-fixed')).toBe('right')
    expect(tds[2]!.style.right).toBe('0px')
  })

  it('多个左侧固定列 left 偏移按列宽累加', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'a', title: 'A', fixed: 'left', width: '40px' },
        { key: 'b', title: 'B', fixed: 'left', width: '60px' },
        { key: 'c', title: 'C' },
      ]),
      data: JSON.stringify([{ a: 1, b: 2, c: 3 }]),
    })
    const ths = headers(el)
    expect(ths[0]!.style.left).toBe('0px')
    expect(ths[1]!.style.left).toBe('40px')
    expect(cells(el)[1]!.style.left).toBe('40px')
  })

  it('checkable 且存在 fixed 列时，勾选列并入左侧 sticky', () => {
    const el = mount({
      checkable: '',
      'row-key': 'id',
      columns: JSON.stringify([
        { key: 'id', title: 'ID', fixed: 'left', width: '40px' },
        { key: 'name', title: '姓名' },
      ]),
      data: JSON.stringify([{ id: 1, name: '张三' }]),
    })
    // 勾选列宽 40px，第一列 left 偏移 = 40px
    const ths = headers(el)
    const checkTh = el.shadowRoot!.querySelector<HTMLElement>('.check-cell')!
    expect(checkTh.getAttribute('data-fixed')).toBe('left')
    expect(checkTh.style.left).toBe('0px')
    expect(ths[0]!.style.left).toBe('40px')
  })
})

describe('OASTable 虚拟滚动', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('height 开启后仅渲染可见窗口行 + 首尾占位行', () => {
    const el = mount({
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
      data: BIG_DATA,
    })
    // 可见 5 行 + 下方 buffer 4 = 9 行；占位行 2（顶/底）
    expect(scrollWrap(el).getAttribute('data-virtual')).toBe('true')
    expect(scrollWrap(el).style.maxHeight).toBe('200px')
    const trs = [...el.shadowRoot!.querySelectorAll('tbody tr')]
    expect(trs.length).toBe(11)
    expect(trs[0]!.className).toContain('spacer')
    expect((trs[0]!.firstElementChild as HTMLElement).style.height).toBe('0px')
    expect(rows(el).length).toBe(9)
    expect(rows(el)[0]!.textContent).toContain('行0')
    const last = trs.at(-1) as HTMLElement
    expect(last.className).toContain('spacer')
    expect((last.firstElementChild as HTMLElement).style.height).toBe('1640px')
  })

  it('滚动后重算窗口并派发 oas-scroll', async () => {
    const el = mount({
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
      data: BIG_DATA,
    })
    let detail: unknown
    el.addEventListener('oas-scroll', (e: Event) => (detail = (e as CustomEvent).detail))
    const wrap = scrollWrap(el)
    wrap.scrollTop = 200
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // floor(200/40)-4 = 1；ceil((200+200)/40)+4 = 14
    expect(rows(el)[0]!.textContent).toContain('行1')
    expect(detail).toEqual({ scrollTop: 200, start: 1, end: 14 })
  })

  it('虚拟滚动下排序仍然生效', () => {
    const el = mount({
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([
        { key: 'age', title: '年龄', sortable: true },
        { key: 'name', title: '姓名' },
      ]),
      data: BIG_DATA,
    })
    headers(el)[0]!.click()
    expect(el.getAttribute('sort-key')).toBe('age')
    // 升序首行应为最小 age（20）→ 行0（age 20 的最小行，稳定排序）
    expect(rows(el)[0]!.textContent).toContain('行0')
  })

  it('虚拟滚动下多选仍可勾选行并派发 oas-check', () => {
    const el = mount({
      height: '200',
      'row-height': '40',
      checkable: '',
      'row-key': 'id',
      columns: JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
      data: BIG_DATA,
    })
    let detail: unknown
    el.addEventListener('oas-check', (e: Event) => (detail = (e as CustomEvent).detail))
    const boxes = el.shadowRoot!.querySelectorAll<HTMLInputElement>(
      '.check-cell input[type="checkbox"]',
    )
    // 表头 + 9 可见行
    expect(boxes.length).toBe(10)
    boxes[1]!.click()
    expect(el.getAttribute('selected')).toBe('0')
    expect((detail as { keys: string[] }).keys).toEqual(['0'])
  })

  it('height 未设置时保持全量渲染（与既有行为一致）', () => {
    const el = mount()
    expect(scrollWrap(el).getAttribute('data-virtual')).toBeNull()
    expect(rows(el).length).toBe(3)
  })

  it('loading / 空态与虚拟滚动并存不冲突', () => {
    const el = mount({
      height: '200',
      'row-height': '40',
      loading: '',
      columns: JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
      data: BIG_DATA,
    })
    expect(el.shadowRoot!.querySelector('[part="loading-row"]')).not.toBeNull()
    expect(rows(el).length).toBe(0)
  })
})

describe('OASTable 属性/attribute 声明式通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('attribute 通道：声明式 columns/data JSON 字符串渲染表头与数据行', () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: 'Name' },
        { key: 'age', title: 'Age' },
      ]),
    )
    el.setAttribute('data', JSON.stringify([{ name: 'Alice', age: 30 }]))
    document.body.appendChild(el)
    expect(headers(el)[0]!.textContent).toBe('Name')
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toContain('Alice')
  })

  it('attribute 通道：setAttribute 新 data JSON 驱动重渲染', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Name' }]))
    el.setAttribute('data', JSON.stringify([{ name: 'Alice' }]))
    document.body.appendChild(el)
    expect(rows(el)[0]!.textContent).toContain('Alice')
    el.setAttribute('data', JSON.stringify([{ name: 'Bob' }]))
    expect(rows(el)[0]!.textContent).toContain('Bob')
    expect(rows(el)[0]!.textContent).not.toContain('Alice')
  })

  it('JSON 非法容错：columns/data 非 JSON 不抛错且渲染空态', () => {
    const el = new OASTable()
    el.setAttribute('columns', 'not-json')
    el.setAttribute('data', 'not-json')
    document.body.appendChild(el)
    expect(rows(el).length).toBe(0)
    expect(headers(el).length).toBe(0)
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
    // 变化为合法 JSON 后恢复
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Name' }]))
    el.setAttribute('data', JSON.stringify([{ name: 'Alice' }]))
    expect(headers(el).length).toBe(1)
    expect(rows(el).length).toBe(1)
  })

  it('property 通道：赋值数组对象反射到 attribute 并渲染', () => {
    const el = new OASTable()
    document.body.appendChild(el)
    el.columns = [{ key: 'name', title: 'Name' }]
    el.data = [{ name: 'Alice' }]
    expect(el.getAttribute('columns')).toContain('"key":"name"')
    expect(el.getAttribute('data')).toContain('"name":"Alice"')
    expect(headers(el)[0]!.textContent).toBe('Name')
    expect(rows(el)[0]!.textContent).toContain('Alice')
    // property 为最后写入源：再赋值即重渲染
    el.data = [{ name: 'Bob' }]
    expect(rows(el)[0]!.textContent).toContain('Bob')
  })

  it('property 优先：property 赋值晚于既有 attribute，结果以 property 为准', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Attr' }]))
    el.setAttribute('data', JSON.stringify([{ name: 'AttrRow' }]))
    document.body.appendChild(el)
    expect(headers(el)[0]!.textContent).toBe('Attr')
    // 宿主框架（Vue/React）渲染时会走 property 赋值，覆盖 attribute 初值
    el.columns = [{ key: 'name', title: 'Prop' }]
    el.data = [{ name: 'PropRow' }]
    expect(headers(el)[0]!.textContent).toBe('Prop')
    expect(rows(el)[0]!.textContent).toContain('PropRow')
  })

  it('真水合：DSD 快照存在时 hydrate 接管，shadow 不重建（style 引用保持）', () => {
    // 模拟浏览器 DSD upgrade：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」
    // （等价于 <template shadowrootmode="open"> 已由 HTML 解析器附加），
    // connectedCallback 触发 tryHydrate → hydrate() 应接管、不重建 shadow。
    const snap = new OASTable()
    snap.shadowRoot!.innerHTML = `
      <meta data-oas-ssr="oas-table" data-oas-ssr-v="1">
      <style>.probe-style { color: red; }</style>
      <div class="table-scroll" part="scroll" tabindex="0">
        <table part="table"><thead part="head"></thead><tbody part="body"></tbody></table>
      </div>`
    const styleSnap = snap.shadowRoot!.querySelector('style')!
    const wrapSnap = snap.shadowRoot!.querySelector('.table-scroll')!
    document.body.appendChild(snap) // connectedCallback → tryHydrate
    // hydrate 接管：style / wrap 节点引用保持同一对象（shadow 未重建）
    expect(snap.shadowRoot!.querySelector('style')).toBe(styleSnap)
    expect(snap.shadowRoot!.querySelector('.table-scroll')).toBe(wrapSnap)
    // 指纹 meta 已移除（防止二次误判）
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    // 属性驱动的数据行照常增量写入（update 只重建 thead/tbody 内容）
    snap.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Name' }]))
    snap.setAttribute('data', JSON.stringify([{ name: 'Alice' }]))
    expect(snap.shadowRoot!.querySelector('style')).toBe(styleSnap)
    expect(headers(snap)[0]!.textContent).toBe('Name')
    expect(rows(snap)[0]!.textContent).toContain('Alice')
  })

  it('真水合回退：快照缺关键结构时回退 render 全量重建，功能仍正常', () => {
    const snap = new OASTable()
    // 指纹命中但结构不完整（无 table-scroll）→ hydrate 返回 false → render 重建
    snap.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-table" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(snap)
    expect(snap.shadowRoot!.querySelector('.table-scroll')).not.toBeNull()
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    snap.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Name' }]))
    snap.setAttribute('data', JSON.stringify([{ name: 'Alice' }]))
    expect(rows(snap)[0]!.textContent).toContain('Alice')
  })
})

describe('OASTable 展示增强（stripe/bordered/summary/expand/tree）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('stripe：偶数/奇数行交替写入 data-stripe 类标记', () => {
    const el = mount({ stripe: '' })
    const trs = rows(el)
    expect(trs.length).toBe(3)
    expect(trs[0]!.getAttribute('data-stripe')).toBe('even')
    expect(trs[1]!.getAttribute('data-stripe')).toBe('odd')
    expect(trs[2]!.getAttribute('data-stripe')).toBe('even')
    // 未开启 stripe 时不写标记
    const plain = mount()
    expect(rows(plain)[0]!.getAttribute('data-stripe')).toBeNull()
  })

  it('bordered：宿主属性生效且样式表含单元格描边规则', () => {
    const el = mount({ bordered: '' })
    expect(el.hasAttribute('bordered')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent
    expect(style).toContain(':host([bordered]) td')
    expect(style).toContain(':host([bordered]) th')
    // 数据仍正常渲染
    expect(rows(el).length).toBe(3)
  })

  it('summary：表格级配置渲染合计行（sum/avg/count + label）', () => {
    const el = mount({
      summary: '[{"key":"age","type":"sum","label":"合计"}]',
      'row-key': 'name',
    })
    const row = el.shadowRoot!.querySelector('[part="summary-row"]')!
    expect(row).not.toBeNull()
    expect(row.className).toContain('summary')
    // 30 + 25 + 35 = 90；首列放标签
    expect(row.textContent).toContain('90')
    expect(row.textContent).toContain('合计')

    const avg = mount({
      summary: '[{"key":"age","type":"avg"}]',
      'row-key': 'name',
    })
    expect(avg.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('30')
    // 默认标签走 locale
    expect(avg.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('合计')

    const count = mount({ summary: '[{"key":"age","type":"count"}]', 'row-key': 'name' })
    expect(count.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('3')
  })

  it('summary：列级 summary 字段同样触发合计行', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄', summary: 'sum' },
      ]),
      'row-key': 'name',
    })
    const row = el.shadowRoot!.querySelector('[part="summary-row"]')!
    expect(row.textContent).toContain('90')
  })

  it('summary：与 checkable 并存时合计行列数对齐', () => {
    const el = mount({
      checkable: '',
      summary: '[{"key":"age","type":"sum"}]',
      'row-key': 'name',
    })
    const row = el.shadowRoot!.querySelector('[part="summary-row"]')!
    expect(row.querySelectorAll('td').length).toBe(3)
  })

  it('summary-scope=all（默认）：分页时合计为完整筛选结果总计，翻页不变', () => {
    const data = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ name: `n${i}`, price: i + 1 })))
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'price', title: '金额' },
      ]),
      data,
      'row-key': 'name',
      pagination: '',
      'page-size': '5',
      summary: '[{"key":"price","type":"sum","label":"合计"}]',
    })
    // 默认 all：合计 = 全量总和 1+2+...+12 = 78
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('78')
    // 翻到第 2 页（current=2），合计仍为全量 78
    el.setAttribute('current', '2')
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('78')
  })

  it('summary-scope=all 缓存：非数据变化（选中/翻页）重渲染后合计不变，数据变化后重算', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: `n${i}`, price: i + 1 }))
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'price', title: '金额' },
      ]),
      data: JSON.stringify(data),
      'row-key': 'name',
      pagination: '',
      'page-size': '5',
      summary: '[{"key":"price","type":"sum"}]',
    })
    // 全量合计 78
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('78')
    // 选中一行（非数据变化 → 触发 update，走缓存），合计仍 78
    el.setAttribute('selected', 'n0')
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('78')
    // 数据变化（加一行）→ 缓存失效重算，合计 78+13=91
    data.push({ name: 'n12', price: 13 })
    el.setAttribute('data', JSON.stringify(data))
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('91')
  })

  it('summary-scope=page：分页时合计为当前页小计', () => {
    const data = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ name: `n${i}`, price: i + 1 })))
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'price', title: '金额' },
      ]),
      data,
      'row-key': 'name',
      pagination: '',
      'page-size': '5',
      'summary-scope': 'page',
      summary: '[{"key":"price","type":"sum"}]',
    })
    // 第 1 页 price 1..5 → 15
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('15')
    // 第 2 页 price 6..10 → 40
    el.setAttribute('current', '2')
    expect(el.shadowRoot!.querySelector('[part="summary-row"]')!.textContent).toContain('40')
  })

  it('expand：行尾按钮展开内容行并派发 oas-expand', () => {
    const el = mount({
      'row-key': 'name',
      data: JSON.stringify([
        { name: '张三', age: 30, expand: '<div>备注：技术骨干</div>' },
        { name: '李四', age: 25 },
      ]),
    })
    // 仅含 expand 字段的行有按钮，表头多一列空列（含 part 列 + 尾列 = 3 个 th）
    expect(el.shadowRoot!.querySelectorAll('thead th').length).toBe(3)
    const toggles = el.shadowRoot!.querySelectorAll('td.expand-toggle-cell button')
    expect(toggles.length).toBe(1)

    let detail: unknown
    el.addEventListener('oas-expand', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(toggles[0] as HTMLButtonElement).click()
    expect(detail).toEqual({ key: '张三', expanded: true })
    expect(el.getAttribute('expanded')).toBe('张三')
    const expandRow = el.shadowRoot!.querySelector('[part="expand-row"]')
    expect(expandRow).not.toBeNull()
    expect(expandRow!.textContent).toContain('技术骨干')

    // 再次点击收起
    const toggles2 = el.shadowRoot!.querySelectorAll('td.expand-toggle-cell button')
    ;(toggles2[0] as HTMLButtonElement).click()
    expect(el.getAttribute('expanded')).toBe('')
    expect(el.shadowRoot!.querySelector('[part="expand-row"]')).toBeNull()
  })

  it('expand：点击展开按钮不触发行选中（非 checkable 时）', () => {
    const el = mount({
      'row-key': 'name',
      data: JSON.stringify([{ name: '张三', age: 30, expand: '<div>x</div>' }]),
    })
    el.shadowRoot!.querySelector<HTMLButtonElement>('td.expand-toggle-cell button')!.click()
    expect(el.getAttribute('selected')).toBeNull()
  })

  it('tree：children 父行展开子行（缩进）并派发 oas-expand', () => {
    const el = mount({
      'row-key': 'name',
      data: JSON.stringify([
        {
          name: '研发部',
          age: 0,
          children: [
            { name: '张三', age: 30 },
            { name: '李四', age: 25 },
          ],
        },
        { name: '产品部', age: 0 },
      ]),
    })
    // 初始只渲染父行
    expect(rows(el).length).toBe(2)
    const toggles = el.shadowRoot!.querySelectorAll('td button.toggle')
    expect(toggles.length).toBe(1)

    let detail: unknown
    el.addEventListener('oas-expand', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(toggles[0] as HTMLButtonElement).click()
    expect(detail).toEqual({ key: '研发部', expanded: true })
    expect(el.getAttribute('expanded')).toBe('研发部')
    expect(rows(el).length).toBe(4)
    // 展开后顺序：研发部 / 张三 / 李四 / 产品部
    expect(rows(el)[1]!.textContent).toContain('张三')
    expect(rows(el)[2]!.textContent).toContain('李四')
    // 子行首格按层级缩进（16 + depth*24 = 40px）
    const firstCell = rows(el)[1]!.querySelector('td') as HTMLElement
    expect(firstCell.style.paddingLeft).toBe('40px')

    // 再次点击收起
    const toggles2 = el.shadowRoot!.querySelectorAll('td button.toggle')
    ;(toggles2[0] as HTMLButtonElement).click()
    expect(rows(el).length).toBe(2)
  })

  it('tree：多级 children 嵌套展开缩进逐级加深', () => {
    const el = mount({
      'row-key': 'name',
      data: JSON.stringify([
        {
          name: '总部',
          age: 0,
          children: [
            {
              name: '研发部',
              age: 0,
              children: [{ name: '张三', age: 30 }],
            },
          ],
        },
      ]),
    })
    expect(rows(el).length).toBe(1)
    const first = el.shadowRoot!.querySelector('td button.toggle') as HTMLButtonElement
    first.click()
    // 展开总部 → 研发部 出现（depth 1）
    expect(rows(el).length).toBe(2)
    const second = el.shadowRoot!.querySelectorAll('td button.toggle')[1] as HTMLButtonElement
    second.click()
    // 再展开研发部 → 张三 出现（depth 2，缩进 16 + 48 = 64px）
    expect(rows(el).length).toBe(3)
    const cell = rows(el)[2]!.querySelector('td') as HTMLElement
    expect(cell.style.paddingLeft).toBe('64px')
  })
})

const EDIT_COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', editable: true },
  { key: 'age', title: '年龄', editable: true },
  { key: 'city', title: '城市' },
  {
    key: 'position',
    title: '职位',
    editable: true,
    editor: 'select',
    editOptions: [
      { label: '前端工程师', value: 'frontend' },
      { label: '后端工程师', value: 'backend' },
    ],
  },
  { key: 'op', title: '操作', actions: true },
])
const EDIT_DATA = JSON.stringify([
  { name: '张三', age: 30, city: '北京', position: 'frontend' },
  { name: '李四', age: 25, city: '上海', position: 'backend' },
])

describe('OASTable 行内编辑（inline editing）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const editMount = (extra: Record<string, string> = {}): OASTable =>
    mount({ editable: '', 'row-key': 'name', columns: EDIT_COLUMNS, data: EDIT_DATA, ...extra })

  const cellInput = (el: OASTable, row: number, col: number): HTMLInputElement | null =>
    cells(el)[row * 5 + col]!.querySelector<HTMLInputElement>('input.cell-editor')

  const cellSelect = (el: OASTable, row: number, col: number): HTMLSelectElement | null =>
    cells(el)[row * 5 + col]!.querySelector<HTMLSelectElement>('select.cell-editor')

  it('editable 列双击进入编辑：input 编辑器、列高亮、aria 标签', () => {
    const el = editMount()
    const td = cells(el)[0]!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('张三')
    expect(td.getAttribute('data-editing')).toBe('true')
    expect(td.classList.contains('editing')).toBe(true)
    // 编辑状态列高亮：表头写入标记
    const th = el.shadowRoot!.querySelector('th[data-key="name"]')!
    expect(th.getAttribute('data-editing-col')).toBe('true')
    // aria：编辑器有可读名称
    expect(input!.getAttribute('aria-label')).toContain('姓名')
    expect(input!.getAttribute('aria-label')).toContain('张三')
  })

  it('非 editable 列双击不进入编辑', () => {
    const el = editMount()
    cells(el)[2]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(cells(el)[2]!.querySelector('input.cell-editor')).toBeNull()
    expect(el.shadowRoot!.querySelector('[data-editing="true"]')).toBeNull()
  })

  it('editable 属性未开启时双击不进入编辑', () => {
    const el = mount({ 'row-key': 'name', columns: EDIT_COLUMNS, data: EDIT_DATA })
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(cells(el)[0]!.querySelector('input.cell-editor')).toBeNull()
  })

  it('可编辑单元格可聚焦，不可编辑列无 tabindex', () => {
    const el = editMount()
    expect(cells(el)[0]!.getAttribute('tabindex')).toBe('0')
    expect(cells(el)[2]!.getAttribute('tabindex')).toBeNull()
  })

  it('select 编辑器：按列 editor 类型渲染下拉（选项 + 回填当前值）', () => {
    const el = editMount()
    cells(el)[3]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const select = cellSelect(el, 0, 3)
    expect(select).not.toBeNull()
    expect([...select!.options].map((o) => o.textContent)).toEqual(['前端工程师', '后端工程师'])
    expect(select!.value).toBe('frontend')
  })

  it('Enter 提交（非受控）：回写 data、单元格文本更新、派发 oas-edit', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 0)!
    input.value = '张四'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    // 非受控：组件自行回写 data 属性
    expect(el.getAttribute('data')).toContain('"张四"')
    expect(cells(el)[0]!.textContent).toBe('张四')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张四' })
    // 编辑态退出：编辑器移除、表头高亮清除
    expect(el.shadowRoot!.querySelector('input.cell-editor')).toBeNull()
    expect(el.shadowRoot!.querySelector('th[data-editing-col="true"]')).toBeNull()
  })

  it('Enter 空值提交 → 还原旧值并派发 oas-edit-cancel（默认非破坏）', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit-cancel', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 0)!
    input.value = ''
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('data')).not.toContain('"张四"')
    expect(cells(el)[0]!.textContent).toBe('张三')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张三' })
  })

  const validateMount = (): OASTable => {
    const el = new OASTable()
    el.setAttribute('editable', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: '张三', age: 30 }]))
    el.columns = [
      { key: 'name', title: '姓名', editable: true, validate: (v: string) => (v === 'bad' ? '名称不合法' : '') },
      { key: 'age', title: '年龄', editable: true },
    ]
    document.body.appendChild(el)
    return el
  }

  it('#19 validate 校验失败：不提交、保持编辑态、显示错误文案', () => {
    const el = validateMount()
    const td = cells(el)[0]!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = 'bad'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('data')).not.toContain('"bad"')
    expect(td.querySelector('input.cell-editor')).not.toBeNull() // 仍编辑中
    expect(td.getAttribute('data-invalid')).toBe('true')
    expect(td.querySelector('.edit-error')!.textContent).toBe('名称不合法')
  })

  it('#19 validate 通过：正常提交并退出编辑', () => {
    const el = validateMount()
    const td = cells(el)[0]!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '张四'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('data')).toContain('"张四"')
    expect(td.querySelector('input.cell-editor')).toBeNull() // 退出编辑
  })

  it('Esc 取消：值还原、数据不变、派发 oas-edit-cancel', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit-cancel', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 0)!
    input.value = '张四'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.getAttribute('data')).toContain('"张三"')
    expect(el.getAttribute('data')).not.toContain('"张四"')
    expect(cells(el)[0]!.textContent).toBe('张三')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张三' })
  })

  it('exitEdit 重画尊重 render/cellTemplate（Esc 取消后单元格保持富内容，不裸值）', () => {
    const el = new OASTable()
    el.setAttribute('editable', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: '张三', price: 899 }]))
    el.columns = [
      { key: 'name', title: '姓名' },
      { key: 'price', title: '价格', editable: true, render: (r) => `¥ ${r.price}` },
    ]
    document.body.appendChild(el)
    const td = el.shadowRoot!.querySelector('td[data-col="price"]')!
    // 初始渲染为 render 富内容「¥ 899」
    expect(td.textContent).toBe('¥ 899')
    // 双击进入编辑 + Esc 取消
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    // 退出后单元格仍应为 render 富内容「¥ 899」，而非裸值 899
    expect(td.textContent).toBe('¥ 899')
  })

  it('blur 提交：值变化后失焦提交', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 0)!
    input.value = '张四'
    input.dispatchEvent(new FocusEvent('blur'))
    expect(el.getAttribute('data')).toContain('"张四"')
    expect(cells(el)[0]!.textContent).toBe('张四')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张四' })
  })

  it('blur 空值 → 取消（非破坏）：数据不变、派发 oas-edit-cancel', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit-cancel', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 0)!
    input.value = ''
    input.dispatchEvent(new FocusEvent('blur'))
    expect(el.getAttribute('data')).not.toContain('"张四"')
    expect(cells(el)[0]!.textContent).toBe('张三')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张三' })
  })

  it('数字列编辑：新值按原类型转数字回写', () => {
    const el = editMount()
    cells(el)[1]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 1)!
    input.value = '31'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    // age 原为 number：回写为数字 31 而非字符串
    expect(el.getAttribute('data')).toContain('"age":31')
  })

  it('select 编辑器：change 提交选中值并显示 label', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[3]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const select = cellSelect(el, 0, 3)!
    select.value = 'backend'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.getAttribute('data')).toContain('"backend"')
    // 展示用选项 label
    expect(cells(el)[3]!.textContent).toBe('后端工程师')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'position', value: 'backend' })
  })

  it('受控模式（edit-controlled）：提交不回写 data，仅派发 oas-edit；宿主回写后重渲染', () => {
    const el = editMount({ 'edit-controlled': '' })
    let detail: unknown
    el.addEventListener('oas-edit', (e: Event) => (detail = (e as CustomEvent).detail))
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = cellInput(el, 0, 0)!
    input.value = '张四'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    // 受控：组件不自动回写 data
    expect(el.getAttribute('data')).not.toContain('"张四"')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张四' })
    // 宿主监听 oas-edit 自行更新 data → 重渲染新值
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '张四', age: 30, city: '北京', position: 'frontend' },
        { name: '李四', age: 25, city: '上海', position: 'backend' },
      ]),
    )
    expect(cells(el)[0]!.textContent).toBe('张四')
  })

  it('操作列：编辑/保存/取消按钮联动行内编辑，且不触发出选中', () => {
    const el = editMount()
    const tr = rows(el)[0]!
    const actionTd = tr.querySelectorAll('td')[4] as HTMLTableCellElement
    const editBtn = actionTd.querySelector<HTMLButtonElement>('.action-btn')
    expect(editBtn).not.toBeNull()
    expect(editBtn!.textContent).toBe('编辑')
    editBtn!.click()
    // 进入编辑：首个可编辑列出现输入框
    const input = tr.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('张三')
    // 操作列切换为 保存/取消
    expect(actionTd.querySelector('.action-btn.save')).not.toBeNull()
    expect(actionTd.querySelector('.action-btn.danger')).not.toBeNull()
    input!.value = '王五'
    actionTd.querySelector<HTMLButtonElement>('.action-btn.save')!.click()
    expect(cells(el)[0]!.textContent).toBe('王五')
    // 操作按钮不触发行选中
    expect(el.getAttribute('selected')).toBeNull()
  })

  it('操作列取消按钮：还原旧值并派发 oas-edit-cancel', () => {
    const el = editMount()
    let detail: unknown
    el.addEventListener('oas-edit-cancel', (e: Event) => (detail = (e as CustomEvent).detail))
    const tr = rows(el)[0]!
    const actionTd = tr.querySelectorAll('td')[4] as HTMLTableCellElement
    actionTd.querySelector<HTMLButtonElement>('.action-btn')!.click()
    const input = tr.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = 'X'
    actionTd.querySelector<HTMLButtonElement>('.action-btn.danger')!.click()
    expect(cells(el)[0]!.textContent).toBe('张三')
    expect(el.getAttribute('data')).toContain('"张三"')
    expect(detail).toEqual({ rowIndex: 0, key: '张三', column: 'name', value: '张三' })
  })

  it('键盘：聚焦可编辑单元格按 Enter / F2 进入编辑', () => {
    const el = editMount()
    cells(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(cellInput(el, 0, 0)).not.toBeNull()
    cells(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }))
    // F2 已处于编辑态，值保持
    expect(cellInput(el, 0, 0)!.value).toBe('张三')
  })

  it('外部重渲染（data 变化）时自动取消编辑，不留孤儿编辑器', () => {
    const el = editMount()
    cells(el)[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(el.shadowRoot!.querySelector('input.cell-editor')).not.toBeNull()
    el.setAttribute('data', EDIT_DATA)
    expect(el.shadowRoot!.querySelector('input.cell-editor')).toBeNull()
    expect(el.shadowRoot!.querySelector('[data-editing="true"]')).toBeNull()
  })

  it('虚拟滚动下可编辑：窗口内单元格双击进入编辑', () => {
    const el = editMount({ height: '120', 'row-height': '40' })
    // 虚拟模式 tbody 首行是占位行，取首个数据行（tr.row）的首个 td
    const td = rows(el)[0]!.querySelector('td')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(td.querySelector('input.cell-editor')).not.toBeNull()
  })
})

const STICKY_COLUMNS = JSON.stringify([
  { key: 'id', title: 'ID', fixed: 'left', width: '60px' },
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄', fixed: 'right', width: '80px' },
])
const STICKY_DATA = JSON.stringify(
  Array.from({ length: 6 }, (_, i) => ({ id: i, name: `行${i}`, age: 20 + i })),
)

describe('OASTable 吸顶行（sticky-rows）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('sticky-rows=N：前 N 行标记吸顶并写入 top 偏移，其余行不受影响', () => {
    const el = mount({ 'sticky-rows': '2', columns: STICKY_COLUMNS, data: STICKY_DATA })
    const trs = rows(el)
    expect(trs[0]!.getAttribute('data-sticky')).toBe('true')
    expect(trs[1]!.getAttribute('data-sticky')).toBe('true')
    expect(trs[2]!.getAttribute('data-sticky')).toBeNull()
    // happy-dom 无排版：thead 高度 0 → top 全为 0px（真实高度由浏览器排版，主 agent 复核）
    expect((trs[0]!.querySelector('td') as HTMLElement).style.top).toBe('0px')
    expect((trs[1]!.querySelector('td') as HTMLElement).style.top).toBe('0px')
    expect((trs[2]!.querySelector('td') as HTMLElement).style.top).toBe('')
    // 样式表含吸顶规则
    const css = el.shadowRoot!.querySelector('style')!.textContent
    expect(css).toContain("tr[data-sticky='true'] td")
  })

  it('sticky-rows 与固定列共存：吸顶行保留横向固定偏移', () => {
    const el = mount({ 'sticky-rows': '1', columns: STICKY_COLUMNS, data: STICKY_DATA })
    const tr = rows(el)[0]!
    expect(tr.getAttribute('data-sticky')).toBe('true')
    const tds = tr.querySelectorAll('td')
    expect(tds[0]!.getAttribute('data-fixed')).toBe('left')
    expect((tds[0] as HTMLElement).style.left).toBe('0px')
    expect((tds[0] as HTMLElement).style.top).toBe('0px')
    expect(tds[2]!.getAttribute('data-fixed')).toBe('right')
    expect((tds[2] as HTMLElement).style.right).toBe('0px')
  })

  it('虚拟滚动 + sticky-rows：吸顶行恒渲染，滚动后仍位于列表顶部', async () => {
    const el = mount({
      height: '120',
      'row-height': '40',
      'sticky-rows': '2',
      columns: JSON.stringify([
        { key: 'id', title: 'ID' },
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
      data: JSON.stringify(
        Array.from({ length: 50 }, (_, i) => ({ id: i, name: `行${i}`, age: i })),
      ),
    })
    expect(rows(el)[0]!.getAttribute('data-sticky')).toBe('true')
    expect(rows(el)[1]!.getAttribute('data-sticky')).toBe('true')
    const wrap = scrollWrap(el)
    wrap.scrollTop = 2000
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const trs = rows(el)
    // 滚到底后吸顶行仍在
    expect(trs[0]!.getAttribute('data-sticky')).toBe('true')
    expect(trs[1]!.getAttribute('data-sticky')).toBe('true')
    expect(trs.at(-1)!.textContent).toContain('行49')
  })

  it('sticky-rows 未设置时不写入吸顶标记', () => {
    const el = mount()
    expect(rows(el)[0]!.getAttribute('data-sticky')).toBeNull()
  })

  it('sticky-rows 非法值回退为不吸顶', () => {
    const el = mount({ 'sticky-rows': 'abc', columns: STICKY_COLUMNS, data: STICKY_DATA })
    expect(rows(el)[0]!.getAttribute('data-sticky')).toBeNull()
  })
})

describe('OASTable size 密度档位', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 参与观察：small/medium/large 三档，默认 medium（无 size 属性）', () => {
    expect(OASTable.observedAttributes).toContain('size')
    const el = mount()
    expect(el.getAttribute('size')).toBeNull() // 默认不写 attribute，CSS 落 medium 档
    el.setAttribute('size', 'small')
    expect(el.getAttribute('size')).toBe('small') // attribute 保留，:host([size]) 选择器命中
    el.setAttribute('size', 'large')
    expect(el.getAttribute('size')).toBe('large')
  })

  it('size 非法值回落 medium（无档位匹配）且 console.warn 一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    // 非法值不匹配任何 :host([size=...]) 档位选择器 → 视觉自然回落 medium 默认
    expect(el.getAttribute('size')).toBe('huge')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('oas-table')
    el.setAttribute('size', 'huge') // 同值不重复告警
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('size 合法值不告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const s of ['small', 'medium', 'large']) {
      const el = mount({ size: s })
      el.remove()
    }
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('OASTable 列设置（column-keys / hidden）', () => {
  it('column-keys 过滤列：不在列表的列不渲染', () => {
    const el = mount({ 'column-keys': '["name"]' })
    const hs = headers(el).map((h) => h.getAttribute('data-key'))
    expect(hs).toEqual(['name'])
  })

  it('column-keys 控制顺序：按列表顺序渲染', () => {
    const el = mount({ 'column-keys': '["age","name"]' })
    const hs = headers(el).map((h) => h.getAttribute('data-key'))
    expect(hs).toEqual(['age', 'name'])
  })

  it('TableColumn.hidden=true 的列不渲染', () => {
    const cols = JSON.stringify([
      { key: 'name', title: '姓名' },
      { key: 'age', title: '年龄', hidden: true },
    ])
    const el = mount({ columns: cols })
    const hs = headers(el).map((h) => h.getAttribute('data-key'))
    expect(hs).toEqual(['name'])
  })

  it('无 column-keys/hidden 时渲染全部列（向后兼容）', () => {
    const el = mount()
    expect(headers(el).length).toBe(2)
  })

  it('setColumnOrder：写回 column-keys 且派发 oas-column-order', () => {
    const el = mount()
    const order = { keys: [] as string[] }
    el.addEventListener('oas-column-order', (e) => (order.keys = (e as CustomEvent).detail.keys))
    el.setColumnOrder(['age', 'name'])
    expect(el.getAttribute('column-keys')).toBe('["age","name"]')
    expect(order.keys).toEqual(['age', 'name'])
    expect(headers(el).map((h) => h.getAttribute('data-key'))).toEqual(['age', 'name'])
  })

  it('setColumnWidth：写回 columns 宽度且派发 oas-column-resize', () => {
    const el = mount()
    const resize = { key: '', width: 0 }
    el.addEventListener('oas-column-resize', (e) => {
      ;(resize.key = (e as CustomEvent).detail.key), (resize.width = (e as CustomEvent).detail.width)
    })
    el.setColumnWidth('name', 160)
    expect(resize.key).toBe('name')
    expect(resize.width).toBe(160)
    const cols = JSON.parse(el.getAttribute('columns')!) as Array<{ key: string; width?: string }>
    expect(cols.find((c) => c.key === 'name')?.width).toBe('160px')
  })

  it('列设置 controller 注入：表头 th 带 draggable（能力已挂在组装类）', () => {
    const el = mount()
    const headTh = el.shadowRoot!.querySelectorAll('th[data-key]')[0]!
    expect(headTh.getAttribute('draggable')).toBe('true')
  })
})

describe('OASTable 单元格渲染与 hidden（实测缺陷回归）', () => {
  it('#9 尊重 [hidden]：table.hidden=true 时 display:none（:host 覆盖修复）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('style')!.textContent).toMatch(
      /:host\(\[hidden\]\)\s*\{\s*display:\s*none/,
    )
    el.hidden = true
    expect(getComputedStyle(el).display).toBe('none')
  })

  it('#8 单元格 render 返回元素（tag/avatar/badge 富内容）直接挂载（非纯文本）', () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'status', title: '状态' },
      ]),
    )
    el.setAttribute('data', JSON.stringify([{ name: '张三', status: '启用' }]))
    // property 通道传含 render 函数（返回 span 元素）
    el.columns = [
      { key: 'name', title: '姓名' },
      {
        key: 'status',
        title: '状态',
        render: (row: Record<string, unknown>) => {
          const span = document.createElement('span')
          span.textContent = `[${String(row.status)}]`
          return span
        },
      },
    ]
    document.body.appendChild(el)
    const r = rows(el)[0]!
    const cells = r.querySelectorAll('td')
    // status 列（第 2 列）应含 span 元素而非纯文本
    const statusCell = cells[1]!
    expect(statusCell.querySelector('span')).toBeTruthy()
    expect(statusCell.querySelector('span')!.textContent).toBe('[启用]')
    // 单元格挂载的是 span 元素（非单个纯文本节点）：firstChild 为元素
    expect(statusCell.firstChild!.nodeType).toBe(Node.ELEMENT_NODE)
  })
})

describe('OASTable 多列排序（multi-sort）', () => {
  const MULTI_COLS = JSON.stringify([
    { key: 'age', title: '年龄', sortable: true },
    { key: 'name', title: '姓名', sortable: true },
  ])
  const MULTI_DATA = JSON.stringify([
    { age: 30, name: '张三' },
    { age: 25, name: '阿花' },
    { age: 30, name: '李四' },
    { age: 25, name: '赵六' },
  ])

  const click = (el: OASTable, th: HTMLElement, opts: { shift?: boolean } = {}) => {
    th.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, shiftKey: !!opts.shift }))
  }
  const head = (el: OASTable, key: string): HTMLElement =>
    el.shadowRoot!.querySelector(`th[data-key="${key}"]`)! as HTMLElement

  it('shift 点击两列累积排序：multi-sort 写回且行排序正确', () => {
    const el = mount({ columns: MULTI_COLS, data: MULTI_DATA })
    click(el, head(el, 'age'), { shift: true })
    click(el, head(el, 'name'), { shift: true })
    expect(el.getAttribute('multi-sort')).toBe('[{"key":"age","order":"asc"},{"key":"name","order":"asc"}]')
    // age asc 分组（25 组前、30 组后），组内 name asc 按码点排序：赵(0x8D75)<阿(0x963F)、张(0x5F20)<李(0x674E)
    const cells = rows(el).map((r) => (r.querySelectorAll('td')[1]?.textContent ?? '').trim())
    expect(cells).toEqual(['赵六', '阿花', '张三', '李四'])
  })

  it('多列表头渲染排序序号（data-sort-index）', () => {
    const el = mount({ columns: MULTI_COLS, data: MULTI_DATA })
    click(el, head(el, 'age'), { shift: true })
    click(el, head(el, 'name'), { shift: true })
    expect(head(el, 'age').getAttribute('data-sort-index')).toBe('1')
    expect(head(el, 'name').getAttribute('data-sort-index')).toBe('2')
    expect(head(el, 'age').textContent).toContain('1')
    expect(head(el, 'age').querySelector('.sort-index')?.textContent).toBe('1')
  })

  it('普通点击重置为仅当前列（清除 multi-sort 回退 sort-key）', () => {
    const el = mount({ columns: MULTI_COLS, data: MULTI_DATA })
    click(el, head(el, 'age'), { shift: true })
    click(el, head(el, 'name'), { shift: true })
    click(el, head(el, 'name'))
    expect(el.getAttribute('multi-sort')).toBeNull()
    expect(el.getAttribute('sort-key')).toBe('name')
    expect(el.getAttribute('sort-order')).toBe('desc')
  })

  it('shift 点击已排序列切换 asc→desc→移除', () => {
    const el = mount({ columns: MULTI_COLS, data: MULTI_DATA })
    click(el, head(el, 'age'), { shift: true })
    click(el, head(el, 'name'), { shift: true })
    click(el, head(el, 'age'), { shift: true })
    expect(el.getAttribute('multi-sort')).toBe('[{"key":"age","order":"desc"},{"key":"name","order":"asc"}]')
    click(el, head(el, 'age'), { shift: true })
    // 移除 age 后只剩 name 单列 → 回退为 sort-key 单列模式（向后兼容）
    expect(el.getAttribute('multi-sort')).toBeNull()
    expect(el.getAttribute('sort-key')).toBe('name')
    expect(el.getAttribute('sort-order')).toBe('asc')
  })
})

describe('OASTable 序号列与省略号', () => {
  it('#10 序号列：serialNumber 列显示行序号（从 1 递增）', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'index', title: '序号', serialNumber: true },
        { key: 'name', title: '姓名' },
      ]),
      data: DATA,
    })
    const cells = rows(el).map((r) => (r.querySelectorAll('td')[0]?.textContent ?? '').trim())
    expect(cells).toEqual(['1', '2', '3'])
  })

  it('#10 序号列不取数据字段值（row.key 无 index 字段也不报错）', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'index', title: '序号', serialNumber: true },
        { key: 'name', title: '姓名' },
      ]),
    })
    // 数据行值取 row[index] 为 undefined，serialNumber 不计入数据，仍显示序号
    expect(rows(el)[0]!.querySelectorAll('td')[0]!.textContent).toBe('1')
  })

  it('#11 省略号：ellipsis 列加 class 且设 title 提示全文', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '姓名', ellipsis: true },
        { key: 'age', title: '年龄' },
      ]),
      data: DATA,
    })
    const td = rows(el)[0]!.querySelector('td[data-col="name"]')!
    expect(td.classList.contains('cell-ellipsis')).toBe(true)
    expect(td.getAttribute('title')).toBe('张三')
  })
})

describe('OASTable 多级表头（children）', () => {
  const GROUP_COLS = JSON.stringify([
    {
      key: 'base',
      title: '基础信息',
      children: [
        { key: 'name', title: '姓名', sortable: true },
        { key: 'age', title: '年龄' },
      ],
    },
    { key: 'city', title: '城市' },
  ])

  it('#12 组列渲染：组表头 colspan=子叶子数，叶子列落位底行且 rowspan 盖到底部', () => {
    const el = mount({ columns: GROUP_COLS, data: DATA })
    const roots = el.shadowRoot!.querySelectorAll('thead > tr')!
    // 树深 2 → 表头两行
    expect(roots.length).toBe(2)
    // 组表头：基础信息 colspan=2 rowspan=1
    const group = el.shadowRoot!.querySelector('th.header-group')!
    expect(group.textContent).toBe('基础信息')
    expect(group.getAttribute('colspan')).toBe('2')
    expect(group.getAttribute('rowspan')).toBe('1')
    // 顶层的城市是叶子，rowspan=树深(2)，从第 0 行盖到底
    const city = el.shadowRoot!.querySelector('th[data-key="city"]')!
    expect(city.getAttribute('rowspan')).toBe('2')
    // 底行叶子：name/age rowspan=1
    expect(el.shadowRoot!.querySelector('th[data-key="name"]')!.getAttribute('rowspan')).toBe('1')
    expect(el.shadowRoot!.querySelector('th[data-key="age"]')!.getAttribute('rowspan')).toBe('1')
    // 表头叶子总数 = 可见叶子数 3（name/age/city）
    expect(el.shadowRoot!.querySelectorAll('th[data-key]').length).toBe(3)
  })

  it('#12 扁平渲染：数据行按叶子列渲染与底行表头对齐（每行 td=叶子数）', () => {
    const el = mount({ columns: GROUP_COLS, data: DATA })
    const tds = rows(el)[0]!.querySelectorAll('td').length
    expect(tds).toBe(3)
    // 顺序 = 深度优先叶子展开：姓名/年龄/城市
    const cols = [...rows(el)[0]!.querySelectorAll('td')].map((td) => td.getAttribute('data-col'))
    expect(cols).toEqual(['name', 'age', 'city'])
  })

  it('#12 排序作用于叶子列：点击叶子表头排序并派发事件', () => {
    const el = mount({ columns: GROUP_COLS, data: DATA })
    let detail: unknown
    el.addEventListener('oas-sort-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const nameTh = el.shadowRoot!.querySelector('th[data-key="name"]')!
    nameTh.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(detail).toEqual({ key: 'name', order: 'asc' })
    // 张(0x5F20) < 李(0x674E) < 王(0x738B)，已升序，行首为张三
    expect(rows(el)[0]!.textContent).toContain('张三')
  })

  it('#12 多级表头与 checkable：全选表头占首行并 rowspan 盖到底部', () => {
    const el = mount({ columns: GROUP_COLS, data: DATA, checkable: '' })
    const check = el.shadowRoot!.querySelector('thead th.check-cell')!
    expect(check.getAttribute('rowspan')).toBe('2')
    // 数据行首列为选择列
    expect(rows(el)[0]!.querySelector('td.check-cell')).not.toBeNull()
  })
})

describe('OASTable 分页（pagination）', () => {
  const PAG_COLS = JSON.stringify([
    { key: 'name', title: '姓名' },
    { key: 'age', title: '年龄' },
  ])
  const PAG_DATA = JSON.stringify(
    Array.from({ length: 12 }, (_, i) => ({ name: 'n' + i, age: i })),
  )

  it('#13 开启分页：只渲染当前页（page-size 行），并挂载 oas-pagination', () => {
    const el = mount({ columns: PAG_COLS, data: PAG_DATA, pagination: '', 'page-size': '5' })
    expect(rows(el).length).toBe(5)
    const pag = el.shadowRoot!.querySelector('.pagination oas-pagination')
    expect(pag).not.toBeNull()
    expect(pag!.getAttribute('total')).toBe('12')
    expect(pag!.getAttribute('page-size')).toBe('5')
    expect(pag!.getAttribute('current')).toBe('1')
    // 未开启分页时不挂载分页器
    const el2 = mount({ columns: PAG_COLS, data: PAG_DATA })
    expect(el2.shadowRoot!.querySelector('.pagination oas-pagination')).toBeNull()
  })

  it('#13 翻页：写回 current 并派发 page-change，重渲染下一页', () => {
    const el = mount({ columns: PAG_COLS, data: PAG_DATA, pagination: '', 'page-size': '5' })
    let detail: unknown
    el.addEventListener('oas-page-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const pag = el.shadowRoot!.querySelector('.pagination oas-pagination')!
    pag.dispatchEvent(new CustomEvent('oas-change', { detail: { page: 2 }, bubbles: true }))
    expect(el.getAttribute('current')).toBe('2')
    expect(rows(el).length).toBe(5)
    expect(rows(el)[0]!.textContent).toContain('n5')
    expect(detail).toEqual({ page: 2, pageSize: 5 })
  })

  it('#13 全局排序后分页：排序作用于全量数据再切片', () => {
    const el = mount({
      columns: PAG_COLS,
      data: PAG_DATA,
      pagination: '',
      'page-size': '5',
      'sort-key': 'age',
      'sort-order': 'asc',
    })
    // 全局 age 升序，第 1 页为 age 0-4（n0..n4）
    expect(rows(el)[0]!.textContent).toContain('n0')
    // 跳到第 3 页：只剩 age 10-11 两行
    el.setAttribute('current', '3')
    expect(rows(el).length).toBe(2)
    expect(rows(el)[0]!.textContent).toContain('n10')
    expect(rows(el)[1]!.textContent).toContain('n11')
  })
})

describe('OASTable 列过滤（filter）', () => {
  const FILTER_COLS = JSON.stringify([
    {
      key: 'name',
      title: '姓名',
      filterable: true,
      filters: [
        { label: '张三', value: '张三' },
        { label: '李四', value: '李四' },
      ],
    },
    { key: 'age', title: '年龄' },
  ])

  it('#14 数据层过滤：filter-values 按列值过滤行', () => {
    const el = mount({ columns: FILTER_COLS, data: DATA, 'filter-values': '{"name":"李四"}' })
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toContain('李四')
  })

  it('#14 filterMatch 自定义匹配器', () => {
    // filterMatch 是函数，走 columns property 通路（JSON attribute 丢函数）
    const el = new OASTable()
    el.columns = [
      { key: 'age', title: '年龄', filterable: true, filterMatch: (c: unknown, fv: string | number) => Number(c) >= Number(fv) },
      { key: 'name', title: '姓名' },
    ]
    el.setAttribute('data', DATA)
    el.setAttribute('filter-values', '{"age":30}')
    document.body.appendChild(el)
    // age >= 30：张三(30)/王五(35)
    const names = rows(el).map((r) => r.querySelector('td[data-col="name"]')?.textContent)
    expect(names).toEqual(['张三', '王五'])
    expect(rows(el).length).toBe(2)
  })

  it('#14 过滤 + 分页：总数与页数反映过滤后数据', () => {
    const el = mount({
      columns: FILTER_COLS,
      data: DATA,
      pagination: '',
      'page-size': '1',
      'filter-values': '{"name":"张三"}',
    })
    // 过滤后只剩 1 行
    expect(rows(el).length).toBe(1)
    const pag = el.shadowRoot!.querySelector('.pagination oas-pagination')
    expect(pag!.getAttribute('total')).toBe('1')
  })

  it('#14 filterable 表头渲染过滤触发器，点击弹出选项并能应用', () => {
    const el = mount({ columns: FILTER_COLS, data: DATA })
    const btn = el.shadowRoot!.querySelector('th[data-key="name"] .filter-btn')!
    expect(btn).not.toBeNull()
    ;(btn as HTMLElement).click()
    const panel = el.shadowRoot!.querySelector('.filter-panel')!
    expect(panel).not.toBeNull()
    // 选项含张三/李四（列级 filters）
    expect([...panel.querySelectorAll('.filter-option')].map((o) => o.textContent)).toEqual(['张三', '李四'])
    let detail: unknown
    el.addEventListener('oas-filter-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(panel.querySelectorAll('.filter-option')[1] as HTMLElement).click()
    expect(el.getAttribute('filter-values')).toBe('{"name":"李四"}')
    expect(detail).toEqual({ filters: { name: '李四' } })
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toContain('李四')
    // 应用后弹层关闭
    expect(el.shadowRoot!.querySelector('.filter-panel')).toBeNull()
  })
})

describe('OASTable 合并单元格（merge）', () => {
  const MERGE_COLS = JSON.stringify([
    { key: 'dept', title: '部门', merge: true },
    { key: 'name', title: '姓名' },
  ])
  const MERGE_DATA = JSON.stringify([
    { dept: '研发', name: '张三' },
    { dept: '研发', name: '李四' },
    { dept: '市场', name: '王五' },
  ])

  it('#15 merge 列连续相同值合并 rowspan，后续行去掉该列 td', () => {
    const el = mount({ columns: MERGE_COLS, data: MERGE_DATA })
    const trs = rows(el)
    const dept0 = trs[0]!.querySelector('td[data-col="dept"]')!
    expect(dept0.getAttribute('rowspan')).toBe('2')
    expect(trs[1]!.querySelector('td[data-col="dept"]')).toBeNull()
    // 第三行（市场）非连续，td 保留
    expect(trs[2]!.querySelector('td[data-col="dept"]')).not.toBeNull()
    expect(trs[1]!.querySelector('td[data-col="name"]')!.textContent).toBe('李四')
  })

  it('#15 合并与 checkable：merge 列 td 索引区分选择列', () => {
    const el = mount({ columns: MERGE_COLS, data: MERGE_DATA, checkable: '' })
    const trs = rows(el)
    expect(trs[0]!.querySelector('td[data-col="dept"]')!.getAttribute('rowspan')).toBe('2')
    expect(trs[1]!.querySelector('td[data-col="dept"]')).toBeNull()
    // 选择列仍在每行显示
    expect(trs[1]!.querySelector('td.check-cell')).not.toBeNull()
  })

  it('#15 不同值不合并', () => {
    const el = mount({
      columns: MERGE_COLS,
      data: JSON.stringify([
        { dept: '研发', name: '张三' },
        { dept: '市场', name: '王五' },
      ]),
    })
    const trs = rows(el)
    // 不同值不合并：两行各保留 dept td
    expect(trs[0]!.querySelector('td[data-col="dept"]')).not.toBeNull()
    expect(trs[1]!.querySelector('td[data-col="dept"]')).not.toBeNull()
  })
})

describe('OASTable 子元素声明式通道（oas-table-column）', () => {
  const mountChild = (inner: string, attrs: Record<string, string> = {}): OASTable => {
    const el = new OASTable()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = inner
    document.body.appendChild(el)
    return el
  }

  it('#16 子元素渲染列：oas-table-column 声明列 + 布尔字段映射（sortable）', () => {
    const el = mountChild(
      '<oas-table-column key="name" title="姓名" sortable></oas-table-column>' +
        '<oas-table-column key="age" title="年龄"></oas-table-column>',
    )
    el.setAttribute('data', DATA)
    expect(headers(el).length).toBe(2)
    const nameTh = el.shadowRoot!.querySelector('th[data-key="name"]')!
    expect(nameTh.textContent).toContain('姓名')
    expect(nameTh.classList.contains('sortable')).toBe(true)
    expect(rows(el).length).toBe(3)
  })

  it('#16 title 缺省时取默认插槽文本（trim）', () => {
    const el = mountChild('<oas-table-column key="name">  姓名  </oas-table-column>')
    expect(el.shadowRoot!.querySelector('th[data-key="name"]')!.textContent).toBe('姓名')
  })

  it('#16 嵌套子列表达多级表头（children → 组头 colspan）', () => {
    const el = mountChild(
      '<oas-table-column key="base" title="基础信息">' +
        '<oas-table-column key="name" title="姓名"></oas-table-column>' +
        '<oas-table-column key="age" title="年龄" sortable></oas-table-column>' +
        '</oas-table-column>' +
        '<oas-table-column key="city" title="城市"></oas-table-column>',
    )
    const group = el.shadowRoot!.querySelector('th.header-group')!
    expect(group.textContent).toBe('基础信息')
    expect(group.getAttribute('colspan')).toBe('2')
    expect(el.shadowRoot!.querySelectorAll('th[data-key]').length).toBe(3)
  })

  it('#16 columns attribute 优先于子元素声明式通道', () => {
    const el = mountChild(
      '<oas-table-column key="name" title="姓名" sortable></oas-table-column>',
      { columns: '[{"key":"name","title":"姓名"}]' },
    )
    // 显式 columns attr 生效：name 列无 sortable
    const nameTh = el.shadowRoot!.querySelector('th[data-key="name"]')!
    expect(nameTh.classList.contains('sortable')).toBe(false)
    expect(headers(el).length).toBe(1)
  })

  it('#16 动态增删子元素（MutationObserver）自动更新列', () => {
    const el = mountChild('<oas-table-column key="name" title="姓名"></oas-table-column>')
    expect(headers(el).length).toBe(1)
    const newCol = document.createElement('oas-table-column')
    newCol.setAttribute('key', 'age')
    newCol.setAttribute('title', '年龄')
    el.appendChild(newCol)
    return new Promise<void>((res) =>
      setTimeout(() => {
        expect(headers(el).length).toBe(2)
        res()
      }, 0),
    )
  })

  it('#17 cellTemplate 模板单元格：<template> + {{row.字段}} 插值水合', () => {
    const el = new OASTable()
    el.setAttribute('data', DATA)
    el.innerHTML =
      '<oas-table-column key="name" title="姓名"><template><button class="cell-btn">{{row.name}}</button></template></oas-table-column>' +
      '<oas-table-column key="age" title="年龄"></oas-table-column>'
    document.body.appendChild(el)
    // 首行 name 单元格应为被水合的 <button>（含 row.name 值）
    const btn = rows(el)[0]!.querySelector('td[data-col="name"] button.cell-btn')!
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('张三')
  })

  it('#17 cellTemplate 属性插值 + 缺省空串', () => {
    const el = new OASTable()
    el.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    const tpl = document.createElement('template')
    tpl.innerHTML = '<a href="/u/{{row.name}}">{{row.name}} <b>{{row.missing}}</b></a>'
    el.columns = [{ key: 'name', title: '姓名', cellTemplate: tpl }]
    document.body.appendChild(el)
    const a = rows(el)[0]!.querySelector('td[data-col="name"] a')!
    expect(a.getAttribute('href')).toBe('/u/张三')
    expect(a.querySelector('b')!.textContent).toBe('')
  })

  it('#18 headerTemplate 自定义列头：<template data-role="header"> 渲染 th 内容', () => {
    const el = new OASTable()
    el.setAttribute('data', DATA)
    el.innerHTML =
      '<oas-table-column key="name" title="姓名" sortable><template data-role="header"><span class="hd"><i>★</i> 姓名</span></template></oas-table-column>'
    document.body.appendChild(el)
    const th = el.shadowRoot!.querySelector('th[data-key="name"]')!
    expect(th.querySelector('span.hd')).not.toBeNull()
    expect(th.querySelector('span.hd')!.textContent).toBe('★ 姓名')
    // 自定义列头下排序图标仍需追加（自动排序可用）
    expect(th.querySelector('.sort-icon')).not.toBeNull()
    // 单元格不应用 header 模板（仍为普通文本）
    expect(rows(el)[0]!.querySelector('td[data-col="name"]')!.textContent).toBe('张三')
  })

  it('#18 columns property 传 headerTemplate 生效', () => {
    const el = new OASTable()
    el.setAttribute('data', DATA)
    const tpl = document.createElement('template')
    tpl.innerHTML = '<b>HT</b>'
    el.columns = [{ key: 'name', title: 'x', headerTemplate: tpl }]
    document.body.appendChild(el)
    const th = el.shadowRoot!.querySelector('th[data-key="name"]')!
    expect(th.querySelector('b')).not.toBeNull()
  })
})

describe('列拖拽重排顺序计算（applyColumnReorder）', () => {  const BASE = ['id', 'name', 'age', 'city']

  it('插前：fromKey 移到 toKey 之前', () => {
    expect(applyColumnReorder(BASE, 'age', 'name', 'before')).toEqual(['id', 'age', 'name', 'city'])
  })

  it('插后：fromKey 移到 toKey 之后', () => {
    expect(applyColumnReorder(BASE, 'age', 'city', 'after')).toEqual(['id', 'name', 'city', 'age'])
  })

  it('toKey 不存在：插前兜底到最前 / 插后兜底到最后', () => {
    expect(applyColumnReorder(BASE, 'age', 'zzz', 'before')).toEqual(['age', 'id', 'name', 'city'])
    expect(applyColumnReorder(BASE, 'age', 'zzz', 'after')).toEqual(['id', 'name', 'city', 'age'])
  })

  it('fromKey 已在目标位置：顺序不变', () => {
    expect(applyColumnReorder(BASE, 'age', 'name', 'before')).toEqual(['id', 'age', 'name', 'city'])
  })
})
