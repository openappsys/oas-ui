import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTable } from './index.js'

// 本文件验证「主路径入口语义」（v2.5.0 L3 子路径语义修正）：
// 主路径 index.js 顶部 import 编辑能力包（import 即注册），因此经
// `@oas-ui/ui/data/table` 引入时行内编辑能力默认就位——editable / actions 配置
// 直接可用，无需再显式引能力包（恢复 2.4.0 语义）。
// 纯核（/core 子路径不含能力）的边界由 ./core-entry.test.ts 单独覆盖。
// vitest 按文件隔离模块图，本文件独享一份「index 即含能力」的注册表起点。

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

describe('OASTable 主路径入口（index 内含编辑能力）', () => {
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
