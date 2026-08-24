import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

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

describe('OASTable 单元格渲染与 hidden（模板实测缺陷回归）', () => {
  it('#9 尊重 [hidden]：table.hidden=true 时 display:none（:host 覆盖修复）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('style')!.textContent).toMatch(/:host\(\[hidden\]\)\s*\{\s*display:\s*none/)
    el.hidden = true
    expect(getComputedStyle(el).display).toBe('none')
  })

  it('#8 单元格 render 返回元素（tag/avatar/badge 富内容）直接挂载（非纯文本）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '姓名' }, { key: 'status', title: '状态' }]))
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
