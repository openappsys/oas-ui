import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTable } from './index.js'
// v2.6.4 起默认入口不含编辑；本文件验证「默认 table + 显式 edit」组合。
import './edit/index.js'

// 本文件验证「默认入口 + 显式编辑能力」：`@oas-ui/ui/data/table` 提供基础表格，
// `@oas-ui/ui/data/table/edit` import 即注册编辑能力；二者组合后 editable / actions 直接可用。
// 纯默认入口（无 edit）的边界由 ./core-entry.test.ts（core 现为 deprecated alias）覆盖。
// vitest 按文件隔离模块图，本文件显式 import edit 会注册能力，不能与「无 edit」断言同文件。

const EDIT_COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', editable: true },
  { key: 'age', title: '年龄' },
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

function cells(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('tr.row td')] as HTMLElement[]
}

describe('OASTable 默认入口 + 显式编辑能力（index + edit）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('仅 import 主路径即可用行内编辑：可编辑列装饰/铅笔图标/操作按钮渲染，双击进入编辑', () => {
    const el = mount({ editable: '', 'row-key': 'name' })
    expect(el.shadowRoot!.querySelector('td.editable-cell')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.cell-edit-icon')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="action-edit"]')).not.toBeNull()
    // 双击可编辑列进入编辑态（input 编辑器回填当前值）
    const nameTd = cells(el).find((td) => td.getAttribute('data-col') === 'name')!
    nameTd.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = nameTd.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('张三')
  })
})
