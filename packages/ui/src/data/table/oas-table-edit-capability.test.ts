import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

// 本文件验证「编辑能力包未 import（core-only）」的边界行为：
// editable/actions 配置静默失效 + dev 告警（同值去重）。
// 注意：不得在此文件 import './edit/index.js'——否则能力注册表被填充，core-only 语义失效。
// （vitest 按文件隔离模块图，本文件与 oas-table.test.ts 的注册表互不影响。）
//
// 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个带 editable 配置的 mount
// 必须发生在「dev 告警」用例内；后续用例再挂 editable 表不会再触发 console.warn。

const EDIT_COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', editable: true },
  { key: 'age', title: '年龄', editable: true },
  {
    key: 'position',
    title: '职位',
    editable: true,
    editor: 'select',
    editOptions: [{ label: '前端工程师', value: 'frontend' }],
  },
  { key: 'op', title: '操作', actions: true },
])
const EDIT_DATA = JSON.stringify([
  { name: '张三', age: 30, position: 'frontend' },
  { name: '李四', age: 25, position: 'backend' },
])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', EDIT_COLUMNS)
  if (!attrs.data) el.setAttribute('data', EDIT_DATA)
  document.body.appendChild(el)
  return el
}

function cells(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('tr.row td')] as HTMLElement[]
}

describe('OASTable 编辑能力边界（core-only：未 import edit 能力包）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy.mockRestore()
  })

  it('dev 告警：editable 配置 + 未 import 编辑能力 → 提示按需 import（同值去重：多表只告警一次）', () => {
    const isEditHint = (call: unknown[]) => String(call[0]).includes('data/table/edit')
    mount({ editable: '' })
    const first = warnSpy.mock.calls.filter(isEditHint)
    expect(first.length, '首张带 editable 的表应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/data/table/edit')
    // 第二张同样配置的表：同值去重，不再重复告警
    warnSpy.mockClear()
    mount({ editable: '' })
    expect(warnSpy.mock.calls.filter(isEditHint).length).toBe(0)
  })

  it('editable/actions 配置静默失效：无可编辑类/铅笔图标/操作按钮/编辑器，双击不进入编辑', () => {
    const el = mount({ editable: '' })
    expect(el.shadowRoot!.querySelector('td.editable-cell')).toBeNull()
    expect(el.shadowRoot!.querySelector('.cell-edit-icon')).toBeNull()
    expect(el.shadowRoot!.querySelector('input.cell-editor')).toBeNull()
    // 操作列 td 留空（无 编辑 按钮）
    const actionTd = cells(el).find((td) => td.getAttribute('data-col') === 'op')!
    expect(actionTd.querySelector('button')).toBeNull()
    expect(actionTd.textContent).toBe('')
    // 双击可编辑列不进入编辑
    const nameTd = cells(el).find((td) => td.getAttribute('data-col') === 'name')!
    nameTd.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(el.shadowRoot!.querySelector('input.cell-editor')).toBeNull()
    expect(el.shadowRoot!.querySelector('[data-editing="true"]')).toBeNull()
  })

  it('无 editable/actions 配置时渲染正常且不告警', () => {
    const plain = new OASTable()
    plain.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'age', title: '年龄' },
      ]),
    )
    plain.setAttribute('data', JSON.stringify([{ name: '张三', age: 30 }]))
    document.body.appendChild(plain)
    expect(plain.shadowRoot!.querySelectorAll('tr.row td').length).toBe(2)
    expect(plain.shadowRoot!.textContent).toContain('张三')
    const editWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('table/edit'),
    )
    expect(editWarns.length).toBe(0)
  })

  it('property 赋值列（含 validate 函数）未 import 编辑能力时同样静默失效', () => {
    const el = new OASTable()
    el.setAttribute('editable', '')
    el.setAttribute('data', JSON.stringify([{ name: '张三', age: 30 }]))
    el.columns = [
      { key: 'name', title: '姓名', editable: true, validate: (v: string) => (v === 'bad' ? 'x' : '') },
      { key: 'age', title: '年龄' },
    ]
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('td.editable-cell')).toBeNull()
    expect(el.shadowRoot!.querySelector('.cell-edit-icon')).toBeNull()
    expect(el.shadowRoot!.querySelector('input.cell-editor')).toBeNull()
    expect(String(el.shadowRoot!.textContent)).toContain('张三')
  })
})
