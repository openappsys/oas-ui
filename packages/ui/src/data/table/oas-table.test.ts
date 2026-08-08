import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
    expect(firstRow).toContain('李四')
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
