import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './core/index.js'

// 本文件验证「纯核入口语义」（v2.5.0 L3 子路径语义修正）：
// `@oas-ui/ui/data/table/core` 是不含编辑能力包的 core-only 入口——经它引入时
// editable/actions 配置静默失效 + dev 告警一次（同值去重），
// 与 oas-table-edit-capability.test.ts 覆盖的 core-only 语义一致。
// 注意：不得在此文件 import './edit/index.js' 或 './index.js'——否则能力注册表被填充。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点。
//
// 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个带 editable 配置的 mount
// 必须发生在「dev 告警」用例内；后续用例再挂 editable 表不会再触发 console.warn。

const EDIT_COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', editable: true },
  { key: 'op', title: '操作', actions: true },
])
const EDIT_DATA = JSON.stringify([{ name: '张三', age: 30 }])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', EDIT_COLUMNS)
  if (!attrs.data) el.setAttribute('data', EDIT_DATA)
  document.body.appendChild(el)
  return el
}

describe('OASTable 纯核入口（core：不含编辑能力）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('dev 告警：editable 配置 + core 入口 → 提示显式引能力包或换回主路径（同值去重）', () => {
    const isEditHint = (call: unknown[]) => String(call[0]).includes('data/table/edit')
    // 首个带 editable 配置的实例：告警一次
    mount({ editable: '' })
    const first = warnSpy.mock.calls.filter(isEditHint)
    expect(first.length, 'core 入口首张带 editable 的表应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/data/table/edit')
    // 第二张同配置表：同值去重，不再重复告警
    warnSpy.mockClear()
    mount({ editable: '' })
    expect(warnSpy.mock.calls.filter(isEditHint).length).toBe(0)
  })

  it('editable 静默失效：core 入口无可编辑列装饰/铅笔图标/操作按钮，双击不进入编辑', () => {
    const el = mount({ editable: '' })
    expect(el.shadowRoot!.querySelector('td.editable-cell')).toBeNull()
    expect(el.shadowRoot!.querySelector('.cell-edit-icon')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="action-edit"]')).toBeNull()
    const actionTd = [...el.shadowRoot!.querySelectorAll('tr.row td')].find(
      (td) => td.getAttribute('data-col') === 'op',
    )!
    expect(actionTd.querySelector('button')).toBeNull()
  })

  it('无 editable 配置时 core 入口渲染正常且不告警', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('tr.row td').length).toBe(2)
    const editWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('table/edit'),
    )
    expect(editWarns.length).toBe(0)
  })
})
