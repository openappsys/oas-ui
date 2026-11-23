import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASSchemaForm, registerSchemaWidget } from './index.js'

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

function widgetOf(el: OASSchemaForm, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[name="${name}"]`)
}

function typeInto(el: OASSchemaForm, name: string, value: string): void {
  widgetOf(el, name)!.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value } }))
}

const schema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: '姓名', minLength: 2 },
    mail: { type: 'string', title: '邮箱', format: 'email' },
    users: {
      type: 'array',
      title: '成员',
      minItems: 1,
      items: { type: 'object', properties: { nick: { type: 'string', title: '昵称' } } },
    },
  },
}

describe('oas-schema-form 受控 values（V1b）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('values property 作为基线写入字段，与 initialValues 同时提供时 values 优先', () => {
    const el = mount(schema, {
      initialValues: { name: '非受控', mail: 'a@example.com' },
      values: { name: '受控', mail: 'b@example.com' },
    })
    expect(widgetOf(el, 'name')!.getAttribute('value')).toBe('受控')
    expect(widgetOf(el, 'mail')!.getAttribute('value')).toBe('b@example.com')
    expect(el.values.name).toBe('受控')
  })

  it('values 变化按叶子 diff 写：只改变化路径，未变化的用户编辑保留', () => {
    const el = mount(schema, { values: { name: 'A', mail: 'a@example.com' } })
    typeInto(el, 'mail', 'edited@example.com')
    el.values = { name: 'B', mail: 'a@example.com' }
    expect(widgetOf(el, 'name')!.getAttribute('value')).toBe('B')
    expect(widgetOf(el, 'mail')!.getAttribute('value')).toBe('edited@example.com')
  })

  it('宿主删除的键清空对应字段（受控「消失」= 清空）', () => {
    const el = mount(schema, { values: { name: 'A', mail: 'a@example.com' } })
    el.values = { name: 'A' }
    expect(widgetOf(el, 'mail')!.getAttribute('value')).toBe('')
  })

  it('宿主写不回派 oas-values-change（防回环）', () => {
    const el = mount(schema, { values: { name: 'A' } })
    const spy = vi.fn()
    el.addEventListener('oas-values-change', spy)
    el.values = { name: 'B' }
    el.setValues({ mail: 'c@example.com' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('受控数组按长度补行（min 只增），行内字段按值写入', () => {
    const el = mount(schema, { values: { users: [{ nick: 'x' }, { nick: 'y' }] } })
    const list = el.shadowRoot!.querySelector<HTMLElement>('[data-schema-array-key="array:users"]')!
    expect(list.querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(2)
    expect(widgetOf(el, 'users.0.nick')!.getAttribute('value')).toBe('x')
    expect(widgetOf(el, 'users.1.nick')!.getAttribute('value')).toBe('y')
  })

  it('dirty：初始 false，用户编辑 true，reset 回基线后 false', () => {
    const el = mount(schema, { values: { name: 'A' } })
    expect(el.dirty).toBe(false)
    typeInto(el, 'name', 'AB')
    expect(el.dirty).toBe(true)
    el.reset()
    expect(el.dirty).toBe(false)
  })

  it('非受控模式 dirty 同样工作（基线 = initialValues）', () => {
    const el = mount(schema, { initialValues: { name: 'A' } })
    expect(el.dirty).toBe(false)
    typeInto(el, 'name', 'AB')
    expect(el.dirty).toBe(true)
  })

  it('公开 setValues 写入字段并置脏', () => {
    const el = mount(schema, { values: { name: 'A' } })
    el.setValues({ name: 'AB' })
    expect(widgetOf(el, 'name')!.getAttribute('value')).toBe('AB')
    expect(el.dirty).toBe(true)
  })
})

describe('registerSchemaWidget（V1b 自定义 widget）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('注册名解析为自定义元素，读值走注册 reader，写值走 writer', () => {
    class MoneyInput extends HTMLElement {
      amount = ''
    }
    if (!customElements.get('x-money-input')) customElements.define('x-money-input', MoneyInput)
    const unregister = registerSchemaWidget('money', 'x-money-input', {
      reader: (el) => (el as MoneyInput).amount,
      writer: (el, value) => {
        ;(el as MoneyInput).amount = value
      },
    })
    try {
      const el = mount(
        {
          type: 'object',
          properties: { price: { type: 'number', title: '价格' } },
        },
        { uiSchema: { price: { widget: 'money' } }, values: { price: 12 } },
      )
      const widget = widgetOf(el, 'price')!
      expect(widget.tagName.toLowerCase()).toBe('x-money-input')
      expect((widget as MoneyInput).amount).toBe('12')
      expect(el.getValues().price).toBe('12')
    } finally {
      unregister()
    }
  })

  it('非自定义元素 tag（无连字符）：devWarn 并拒绝注册', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const unregister = registerSchemaWidget('plain', 'div')
      const el = mount(
        { type: 'object', properties: { price: { type: 'string', title: '价格' } } },
        { uiSchema: { price: { widget: 'plain' } } },
      )
      expect(widgetOf(el, 'price')!.tagName.toLowerCase()).toBe('oas-input')
      expect(warn.mock.calls.some((call) => String(call[0]).includes('不是自定义元素'))).toBe(true)
      unregister()
    } finally {
      warn.mockRestore()
    }
  })

  it('未注册的 widget 名：编译告警并回落默认映射', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount(
        { type: 'object', properties: { price: { type: 'string', title: '价格' } } },
        { uiSchema: { price: { widget: 'nope' } } },
      )
      expect(widgetOf(el, 'price')!.tagName.toLowerCase()).toBe('oas-input')
      expect(warn.mock.calls.some((call) => String(call[0]).includes('registerSchemaWidget'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('oas-schema-form V1b 固化回归（重连 / 提交并集载荷）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('断开重连两次：数组增删不叠加（点一次添加只加一行）', () => {
    const el = mount(schema, { initialValues: { users: [{ nick: 'A' }] } })
    for (let i = 0; i < 2; i++) {
      el.remove()
      document.body.appendChild(el)
    }
    const list = el.shadowRoot!.querySelector<HTMLElement>('[data-schema-array-key="array:users"]')!
    list.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
    expect(list.querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(2)
    list.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
    expect(list.querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(3)
  })

  it('提交失败载荷 = 字段错误 ∪ 数组级错误（两条路径同时出现）', async () => {
    const el = mount(schema)
    const failures: Array<Record<string, string>> = []
    el.addEventListener('oas-validate-fail', (event) => {
      failures.push((event as CustomEvent<{ errors: Record<string, string> }>).detail.errors)
    })
    el.submit()
    await vi.waitFor(() => expect(failures.length).toBe(1))
    const errors = failures[0]!
    expect(errors.name, '字段级必填错误').toBe('该字段为必填项')
    expect(errors.users, '数组级 minItems 错误').toBe('至少需要 1 项')
  })
})
