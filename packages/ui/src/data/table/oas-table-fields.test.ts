import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
// 行内编辑用例经主路径 index 已默认含编辑能力（显式 import 幂等冗余，与既有测试文件同惯例）
import './edit/index.js'
// checkbox 类型列的组件编辑器走 oas-switch（editComponent 通道），副作用注册
import '../../form/switch/index.js'

/** 按属性挂载表格（columns/data 缺省给一组通用双列） */
function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '姓名' }]))
  if (!attrs.data) el.setAttribute('data', JSON.stringify([{ name: '张三' }]))
  document.body.appendChild(el)
  return el
}

/** tbody 内全部数据单元格（含 data-col 的 td） */
function cells(el: OASTable): HTMLTableCellElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLTableCellElement>('tbody td[data-col]')]
}

/** 按列 key 取第一行的单元格 */
function cellOf(el: OASTable, key: string, row = 0): HTMLTableCellElement {
  const tds = cells(el).filter((td) => td.getAttribute('data-col') === key)
  return tds[row]!
}

/** 全部数据行 tr（part="row"） */
function rows(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

/** 全部分节头行 */
function groupRows(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('tr.group-header')] as HTMLElement[]
}

/** 把单元格拉进编辑态（沿用既有测试的双击派发惯例） */
function enterEdit(el: OASTable, key: string, row = 0): HTMLTableCellElement {
  const td = cellOf(el, key, row)
  td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  return td
}

describe('OASTable 列字段类型系统（column type）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('type=number：千分位展示 + 右对齐', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'v', title: '数值', type: 'number' }]),
      data: JSON.stringify([{ v: 1234567 }]),
    })
    const td = cellOf(el, 'v')
    expect(td.textContent).toBe((1234567).toLocaleString())
    expect(td.classList.contains('align-right')).toBe(true)
  })

  it('type=currency：默认 ¥ 符号 + 千分位 + 右对齐', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'v', title: '金额', type: 'currency' }]),
      data: JSON.stringify([{ v: 9876 }]),
    })
    const td = cellOf(el, 'v')
    expect(td.textContent).toBe(`¥${(9876).toLocaleString()}`)
    expect(td.classList.contains('align-right')).toBe(true)
  })

  it('type=currency：currency 字段自定义符号', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'v', title: '金额', type: 'currency', currency: '$' }]),
      data: JSON.stringify([{ v: 1234 }]),
    })
    expect(cellOf(el, 'v').textContent).toBe(`$${(1234).toLocaleString()}`)
  })

  it('type=number/currency 值非数字 → 原样文本（不右对齐缺失仍右对齐由列配置决定）', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'a', title: 'A', type: 'number' },
        { key: 'b', title: 'B', type: 'currency' },
      ]),
      data: JSON.stringify([{ a: '待定', b: null }]),
    })
    expect(cellOf(el, 'a').textContent).toBe('待定')
    expect(cellOf(el, 'b').textContent).toBe('')
  })

  it('type=select：按 options 渲染 badge（label 文案）', () => {
    const el = mount({
      columns: JSON.stringify([
        {
          key: 's',
          title: '状态',
          type: 'select',
          options: [
            { value: 1, label: '启用' },
            { value: 0, label: '停用' },
          ],
        },
      ]),
      data: JSON.stringify([{ s: 1 }, { s: 0 }]),
    })
    const badges = cells(el).map((td) => td.querySelector('.type-badge')?.textContent)
    expect(badges).toEqual(['启用', '停用'])
  })

  it('type=select：option.color 注入 badge 的 CSS 变量（缺省不注入走 token）', () => {
    const el = mount({
      columns: JSON.stringify([
        {
          key: 's',
          title: '状态',
          type: 'select',
          options: [
            { value: 'ok', label: '正常', color: 'var(--oas-color-success)' },
            { value: 'no', label: '异常' },
          ],
        },
      ]),
      data: JSON.stringify([{ s: 'ok' }, { s: 'no' }]),
    })
    const colored = cellOf(el, 's', 0).querySelector<HTMLElement>('.type-badge')!
    expect(colored.style.getPropertyValue('--_badge-fg')).toContain('var(--oas-color-success)')
    // 混色须引用真实存在的 token（--oas-color-text-primary；裸 --oas-color-text 不存在，
    // var 未命中会静默走 fallback 使混色失效——交叉审实抓）
    expect(colored.style.getPropertyValue('--_badge-fg')).toContain('--oas-color-text-primary')
    const plain = cellOf(el, 's', 1).querySelector<HTMLElement>('.type-badge')!
    expect(plain.style.getPropertyValue('--_badge-fg')).toBe('')
  })

  it('type=select：找不到对应 option → 显示原值文本', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 's', title: '状态', type: 'select', options: [{ value: 1, label: '启用' }] }]),
      data: JSON.stringify([{ s: 'mystery' }]),
    })
    const td = cellOf(el, 's')
    expect(td.querySelector('.type-badge')).toBeNull()
    expect(td.textContent).toBe('mystery')
  })

  it('type=multi-select：数组值逐枚 badge', () => {
    const el = mount({
      columns: JSON.stringify([
        {
          key: 'tags',
          title: '标签',
          type: 'multi-select',
          options: [
            { value: 'a', label: '甲' },
            { value: 'b', label: '乙' },
          ],
        },
      ]),
      data: JSON.stringify([{ tags: ['a', 'b'] }]),
    })
    const badges = [...cellOf(el, 'tags').querySelectorAll('.type-badge')]
    expect(badges.map((b) => b.textContent)).toEqual(['甲', '乙'])
  })

  it('type=date：时间戳格式化为 YYYY-MM-DD', () => {
    const ts = new Date('2026-03-05T08:30:00').getTime()
    const el = mount({
      columns: JSON.stringify([{ key: 'd', title: '日期', type: 'date' }]),
      data: JSON.stringify([{ d: ts }]),
    })
    expect(cellOf(el, 'd').textContent).toBe('2026-03-05')
  })

  it('type=date：ISO 串格式化为 YYYY-MM-DD；非法值原样', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'd', title: '日期', type: 'date' }]),
      data: JSON.stringify([{ d: '2026-03-05T08:30:00' }, { d: '不是日期' }]),
    })
    expect(cellOf(el, 'd', 0).textContent).toBe('2026-03-05')
    expect(cellOf(el, 'd', 1).textContent).toBe('不是日期')
  })

  it('type=checkbox：只读勾选态 ✓/—（不渲染可操作复选框）', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'on', title: '开关', type: 'checkbox' }]),
      data: JSON.stringify([{ on: true }, { on: false }]),
    })
    expect(cellOf(el, 'on', 0).textContent).toBe('✓')
    expect(cellOf(el, 'on', 1).textContent).toBe('—')
    expect(cellOf(el, 'on', 0).querySelector('input')).toBeNull()
  })

  it('type=link：主色链接，新标签页打开 + rel=noopener', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'url', title: '链接', type: 'link' }]),
      data: JSON.stringify([{ url: 'https://example.com' }]),
    })
    const a = cellOf(el, 'url').querySelector<HTMLAnchorElement>('a.type-link')!
    expect(a.getAttribute('href')).toBe('https://example.com')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    expect(a.textContent).toBe('https://example.com')
  })

  it('type=link：协议白名单——javascript:/data: 等回落纯文本（防数据驱动 XSS，回归）', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'url', title: '链接', type: 'link' }]),
      data: JSON.stringify([
        { url: 'javascript:alert(1)' },
        { url: 'data:text/html,<script>alert(1)</script>' },
        { url: 'vbscript:msgbox(1)' },
        { url: 'mailto:a@b.com' },
        { url: '/relative/path' },
        { url: '#anchor' },
      ]),
    })
    for (const r of [0, 1, 2]) {
      const td = cellOf(el, 'url', r)
      expect(td.querySelector('a.type-link'), `行 ${r} 危险协议不得渲染为链接`).toBeNull()
      expect(td.textContent, '回落纯文本展示原值').not.toBe('')
    }
    expect(cellOf(el, 'url', 3).querySelector('a.type-link'), 'mailto: 放行').not.toBeNull()
    expect(cellOf(el, 'url', 4).querySelector('a.type-link'), '相对路径放行').not.toBeNull()
    expect(cellOf(el, 'url', 5).querySelector('a.type-link'), '锚点放行').not.toBeNull()
  })

  it('type=progress：track + fill 宽度百分比，出界夹取 0-100', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'p', title: '进度', type: 'progress' }]),
      data: JSON.stringify([{ p: 40 }, { p: 150 }, { p: -5 }]),
    })
    expect(cellOf(el, 'p', 0).querySelector<HTMLElement>('.type-progress-fill')!.style.width).toBe('40%')
    expect(cellOf(el, 'p', 1).querySelector<HTMLElement>('.type-progress-fill')!.style.width).toBe('100%')
    expect(cellOf(el, 'p', 2).querySelector<HTMLElement>('.type-progress-fill')!.style.width).toBe('0%')
  })

  it('type=progress：值非数字 → 原样文本', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'p', title: '进度', type: 'progress' }]),
      data: JSON.stringify([{ p: '待定' }]),
    })
    const td = cellOf(el, 'p')
    expect(td.querySelector('.type-progress')).toBeNull()
    expect(td.textContent).toBe('待定')
  })

  it('type=rate：★ 实心 ☆ 空心，小数向下取整，出界夹取 0-5', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'r', title: '评分', type: 'rate' }]),
      data: JSON.stringify([{ r: 3 }, { r: 4.7 }, { r: 9 }, { r: -1 }]),
    })
    const on = (row: number): string =>
      cellOf(el, 'r', row).querySelector<HTMLElement>('.type-rate-on')!.textContent ?? ''
    const off = (row: number): string =>
      cellOf(el, 'r', row).querySelector<HTMLElement>('.type-rate-off')!.textContent ?? ''
    expect(on(0)).toBe('★★★')
    expect(off(0)).toBe('☆☆')
    expect(on(1)).toBe('★★★★')
    expect(off(1)).toBe('☆')
    expect(on(2)).toBe('★★★★★')
    expect(off(2)).toBe('')
    expect(on(3)).toBe('')
    expect(off(3)).toBe('☆☆☆☆☆')
  })

  it('列级 render 自定义渲染优先于 type（type 只作用于默认渲染）', () => {
    const el = new OASTable()
    el.setAttribute('data', JSON.stringify([{ v: 123 }]))
    el.columns = [{ key: 'v', title: 'V', type: 'currency', render: () => '自定义' }]
    document.body.appendChild(el)
    expect(cellOf(el, 'v').textContent).toBe('自定义')
  })

  it('type=number 列 sortable：按原始数值排序（字符串数字同样数值序）', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'v', title: '数值', type: 'number', sortable: true }]),
      data: JSON.stringify([{ v: '9' }, { v: '10' }, { v: '2' }]),
    })
    el.shadowRoot!.querySelector<HTMLElement>('th[data-key="v"]')!.click()
    expect(rows(el).map((r) => r.textContent)).toEqual(['2', '9', '10'])
  })

  it('type=number 列 sortable desc：数值降序', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'v', title: '数值', type: 'number', sortable: true }]),
      data: JSON.stringify([{ v: 9 }, { v: 10 }]),
    })
    // 每击重查 th：点击触发表体重建，旧 th 引用游离后事件不再冒泡到委托容器
    el.shadowRoot!.querySelector<HTMLElement>('th[data-key="v"]')!.click()
    el.shadowRoot!.querySelector<HTMLElement>('th[data-key="v"]')!.click()
    expect(rows(el).map((r) => r.textContent)).toEqual(['10', '9'])
  })
})

describe('OASTable 字段类型编辑（type × editable）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const editableMount = (columns: unknown[], data: unknown[]): OASTable =>
    mount({
      editable: '',
      'row-key': 'id',
      columns: JSON.stringify(columns),
      data: JSON.stringify(data),
    })

  it('type=number 编辑提交：回写保持 number 类型', () => {
    const el = editableMount([{ key: 'v', title: '数值', type: 'number', editable: true }], [{ id: 1, v: 5 }])
    const td = enterEdit(el, 'v')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '42'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, v: 42 }])
  })

  it('type=currency 编辑提交：回写 number（不带符号）', () => {
    const el = editableMount([{ key: 'v', title: '金额', type: 'currency', editable: true }], [{ id: 1, v: 9 }])
    const td = enterEdit(el, 'v')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '1234'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, v: 1234 }])
  })

  it('type=progress 编辑提交：数字夹取 0-100 并回写 number', () => {
    const el = editableMount(
      [
        { key: 'a', title: 'A', type: 'progress', editable: true },
        { key: 'b', title: 'B', type: 'progress', editable: true },
      ],
      [
        { id: 1, a: 10, b: 90 },
        { id: 2, a: 10, b: 90 },
      ],
    )
    const tdA = enterEdit(el, 'a')
    const inA = tdA.querySelector<HTMLInputElement>('input.cell-editor')!
    inA.value = '150'
    inA.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)[0]).toEqual({ id: 1, a: 100, b: 90 })
    const tdB = enterEdit(el, 'b', 1)
    const inB = tdB.querySelector<HTMLInputElement>('input.cell-editor')!
    inB.value = '-8'
    inB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)[1]).toEqual({ id: 2, a: 10, b: 0 })
  })

  it('type=rate 编辑提交：数字夹取 0-5 并回写 number', () => {
    const el = editableMount([{ key: 'r', title: '评分', type: 'rate', editable: true }], [{ id: 1, r: 3 }])
    const td = enterEdit(el, 'r')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '9.5'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, r: 5 }])
  })

  it('type=multi-select 编辑：初值逗号展示，提交拆回数组回写', () => {
    const el = editableMount(
      [{ key: 'tags', title: '标签', type: 'multi-select', editable: true }],
      [{ id: 1, tags: ['a', 'b'] }],
    )
    const td = enterEdit(el, 'tags')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    expect(input.value).toBe('a,b')
    input.value = 'a, c , d'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, tags: ['a', 'c', 'd'] }])
  })

  it('type=checkbox 编辑：挂 oas-switch（editComponent 通道），切换提交回写布尔', () => {
    const el = editableMount([{ key: 'on', title: '开关', type: 'checkbox', editable: true }], [{ id: 1, on: true }])
    const td = enterEdit(el, 'on')
    const sw = td.querySelector<HTMLElement>('oas-switch')!
    expect(sw).not.toBeNull()
    // 切换开关（shadow 内按钮点击 → checked 翻转 → 派发 oas-change → 提交）
    ;(sw.shadowRoot!.querySelector('button') as HTMLElement)!.click()
    const data = JSON.parse(el.getAttribute('data')!)
    expect(data).toEqual([{ id: 1, on: false }])
    // 退出编辑后展示只读勾选态
    expect(cellOf(el, 'on').textContent).toBe('—')
  })

  it("type=checkbox 编辑：行值 'on'（表单序列化真值形态）初值勾选——交叉审同抓回归（初值漏判 'on' 会显示 off，失焦提交静默翻值）", () => {
    const el = editableMount([{ key: 'on', title: '开关', type: 'checkbox', editable: true }], [{ id: 1, on: 'on' }])
    const td = enterEdit(el, 'on')
    const sw = td.querySelector<HTMLElement>('oas-switch')!
    expect(sw.getAttribute('value'), "'on' 初值应判勾选").toBe('true')
    // 不改动直接失焦提交：数据保持不变（'true' 与 'on' 语义同真，不得误判为变化改写）
    sw.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, on: 'on' }])
  })

  it('type=date 编辑：旧值为 ISO/时间戳形态时不改动直接 Enter 正常退出（内置校验豁免未改动值）', () => {
    const el = editableMount(
      [{ key: 'd', title: '日期', type: 'date', editable: true }],
      [{ id: 1, d: '2026-06-01T09:30:00' }],
    )
    const td = enterEdit(el, 'd')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(td.querySelector('input.cell-editor'), '未改动提交不得被校验拦下').toBeNull()
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, d: '2026-06-01T09:30:00' }])
  })

  it('type=date 编辑：内置 YYYY-MM-DD 形态校验失败不提交（保持编辑态）', () => {
    const el = editableMount([{ key: 'd', title: '日期', type: 'date', editable: true }], [{ id: 1, d: '2026-03-05' }])
    const td = enterEdit(el, 'd')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '2026/03/05'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(td.querySelector('input.cell-editor')).not.toBeNull()
    expect(td.getAttribute('data-invalid')).toBe('true')
    // 修正为合法形态后正常提交
    input.value = '2026-04-01'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, d: '2026-04-01' }])
  })

  it('type=select 编辑：下拉选项自动同步 options（既有 select 编辑器通道）', () => {
    const el = editableMount(
      [
        {
          key: 's',
          title: '状态',
          type: 'select',
          editable: true,
          options: [
            { value: 'on', label: '启用' },
            { value: 'off', label: '停用' },
          ],
        },
      ],
      [{ id: 1, s: 'on' }],
    )
    const td = enterEdit(el, 's')
    const select = td.querySelector<HTMLSelectElement>('select.cell-editor')!
    const values = [...select.querySelectorAll('option')].map((o) => o.value)
    expect(values).toEqual(['on', 'off'])
    select.value = 'off'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(JSON.parse(el.getAttribute('data')!)).toEqual([{ id: 1, s: 'off' }])
  })
})

describe('OASTable 分组视图（group-by）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const GROUP_COLUMNS = JSON.stringify([
    { key: 'dept', title: '部门' },
    { key: 'name', title: '姓名' },
  ])
  const GROUP_DATA = JSON.stringify([
    { dept: '前端', name: '张三' },
    { dept: '后端', name: '李四' },
    { dept: '前端', name: '王五' },
    { dept: '后端', name: '赵六' },
    { dept: '前端', name: '陈七' },
  ])

  const groupMount = (extra: Record<string, string> = {}): OASTable =>
    mount({ columns: GROUP_COLUMNS, data: GROUP_DATA, 'group-by': 'dept', 'row-key': 'name', ...extra })

  it('分节头行：字段值 + 组内计数 + 折叠箭头（默认全展开）', () => {
    const el = groupMount()
    const heads = groupRows(el)
    expect(heads.length).toBe(2)
    expect(heads[0]!.textContent).toContain('前端')
    expect(heads[0]!.textContent).toContain('3')
    expect(heads[1]!.textContent).toContain('后端')
    expect(heads[1]!.textContent).toContain('2')
    const btn = heads[0]!.querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn!.getAttribute('aria-expanded')).toBe('true')
    // 默认全展开：5 条数据行全部在场
    expect(rows(el).length).toBe(5)
  })

  it('组间按字段值首次出现序，组内排序生效', () => {
    const el = groupMount({ 'sort-key': 'name', 'sort-order': 'asc' })
    const heads = groupRows(el)
    // 组间序 = 首次出现序：前端在前
    expect(heads[0]!.textContent).toContain('前端')
    // 组内行按 name 升序：张三 < 王五（码点序）
    const body = el.shadowRoot!.querySelector('tbody')!
    const order = [...body.querySelectorAll('tr')].map((tr) => tr.textContent)
    expect(order[0]).toContain('前端')
    expect(order[1]).toContain('张三')
    expect(order[2]).toContain('王五')
  })

  it('点击分节头折叠该组（组内行隐藏），再点展开；aria-expanded 同步', () => {
    const el = groupMount()
    const head = groupRows(el)[0]!
    ;(head.querySelector('button') as HTMLElement)!.click()
    // 前端组 3 行被折叠：剩 2 条数据行 + 2 个分节头
    expect(rows(el).length).toBe(2)
    expect(groupRows(el)[0]!.querySelector('button')!.getAttribute('aria-expanded')).toBe('false')
    ;(groupRows(el)[0]!.querySelector('button') as HTMLElement)!.click()
    expect(rows(el).length).toBe(5)
  })

  it('数据变化时保留已折叠组', () => {
    const el = groupMount()
    ;(groupRows(el)[0]!.querySelector('button') as HTMLElement)!.click()
    expect(rows(el).length).toBe(2)
    // 数据更新（新增一行前端组数据）后折叠状态不丢：前端 4 行仍折叠，可见数据行为后端组 2 行
    el.setAttribute('data', JSON.stringify([...JSON.parse(GROUP_DATA), { dept: '前端', name: '新同事' }]))
    expect(rows(el).length).toBe(2)
    expect(groupRows(el)[0]!.textContent).toContain('4')
  })

  it('分组字段值缺失/为空的行归入「（空）」组', () => {
    const el = mount({
      columns: GROUP_COLUMNS,
      data: JSON.stringify([{ dept: '', name: '无部门' }, { name: '缺字段' }]),
      'group-by': 'dept',
      'row-key': 'name',
    })
    const heads = groupRows(el)
    expect(heads.length).toBe(1)
    expect(heads[0]!.textContent).toContain('（空）')
    expect(heads[0]!.textContent).toContain('2')
  })

  it('分节头单元格 colSpan 全宽（含前置/尾列）', () => {
    const el = groupMount({ checkable: '' })
    const td = groupRows(el)[0]!.querySelector('td')!
    // 2 数据列 + 1 勾选列
    expect(td.colSpan).toBe(3)
  })

  it('group-by 与 merge 列同用：告警一次并降级为普通渲染（不分组）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        columns: JSON.stringify([
          { key: 'dept', title: '部门', merge: true },
          { key: 'name', title: '姓名' },
        ]),
        data: GROUP_DATA,
        'group-by': 'dept',
        'row-key': 'name',
      })
      expect(groupRows(el).length).toBe(0)
      expect(rows(el).length).toBe(5)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]![0]).toContain('[oas-table]')
    } finally {
      warn.mockRestore()
    }
  })

  it('group-by 与 span-method 同用：告警一次并降级为普通渲染', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = new OASTable()
      el.setAttribute('columns', GROUP_COLUMNS)
      el.setAttribute('data', GROUP_DATA)
      el.setAttribute('group-by', 'dept')
      el.setAttribute('row-key', 'name')
      el.spanMethod = () => [1, 1]
      document.body.appendChild(el)
      expect(groupRows(el).length).toBe(0)
      expect(rows(el).length).toBe(5)
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('group-by 与 row-draggable 同用：告警一次并降级为普通渲染——回归（分组后展示序≠原始数组序，行重排索引会错位）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        columns: GROUP_COLUMNS,
        data: GROUP_DATA,
        'group-by': 'dept',
        'row-key': 'name',
        'row-draggable': '',
      })
      expect(groupRows(el).length).toBe(0)
      expect(rows(el).length).toBe(5)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]![0]).toContain('row-draggable')
    } finally {
      warn.mockRestore()
    }
  })

  it('与 column-virtual 正交：分节头 colSpan 全宽 + 数据行走列窗口', () => {
    const el = groupMount({
      'column-virtual': '',
      columns: JSON.stringify([
        { key: 'dept', title: '部门', width: '120px' },
        { key: 'name', title: '姓名', width: '120px' },
        { key: 'c1', title: 'C1', width: '120px' },
        { key: 'c2', title: 'C2', width: '120px' },
      ]),
      data: JSON.stringify([
        { dept: '前端', name: '张三', c1: 1, c2: 2 },
        { dept: '前端', name: '王五', c1: 3, c2: 4 },
        { dept: '后端', name: '李四', c1: 5, c2: 6 },
      ]),
    })
    // 视口窄时窗口列少于全部列；分节头仍全宽
    expect(groupRows(el).length).toBe(2)
    const td = groupRows(el)[0]!.querySelector('td')!
    expect(td.colSpan).toBe(4)
  })

  it('虚拟滚动（height）下组头行参与窗口渲染', () => {
    const data = Array.from({ length: 40 }, (_, i) => ({
      dept: i % 2 === 0 ? '前端' : '后端',
      name: `成员${i}`,
    }))
    const el = groupMount({ height: '160', 'row-height': '40', data: JSON.stringify(data) })
    // 窗口 4 行：组头行与数据行一起参与虚拟窗口
    const groupInDom = groupRows(el)
    expect(groupInDom.length).toBeGreaterThanOrEqual(1)
    // 窗口行（含组头）+ 首尾 spacer；默认前后 buffer 4，160/40 视口窗口 4 行 → 至多 8 窗口行 + 2 spacer。
    // 上限断言对 overscan 调整鲁棒（关键语义：窗口行数远小于 42 全量行，组头行参与窗口）
    const total = el.shadowRoot!.querySelectorAll('tbody tr').length
    expect(total).toBeLessThanOrEqual(12)
    expect(total).toBeLessThan(data.length)
  })

  it('分组时导出数据行不含分节头（exportMatrix 行数 = 数据行数）', () => {
    const el = groupMount()
    const matrix = el.exportMatrix()
    expect(matrix.rows.length).toBe(5)
    expect(matrix.rows.every((r) => !r.join(',').includes('3'))).toBe(true)
  })
})

describe('OASTable 单元格溢出提示（cell-tooltip 单例浮层）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const tipMount = (extra: Record<string, string> = {}): { el: OASTable; td: HTMLTableCellElement } => {
    const el = mount({
      columns: JSON.stringify([{ key: 'txt', title: '文本', width: '60px' }]),
      data: JSON.stringify([{ txt: '这是一段非常长的文本内容会溢出窄列宽度' }]),
      ...extra,
    })
    const td = cellOf(el, 'txt')
    // happy-dom 无排版：以实例属性 mock 溢出判定输入
    Object.defineProperty(td, 'scrollWidth', { configurable: true, value: 300 })
    Object.defineProperty(td, 'clientWidth', { configurable: true, value: 60 })
    return { el, td }
  }

  const tooltip = (el: OASTable): HTMLElement | null => el.shadowRoot!.querySelector('.cell-tooltip')

  it('默认开启：溢出纯文本格 hover 显示全文浮层（单例复用）', () => {
    const { el, td } = tipMount()
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    const tip = tooltip(el)
    expect(tip).not.toBeNull()
    expect(tip!.getAttribute('data-visible')).toBe('true')
    expect(tip!.textContent).toBe('这是一段非常长的文本内容会溢出窄列宽度')
    // 浮层实例唯一（表格级单例，不为每格创建）
    expect(el.shadowRoot!.querySelectorAll('.cell-tooltip').length).toBe(1)
  })

  it('未溢出的纯文本格不显示浮层', () => {
    const { el, td } = tipMount()
    Object.defineProperty(td, 'scrollWidth', { configurable: true, value: 60 })
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    const tip = tooltip(el)
    expect(tip === null || tip.getAttribute('data-visible') !== 'true').toBe(true)
  })

  it('mouseout 隐藏浮层', () => {
    const { el, td } = tipMount()
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('true')
    td.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('false')
  })

  it('cell-tooltip="false" 显式关闭', () => {
    const { el, td } = tipMount({ 'cell-tooltip': 'false' })
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el)).toBeNull()
  })

  it('富内容格（有子元素）不触发浮层', () => {
    const el = new OASTable()
    el.setAttribute('data', JSON.stringify([{ v: 1 }]))
    el.columns = [
      {
        key: 'v',
        title: 'V',
        render: () => {
          const b = document.createElement('span')
          b.textContent = '富内容文本'
          return b
        },
      },
    ]
    document.body.appendChild(el)
    const td = cellOf(el, 'v')
    Object.defineProperty(td, 'scrollWidth', { configurable: true, value: 300 })
    Object.defineProperty(td, 'clientWidth', { configurable: true, value: 60 })
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el) === null || tooltip(el)!.getAttribute('data-visible') !== 'true').toBe(true)
  })

  it('ellipsis 列（已有原生 title 提示）豁免浮层，避免双重提示', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'txt', title: '文本', width: '60px', ellipsis: true }]),
      data: JSON.stringify([{ txt: '超长文本内容' }]),
    })
    const td = cellOf(el, 'txt')
    Object.defineProperty(td, 'scrollWidth', { configurable: true, value: 300 })
    Object.defineProperty(td, 'clientWidth', { configurable: true, value: 60 })
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el) === null || tooltip(el)!.getAttribute('data-visible') !== 'true').toBe(true)
  })

  it('滚动时隐藏浮层（无孤儿浮层）', () => {
    const { el, td } = tipMount({ height: '80' })
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('true')
    el.setAttribute('data', JSON.stringify([{ txt: '重渲染后的新文本' }]))
    // 整体重渲染（update）后浮层隐藏
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('false')
  })

  it('wrap 真实 scroll 事件隐藏浮层（M8 回归：覆盖 wrap 滚动路径而非仅重渲染路径）', async () => {
    const { el, td } = tipMount({ height: '80' })
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('true')
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 10
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 30))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('false')
  })

  it('页面级滚动（document capture）隐藏浮层（回归）', () => {
    const { el, td } = tipMount()
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('true')
    document.dispatchEvent(new Event('scroll'))
    expect(tooltip(el)!.getAttribute('data-visible')).toBe('false')
  })

  it('浮层 token 色（暗色可读）：背景/文字走 CSS 变量而非硬编码色值', () => {
    const { el, td } = tipMount()
    td.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    const styleEl = el.shadowRoot!.querySelector('style')!
    expect(styleEl.textContent).toContain('.cell-tooltip')
    expect(styleEl.textContent).toMatch(/\.cell-tooltip\s*\{[^}]*var\(--oas-tooltip-bg/)
    expect(styleEl.textContent).toMatch(/\.cell-tooltip\s*\{[^}]*var\(--oas-tooltip-color/)
  })
})

// en 语料冒烟：新增 i18n key 存在（completeness 全量校验在 i18n 包测试）
describe('table 字段类型/分组 i18n', () => {
  it('en 语言包含分组空值组文案 key', () => {
    expect(typeof en.messages['table.groupEmpty']).toBe('string')
    expect(en.messages['table.groupEmpty'].length).toBeGreaterThan(0)
  })
})
