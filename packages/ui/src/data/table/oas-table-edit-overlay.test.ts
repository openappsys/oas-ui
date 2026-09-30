import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
// 行内编辑用例经主路径 index 已默认含编辑能力（显式 import 幂等冗余，与既有测试文件同惯例）
import './edit/index.js'
// 浮层编辑器通道用例：oas-select / oas-date-picker（副作用注册；edit 能力包已含 select 闭合，
// 此处显式 import 与既有测试文件同惯例——多选列默认编辑器与显式 editComponent 两路都可达）
import '../../form/select/index.js'
import '../../form/date-picker/index.js'

/** 浮层编辑器列组：select（editOptions）/ date-picker / 原生编辑列混排，验证分派优先级 */
const OVERLAY_COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', editable: true },
  {
    key: 'dept',
    title: '部门',
    editable: true,
    editComponent: 'oas-select',
    editOptions: [
      { value: 'fe', label: '前端部' },
      { value: 'be', label: '后端部' },
      { value: 'qa', label: '测试部' },
    ],
  },
  { key: 'joined', title: '入职日期', editable: true, editComponent: 'oas-date-picker' },
])
const OVERLAY_DATA = JSON.stringify([
  { name: '张三', dept: 'fe', joined: '2026-03-15' },
  { name: '李四', dept: 'be', joined: '2025-11-02' },
])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  // 编辑用例默认开 editable（与既有编辑用例同惯例；attrs 显式给值时覆盖）
  el.setAttribute('editable', '')
  el.setAttribute('row-key', 'name')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', OVERLAY_COLUMNS)
  if (!attrs.data) el.setAttribute('data', OVERLAY_DATA)
  document.body.appendChild(el)
  return el
}

function cells(el: OASTable): HTMLTableCellElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLTableCellElement>('tbody td[data-col]')]
}

function cellOf(el: OASTable, key: string, row = 0): HTMLTableCellElement {
  return cells(el).filter((td) => td.getAttribute('data-col') === key)[row]!
}

/** 把单元格拉进编辑态（沿用既有测试的双击派发惯例） */
function enterEdit(el: OASTable, key: string, row = 0): HTMLTableCellElement {
  const td = cellOf(el, key, row)
  td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  return td
}

/** 浮层编辑器 shadow 内触发器（select 的 button.trigger / date-picker 的 input.trigger 同 class） */
function triggerOf(comp: Element): HTMLElement {
  return comp.shadowRoot!.querySelector<HTMLElement>('.trigger')!
}

/** oas-select 非虚拟模式的选项行 */
function optionRows(comp: Element): HTMLElement[] {
  return [...comp.shadowRoot!.querySelectorAll<HTMLElement>('.listbox .option')]
}

/** 浮层面板内指针按下 + 编辑器失焦（模拟「点面板内非焦点元素」引发的焦点转移序列） */
function blurViaPanelClick(comp: Element): void {
  const row = optionRows(comp)[0]!
  row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }))
  comp.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
}

describe('editComponent 浮层编辑器通道（oas-select / oas-date-picker）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('oas-select 编辑器挂载：options 同步 + 初值注入 + 进入编辑自动展开浮层', () => {
    const el = mount()
    const td = enterEdit(el, 'dept')
    const comp = td.querySelector<HTMLElement>('oas-select.cell-editor-component')
    expect(comp, '浮层组件编辑器挂载').not.toBeNull()
    expect(td.querySelector('select.cell-editor'), '不落原生 select 通道').toBeNull()
    // 选项同步：editOptions 优先（value 归一字符串序列化）
    expect(JSON.parse(comp!.getAttribute('options')!)).toEqual([
      { label: '前端部', value: 'fe' },
      { label: '后端部', value: 'be' },
      { label: '测试部', value: 'qa' },
    ])
    expect(comp!.getAttribute('value')).toBe('fe')
    // 自动展开：触发器 aria-expanded 镜像（组件非受控开合通道，未写 open 属性）
    expect(comp!.hasAttribute('open'), '不进入受控 open 模式').toBe(false)
    expect(triggerOf(comp!).getAttribute('aria-expanded')).toBe('true')
    expect(comp!.shadowRoot!.querySelector('.dropdown')!.classList.contains('open')).toBe(true)
  })

  it('oas-date-picker 编辑器挂载：初值注入 + 自动展开面板', () => {
    const el = mount()
    const td = enterEdit(el, 'joined')
    const comp = td.querySelector<HTMLElement>('oas-date-picker.cell-editor-component')
    expect(comp, 'date-picker 编辑器挂载').not.toBeNull()
    expect(comp!.getAttribute('value')).toBe('2026-03-15')
    expect(triggerOf(comp!).getAttribute('aria-expanded')).toBe('true')
    // 面板锚定选中值所在月
    expect(comp!.shadowRoot!.querySelector('.day[data-date="2026-03-15"]')).not.toBeNull()
  })

  it('浮层内交互不误提交：点选项行引发失焦不提交，oas-change 才提交（第一期缺口回归）', () => {
    const el = mount()
    let edited = 0
    el.addEventListener('oas-edit', () => edited++)
    const td = enterEdit(el, 'dept')
    const comp = td.querySelector<HTMLElement>('oas-select.cell-editor-component')!
    // 指针按下面板内选项行 → 焦点转移失焦（relatedTarget 为空）：不得按旧值提交拆掉编辑器
    blurViaPanelClick(comp)
    expect(td.getAttribute('data-editing'), '面板内交互不失焦提交').toBe('true')
    expect(edited).toBe(0)
    // 点选「测试部」→ oas-change → 选定即提交
    optionRows(comp)[2]!.click()
    expect(JSON.parse(el.getAttribute('data')!)[0].dept).toBe('qa')
    expect(edited).toBe(1)
    expect(cellOf(el, 'dept').querySelector('oas-select'), '提交后编辑器退出').toBeNull()
  })

  it('Esc 双层级：浮层开着 Esc 只关浮层（编辑保留），浮层已关 Esc 取消编辑', () => {
    const el = mount()
    let cancelled = 0
    el.addEventListener('oas-edit-cancel', () => cancelled++)
    const td = enterEdit(el, 'dept')
    const comp = td.querySelector<HTMLElement>('oas-select.cell-editor-component')!
    const trigger = triggerOf(comp)
    // 第一层：浮层开着 → 组件自关面板，编辑不取消
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(td.getAttribute('data-editing'), '第一层 Esc 不取消编辑').toBe('true')
    expect(cancelled).toBe(0)
    // 第二层：浮层已关 → 取消编辑还原旧值
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    expect(cancelled).toBe(1)
    expect(cellOf(el, 'dept').querySelector('oas-select')).toBeNull()
    expect(JSON.parse(el.getAttribute('data')!)[0].dept).toBe('fe')
  })

  it('外点提交：编辑器与浮层外指针按下 + 失焦 → 提交组件当前值', () => {
    const el = mount()
    let detail: { value: string } | null = null
    el.addEventListener('oas-edit', (e) => (detail = (e as CustomEvent<{ value: string }>).detail))
    const td = enterEdit(el, 'dept')
    const comp = td.querySelector<HTMLElement>('oas-select.cell-editor-component')!
    // 模拟浮层内已选定但未走提交通道的组件状态（如多选场景的中间态），外点失焦应按当前值提交
    comp.setAttribute('value', 'be')
    // 编辑器外指针按下（抑制窗口解除）→ 失焦 → 提交
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    comp.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    const d = detail as { value: string } | null
    expect(d?.value).toBe('be')
    expect(JSON.parse(el.getAttribute('data')!)[0].dept).toBe('be')
  })

  it('date-picker 选定即提交：面板日格 click → oas-change → 回写 ISO 日期', () => {
    const el = mount()
    const td = enterEdit(el, 'joined')
    const comp = td.querySelector<HTMLElement>('oas-date-picker.cell-editor-component')!
    const day = comp.shadowRoot!.querySelector<HTMLButtonElement>('.day[data-date="2026-03-20"]')!
    day.click()
    expect(JSON.parse(el.getAttribute('data')!)[0].joined).toBe('2026-03-20')
    expect(cellOf(el, 'joined').querySelector('oas-date-picker'), '选定后编辑器退出').toBeNull()
  })

  it('浮层名单外的 editComponent 保持第一期非浮层通道（不自动展开、无守卫）', () => {
    const el = mount({
      columns: JSON.stringify([{ key: 'v', title: '值', editable: true, editComponent: 'oas-input' }]),
      data: JSON.stringify([{ v: '旧值' }]),
    })
    const td = enterEdit(el, 'v')
    const comp = td.querySelector<HTMLElement>('oas-input.cell-editor-component')
    expect(comp, '非浮层组件照常挂载').not.toBeNull()
    expect(comp!.shadowRoot, '白板组件不尝试展开浮层').toBeNull()
    // Esc 走第一期 el 级取消通道
    comp!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(cellOf(el, 'v').querySelector('oas-input')).toBeNull()
  })

  it('编辑中整表重建（settleEdit）：浮层编辑器静默取消且 document 守卫随拆（Esc 不再取消）', () => {
    const el = mount()
    let cancelled = 0
    el.addEventListener('oas-edit-cancel', () => cancelled++)
    const td = enterEdit(el, 'dept')
    expect(td.querySelector('oas-select')).not.toBeNull()
    // 数据变化触发整体重建 → settleEdit 静默取消（与横向滚动列窗口重建同语义）
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '张三', dept: 'fe', joined: '2026-03-15' },
        { name: '新行', dept: 'qa', joined: '2026-01-01' },
      ]),
    )
    expect(el.shadowRoot!.querySelector('[data-editing="true"]'), '重建后编辑态静默取消').toBeNull()
    // 守卫已拆：document 级 Esc capture 不再触发取消（否则守卫泄漏会误伤表格外键盘流）
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    expect(cancelled, '守卫已拆除不再误取消').toBe(0)
  })
})

describe('multi-select 编辑器升级（oas-select multiple 替代逗号分隔 input）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const tagColumns = JSON.stringify([
    {
      key: 'tags',
      title: '标签',
      type: 'multi-select',
      editable: true,
      options: [
        { value: 'a', label: '选项 A' },
        { value: 'b', label: '选项 B' },
        { value: 'c', label: '选项 C' },
      ],
    },
  ])

  const tagMount = (tags: unknown): OASTable => mount({ columns: tagColumns, data: JSON.stringify([{ id: 1, tags }]) })

  const tagComp = (el: OASTable): HTMLElement =>
    cellOf(el, 'tags').querySelector<HTMLElement>('oas-select.cell-editor-component')!

  it('multi-select 列编辑器换 oas-select multiple：options 同步 + 数组初值注入（不再落 input 通道）', () => {
    const el = tagMount(['a', 'b'])
    const td = enterEdit(el, 'tags')
    const comp = tagComp(el)
    expect(comp, '多选列默认编辑器为 oas-select').not.toBeNull()
    expect(td.querySelector('input.cell-editor'), '逗号分隔 input 通道退役').toBeNull()
    expect(comp.hasAttribute('multiple'), '多选形态').toBe(true)
    expect(JSON.parse(comp.getAttribute('options')!)).toEqual([
      { label: '选项 A', value: 'a' },
      { label: '选项 B', value: 'b' },
      { label: '选项 C', value: 'c' },
    ])
    expect(JSON.parse(comp.getAttribute('value')!)).toEqual(['a', 'b'])
    // 自动展开 + 触发器 chip 回显已选项
    expect(triggerOf(comp).getAttribute('aria-expanded')).toBe('true')
    expect(comp.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
  })

  it('勾选是中间态不即提交；失焦一次性提交数组回写', () => {
    const el = tagMount(['a'])
    let edited = 0
    let detail: { value: string } | null = null
    el.addEventListener('oas-edit', () => edited++)
    el.addEventListener('oas-edit', (e) => (detail = (e as CustomEvent<{ value: string }>).detail))
    const td = enterEdit(el, 'tags')
    const comp = tagComp(el)
    // 勾选 c：oas-change 派发但多选不提交（编辑保留）
    optionRows(comp)[2]!.click()
    expect(td.getAttribute('data-editing'), '勾选不提交').toBe('true')
    expect(edited).toBe(0)
    // 失焦（编辑器外指针按下解除抑制）→ 一次性提交 ['a','c']
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    comp.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect(edited).toBe(1)
    const d = detail as { value: string } | null
    expect(d?.value).toBe('a,c')
    expect(JSON.parse(el.getAttribute('data')!)[0].tags).toEqual(['a', 'c'])
  })

  it('浮层内连续勾选不误提交（指针抑制窗口覆盖整个面板会话）', () => {
    const el = tagMount([])
    const td = enterEdit(el, 'tags')
    const comp = tagComp(el)
    // 连续两次面板内点选（每次都伴随失焦），中间不提交
    blurViaPanelClick(comp)
    optionRows(comp)[0]!.click()
    expect(td.getAttribute('data-editing'), '第一次勾选后仍在编辑').toBe('true')
    blurViaPanelClick(comp)
    optionRows(comp)[1]!.click()
    expect(td.getAttribute('data-editing'), '第二次勾选后仍在编辑').toBe('true')
    // 失焦一次提交两个
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    comp.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect(JSON.parse(el.getAttribute('data')!)[0].tags).toEqual(['a', 'b'])
  })

  it('空数组提交：回写 []（合法值），不派 oas-edit-cancel', () => {
    const el = tagMount(['a'])
    let cancelled = 0
    let edited = 0
    el.addEventListener('oas-edit-cancel', () => cancelled++)
    el.addEventListener('oas-edit', () => edited++)
    const td = enterEdit(el, 'tags')
    const comp = tagComp(el)
    // chip × 移除唯一已选项 → 值 []（oas-change 不提交）
    ;(comp.shadowRoot!.querySelector('.chip button') as HTMLElement)!.click()
    expect(td.getAttribute('data-editing')).toBe('true')
    // 失焦提交：空数组为合法值回写 []，不走「空值还原取消」
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    comp.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect(JSON.parse(el.getAttribute('data')!)[0].tags).toEqual([])
    expect(edited).toBe(1)
    expect(cancelled, '空数组不派取消').toBe(0)
  })

  it('旧逗号字符串数据兼容：初值按逗号拆为选中集', () => {
    const el = tagMount('a,b')
    enterEdit(el, 'tags')
    const comp = tagComp(el)
    expect(JSON.parse(comp.getAttribute('value')!)).toEqual(['a', 'b'])
  })

  it('Esc 双层级同样适用多选编辑器：面板开着只关面板，已关取消编辑还原旧数组', () => {
    const el = tagMount(['a'])
    let cancelled = 0
    el.addEventListener('oas-edit-cancel', () => cancelled++)
    const td = enterEdit(el, 'tags')
    const comp = tagComp(el)
    const trigger = triggerOf(comp)
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(td.getAttribute('data-editing'), '第一层不取消').toBe('true')
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    expect(cancelled).toBe(1)
    expect(JSON.parse(el.getAttribute('data')!)[0].tags).toEqual(['a'])
  })
})
