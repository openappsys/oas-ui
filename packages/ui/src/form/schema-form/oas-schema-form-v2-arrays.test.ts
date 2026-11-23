import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASSchemaForm } from './index.js'

/** V2 批 1：数组体系（array-table / 行操作值同步 / 行数快照 / min 拆分 / 受控缩容） */

const tableSchema = {
  type: 'object',
  properties: {
    users: {
      type: 'array',
      title: '成员',
      items: {
        type: 'object',
        required: ['nick'],
        properties: {
          nick: { type: 'string', title: '昵称' },
          // 结构重建类用例只用纯文本字段：happy-dom 在「元素反应栈中创建并连接 number 控件」时
          // 其 ShadowRoot.activeElement 会抛错（测试环境限制，浏览器无此问题）
          age: { type: 'string', title: '年龄' },
        },
      },
    },
  },
}

function mount(
  schema: unknown,
  options: { uiSchema?: unknown; initialValues?: Record<string, unknown>; values?: Record<string, unknown> } = {},
): OASSchemaForm {
  const el = new OASSchemaForm()
  el.schema = schema
  if (options.uiSchema !== undefined) el.uiSchema = options.uiSchema
  if (options.initialValues !== undefined) el.initialValues = options.initialValues
  if (options.values !== undefined) el.values = options.values
  document.body.appendChild(el)
  return el
}

function list(el: OASSchemaForm, key = 'array:users'): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[data-schema-array-key="${key}"]`)!
}

function rows(el: OASSchemaForm, key = 'array:users'): HTMLElement[] {
  return [...list(el, key).querySelectorAll<HTMLElement>(':scope > [data-oas-form-list-item]')]
}

function widget(el: OASSchemaForm, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[name="${name}"]`)
}

/** 容器新增行（表格与列表的新增按钮都在容器 shadow 内） */
function addRow(el: OASSchemaForm, key = 'array:users'): void {
  list(el, key).shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
}

function actionBtn(el: OASSchemaForm, row: number, action: string, key = 'array:users'): HTMLButtonElement {
  const container = list(el, key)
  const rowEl = rows(el, key)[row]!
  return (
    rowEl.querySelector<HTMLButtonElement>(`[data-action="${action}"]`) ??
    container.shadowRoot!.querySelectorAll<HTMLButtonElement>(`[data-action="${action}"]`)[row]!
  )
}

describe('oas-schema-form array-table 渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('widget=array-table 渲染 oas-array-table（表格语义 + 列定义 + 行内 form-item 契约）', () => {
    const el = mount(tableSchema, {
      uiSchema: {
        users: { widget: 'array-table' },
        'users[].nick': { width: 120, align: 'right' },
        'users[].age': { hidden: true },
      },
      initialValues: {
        users: [
          { nick: 'A', age: 20 },
          { nick: 'B', age: 30 },
        ],
      },
    })
    const container = list(el)
    expect(container.tagName.toLowerCase()).toBe('oas-array-table')
    expect(container.shadowRoot!.querySelector('[role="table"]')!.getAttribute('role')).toBe('table')
    const headers = [...container.shadowRoot!.querySelectorAll('[role="columnheader"]')].map((cell) => cell.textContent)
    // 列头承载标签与必填标记（单元格自身不渲染标签，必填星号上移到列头）
    expect(headers).toEqual(['昵称 *', '年龄', '行操作'])
    const firstCell = rows(el)[0]!.querySelector('oas-form-item')!
    expect(firstCell.hasAttribute('label'), '表格单元格不再重复渲染自己的标签（列头已承载）').toBe(false)
    expect(firstCell.hasAttribute('required'), '单元格不重复必填标记（列头已承载必填星号）').toBe(false)
    expect(container.shadowRoot!.querySelector<HTMLElement>('[role="columnheader"]')!.style.textAlign).toBe('right')
    // 单元格仍是 schema-form 渲染的 form-item（值收集/校验/联动零成本继承）
    expect(rows(el)).toHaveLength(2)
    expect(rows(el)[0]!.querySelectorAll('oas-form-item')).toHaveLength(2)
    expect(rows(el)[0]!.querySelector('oas-form-item')!.getAttribute('data-schema-key')).toBe('field:users.[].nick')
    expect(widget(el, 'users.1.nick')!.getAttribute('value')).toBe('B')
  })

  it('表格没有独立空态文案叠层（表体自带空态）', () => {
    const el = mount(tableSchema, { uiSchema: { users: { widget: 'array-table' } } })
    expect(el.shadowRoot!.querySelector('[part="array-empty"]')).toBeNull()
    expect(list(el).shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(false)
  })

  it('列控件按 schema 类型映射（integer → oas-input-number，单元格仍是 form-item 壳）', () => {
    const el = mount(
      {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            title: '成员',
            items: { type: 'object', properties: { age: { type: 'integer', title: '年龄' } } },
          },
        },
      },
      { uiSchema: { users: { widget: 'array-table' } }, initialValues: { users: [{ age: 3 }] } },
    )
    const cell = widget(el, 'users.0.age')!
    expect(cell.tagName.toLowerCase()).toBe('oas-input-number')
    expect(cell.getAttribute('value')).toBe('3')
    expect(cell.closest('oas-form-item')!.getAttribute('role')).toBe('cell')
  })

  it('widget 从 form-list 切到 array-table：行数与值都不丢（整树重建走快照）', () => {
    const el = mount(tableSchema, { initialValues: { users: [{ nick: 'A' }, { nick: 'B' }] } })
    expect(list(el).tagName.toLowerCase()).toBe('oas-form-list')
    addRow(el)
    expect(rows(el)).toHaveLength(3)
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.uiSchema = { users: { widget: 'array-table' } }
    expect(list(el).tagName.toLowerCase()).toBe('oas-array-table')
    expect(rows(el)).toHaveLength(3)
    expect(widget(el, 'users.0.nick')!.getAttribute('value')).toBe('A')
    expect(widget(el, 'users.1.nick')!.getAttribute('value')).toBe('B')
  })
})

describe('oas-schema-form 行操作值同步（dirty / 联动 / 受控基线）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('行操作后值同步：getValues 变化 + dirty 置位（无需 values-change 事件）', () => {
    const el = mount(tableSchema, {
      uiSchema: { users: { widget: 'array-table' } },
      initialValues: {
        users: [
          { nick: 'A', age: 20 },
          { nick: 'B', age: 30 },
        ],
      },
    })
    expect(el.dirty).toBe(false)
    actionBtn(el, 0, 'duplicate').click()
    expect(rows(el)).toHaveLength(3)
    expect(el.getValues()).toEqual({
      users: [
        { nick: 'A', age: '20' },
        { nick: 'A', age: '20' },
        { nick: 'B', age: '30' },
      ],
    })
    expect(el.dirty).toBe(true)
  })

  it('行操作后联动重算（依赖数组路径的 reaction 生效）', () => {
    const el = mount(
      {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            title: '成员',
            items: { type: 'object', properties: { nick: { type: 'string', title: '昵称' } } },
          },
          hint: { type: 'string', title: '提示' },
        },
      },
      {
        uiSchema: {
          users: {
            widget: 'array-table',
            reactions: [{ whenSchema: { schema: { const: [] } }, target: 'hint', fulfill: { required: true } }],
          },
        },
      },
    )
    expect(widget(el, 'hint')!.hasAttribute('aria-required')).toBe(true)
    addRow(el)
    expect(rows(el)).toHaveLength(1)
    expect(widget(el, 'hint')!.hasAttribute('aria-required')).toBe(false)
  })

  it('受控模式：行操作后宿主写同值不回滚（appliedValues 基线已刷新）', () => {
    const el = mount(tableSchema, {
      uiSchema: { users: { widget: 'array-table' } },
      values: { users: [{ nick: 'A' }] },
    })
    actionBtn(el, 0, 'duplicate').click()
    expect(rows(el)).toHaveLength(2)
    // 宿主重写与写前一致的值树：不得把行操作的本地结果冲掉
    el.values = { users: [{ nick: 'A' }] }
    expect(el.getValues()).toEqual({ users: [{ nick: 'A', age: '' }] })
  })
})

describe('oas-schema-form 结构重建行数快照与 min 拆分', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('schema 变化（结构重建）保留当前行数（快照 > 初始长度）', () => {
    const el = mount(tableSchema, { initialValues: { users: [{ nick: 'A' }] } })
    addRow(el)
    addRow(el)
    expect(rows(el)).toHaveLength(3)
    // happy-dom 限制：焦点节点所在 shadow host 被重建时其 activeElement 解析会抛错，先移出焦点
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.schema = { ...tableSchema, properties: { ...tableSchema.properties, note: { type: 'string', title: '备注' } } }
    expect(rows(el)).toHaveLength(3)
    expect(widget(el, 'users.0.nick')!.getAttribute('value')).toBe('A')
    expect(widget(el, 'note')!.tagName.toLowerCase()).toBe('oas-input')
  })

  it('initialValues 改写（initialChanged）忽略行数快照：行数跟宿主初始值走', () => {
    const el = mount(tableSchema, { initialValues: { users: [{ nick: 'A' }] } })
    addRow(el)
    addRow(el)
    expect(rows(el)).toHaveLength(3)
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.schema = { ...tableSchema, title: '成员（改名）' }
    el.initialValues = { users: [{ nick: 'X' }, { nick: 'Y' }] }
    expect(rows(el)).toHaveLength(2)
    expect(widget(el, 'users.1.nick')!.getAttribute('value')).toBe('Y')
  })

  it('reset() 走 bypass：行数回初始长度（不看快照）', () => {
    const el = mount(tableSchema, { initialValues: { users: [{ nick: 'A' }] } })
    addRow(el)
    expect(rows(el)).toHaveLength(2)
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.reset()
    expect(rows(el)).toHaveLength(1)
    expect(el.getValues()).toEqual({ users: [{ nick: 'A', age: '' }] })
  })

  it('min 只作删行下界：初始 1 行的数组可删空（minItems 违规交由数组级校验）', async () => {
    const el = mount(
      {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            title: '成员',
            minItems: 1,
            items: { type: 'object', properties: { nick: { type: 'string', title: '昵称' } } },
          },
        },
      },
      { initialValues: { users: [{ nick: 'A' }] } },
    )
    const container = list(el)
    expect(container.getAttribute('min')).toBeNull()
    ;(container.shadowRoot!.querySelector('[part="remove"]') as HTMLButtonElement).click()
    expect(rows(el)).toHaveLength(0)
    await expect(el.validate()).resolves.toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="array-error"]')!.textContent).toContain('至少需要 1 项')
  })

  it('受控收缩：宿主减少行数 → 行真的被删除（不再留空行）', () => {
    const el = mount(tableSchema, { values: { users: [{ nick: 'A' }, { nick: 'B' }, { nick: 'C' }] } })
    expect(rows(el)).toHaveLength(3)
    el.values = { users: [{ nick: 'A' }] }
    expect(rows(el)).toHaveLength(1)
    expect(el.getValues()).toEqual({ users: [{ nick: 'A', age: '' }] })
  })

  it('受控收缩清空数组 → 零行 + 空态', () => {
    const el = mount(tableSchema, { values: { users: [{ nick: 'A' }] } })
    el.values = { users: [] }
    expect(rows(el)).toHaveLength(0)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="array-empty"]')!.hidden).toBe(false)
  })
})

describe('oas-schema-form 行操作错误清理', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('删行后清该数组字段级错误视觉（红字与 aria-invalid 不残留到重编号后的行）', async () => {
    const el = mount(tableSchema, { initialValues: { users: [{ nick: '' }, { nick: 'B' }] } })
    await el.validate()
    const first = widget(el, 'users.0.nick')!
    expect(first.getAttribute('aria-invalid')).toBe('true')
    const item = first.closest('oas-form-item')!
    expect(item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent).toContain('必填')

    ;(list(el).shadowRoot!.querySelectorAll('[part="remove"]')[0] as HTMLButtonElement).click()
    expect(rows(el)).toHaveLength(1)
    const remaining = widget(el, 'users.0.nick')!
    expect(remaining.getAttribute('value')).toBe('B')
    expect(remaining.hasAttribute('aria-invalid')).toBe(false)
    const remainingItem = remaining.closest('oas-form-item')!
    expect(remainingItem.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent).toBe('')
  })
})
