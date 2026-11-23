import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASSchemaForm } from './index.js'

function mount(
  schema: unknown,
  options: {
    uiSchema?: unknown
    initialValues?: Record<string, unknown>
    attrs?: Record<string, string>
  } = {},
): OASSchemaForm {
  const el = new OASSchemaForm()
  if (typeof schema === 'string') el.setAttribute('schema', schema)
  else el.schema = schema
  if (options.uiSchema !== undefined) el.uiSchema = options.uiSchema
  if (options.initialValues !== undefined) el.initialValues = options.initialValues
  for (const [key, value] of Object.entries(options.attrs ?? {})) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function formItems(el: OASSchemaForm): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('oas-form-item'))
}

function widgetOf(el: OASSchemaForm, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[name="${name}"]`)
}

function arrayList(el: OASSchemaForm, key = 'array:users'): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[data-schema-array-key="${key}"]`)!
}

function clickArrayAdd(el: OASSchemaForm, key = 'array:users'): void {
  const list = arrayList(el, key)
  list.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
}

function clickArrayRemove(el: OASSchemaForm, index: number, key = 'array:users'): void {
  const list = arrayList(el, key)
  const buttons = list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="remove"]')
  buttons[index]!.click()
}

const basicSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: '姓名', minLength: 2 },
    age: { type: 'integer', title: '年龄' },
    vip: { type: 'boolean', title: '会员' },
    city: { type: 'string', title: '城市', enum: ['bj', 'sh'] },
    mail: { type: 'string', title: '邮箱', format: 'email' },
  },
}

describe('oas-schema-form 渲染（schema → 控件树）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('按默认 widget 映射渲染 form-item + 控件，label 取 title', () => {
    const el = mount(basicSchema)
    const items = formItems(el)
    expect(items).toHaveLength(5)
    expect(items[0]!.getAttribute('label')).toBe('姓名')
    expect(items[0]!.hasAttribute('required')).toBe(true)
    expect(widgetOf(el, 'name')!.tagName.toLowerCase()).toBe('oas-input')
    expect(widgetOf(el, 'age')!.tagName.toLowerCase()).toBe('oas-input-number')
    expect(widgetOf(el, 'vip')!.tagName.toLowerCase()).toBe('oas-switch')
    expect(widgetOf(el, 'city')!.tagName.toLowerCase()).toBe('oas-select')
    expect(widgetOf(el, 'mail')!.getAttribute('type')).toBe('email')
  })

  it('initialValues 经 form 内核写入控件，getValues 为字符串语义', () => {
    const el = mount(basicSchema, { initialValues: { name: '张三', age: 30, vip: true } })
    expect(widgetOf(el, 'name')!.getAttribute('value')).toBe('张三')
    expect(widgetOf(el, 'age')!.getAttribute('value')).toBe('30')
    expect(widgetOf(el, 'vip')!.hasAttribute('checked')).toBe(true)
    expect(el.getValues()).toMatchObject({ name: '张三', age: '30', vip: 'true' })
  })

  it('schema default 作为初始值兜底，宿主 initialValues 优先', () => {
    const schema = {
      type: 'object',
      properties: {
        nickname: { type: 'string', default: '默认昵称' },
        city: { type: 'string', default: 'bj' },
      },
    }
    const el = mount(schema, { initialValues: { city: 'sh' } })
    expect(widgetOf(el, 'nickname')!.getAttribute('value')).toBe('默认昵称')
    expect(widgetOf(el, 'city')!.getAttribute('value')).toBe('sh')
  })

  it('对象嵌套渲染为分组容器，字段名带前缀', () => {
    const el = mount({
      type: 'object',
      properties: {
        address: { type: 'object', title: '地址', properties: { street: { type: 'string', title: '街道' } } },
      },
    })
    const group = el.shadowRoot!.querySelector<HTMLElement>('[part="group"]')!
    expect(group.querySelector('.group-title')!.textContent).toBe('地址')
    expect(group.querySelector<HTMLElement>('[name="address.street"]')).toBeTruthy()
  })

  it('空 schema / 零字段有占位（非空白渲染）', () => {
    const empty = mount({})
    const emptyEl = empty.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
    expect(emptyEl.hidden).toBe(false)
    expect(emptyEl.textContent).not.toBe('')
    const broken = mount('{invalid json}')
    expect(broken.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(false)
  })

  it('schema 变更重建并保留已填值（快照回填）', () => {
    const el = mount(basicSchema, { initialValues: { name: '原名' } })
    expect(widgetOf(el, 'name')!.getAttribute('value')).toBe('原名')
    el.schema = {
      type: 'object',
      properties: { ...basicSchema.properties, extra: { type: 'string', title: '备注' } },
    }
    expect(widgetOf(el, 'extra')).toBeTruthy()
    expect(widgetOf(el, 'name')!.getAttribute('value')).toBe('原名')
  })

  it('表格/尺寸等表级属性透传给内层 oas-form', () => {
    const el = mount(basicSchema, { attrs: { layout: 'grid', 'label-align': 'left', size: 'small' } })
    const form = el.shadowRoot!.querySelector('oas-form')!
    expect(form.getAttribute('layout')).toBe('grid')
    expect(form.getAttribute('label-align')).toBe('left')
    expect(form.getAttribute('size')).toBe('small')
    expect(formItems(el)[0]!.getAttribute('span')).toBeNull()
  })
})

describe('oas-schema-form 校验（迷你校验器 + 数组级）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('必填与 minLength 校验失败：aria-invalid + 错误文案 + oas-validate-fail', async () => {
    const el = mount(basicSchema)
    let detail: { errors?: Record<string, string> } | null = null
    el.addEventListener('oas-validate-fail', (e) => {
      detail = (e as CustomEvent<{ errors: Record<string, string> }>).detail
    })
    await expect(el.validate()).resolves.toBe(false)
    expect(widgetOf(el, 'name')!.getAttribute('aria-invalid')).toBe('true')
    const item = widgetOf(el, 'name')!.closest('oas-form-item')!
    expect(item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent).toContain('必填')
    expect(detail).toBeNull()

    // 提交路径派发 validate-fail
    el.submit()
    await Promise.resolve()
    expect(detail!.errors).toBeTruthy()
  })

  it('填对后通过（minLength 满足）并派发 oas-submit', async () => {
    const el = mount(basicSchema)
    const name = widgetOf(el, 'name')!
    name.setAttribute('value', '张三')
    name.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: '张三' } }))
    let values: Record<string, unknown> | null = null
    el.addEventListener('oas-submit', (e) => {
      values = (e as CustomEvent<{ values: Record<string, unknown> }>).detail.values
    })
    el.submit()
    await Promise.resolve()
    expect(values).toMatchObject({ name: '张三' })
  })

  it('format=email 校验走 i18n 文案', async () => {
    const el = mount(basicSchema, { initialValues: { name: '张三', mail: 'bad' } })
    await expect(el.validate()).resolves.toBe(false)
    const item = widgetOf(el, 'mail')!.closest('oas-form-item')!
    expect(item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent).toContain('邮箱格式不正确')
  })

  it('数组级校验（minItems）注入数组路径并渲染 array-error 错误条', async () => {
    const el = mount({
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: '成员',
          minItems: 1,
          items: { type: 'object', properties: { nick: { type: 'string' } } },
        },
      },
    })
    await expect(el.validate()).resolves.toBe(false)
    const error = el.shadowRoot!.querySelector<HTMLElement>('[part="array-error"]')!
    expect(error.hidden).toBe(false)
    expect(error.textContent).toContain('至少需要 1 项')
    expect(el.getValues()).toEqual({})
  })

  it('uniqueItems：重复项被拦截，去重后通过', async () => {
    const el = mount({
      type: 'object',
      properties: {
        users: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'object', properties: { nick: { type: 'string' } } },
        },
      },
    })
    el.initialValues = { users: [{ nick: 'a' }, { nick: 'a' }] }
    await expect(el.validate()).resolves.toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="array-error"]')!.textContent).toContain('重复')
  })
})

describe('oas-schema-form 联动（whenSchema 单轨）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const schema = {
    type: 'object',
    properties: {
      country: { type: 'string', title: '国家', enum: ['CN', 'US'] },
      province: { type: 'string', title: '省份' },
      city: { type: 'string', title: '城市' },
    },
  }

  it('visible:false 卸载字段（值不提交），条件撤销后复显', () => {
    const el = mount(schema, {
      initialValues: { country: 'US', province: 'CA' },
      uiSchema: {
        country: {
          reactions: [{ whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: false } }],
        },
      },
    })
    expect(widgetOf(el, 'province')).toBeNull()
    expect(el.getValues()).toEqual({ country: 'US', city: '' })

    // 改回 CN → 依赖命中，字段复显（值已被清空，符合 clearValueOnHidden）
    const country = el.shadowRoot!.querySelector<HTMLElement>('[name="country"]')!
    country.setAttribute('value', 'CN')
    country.dispatchEvent(new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value: 'CN' } }))
    expect(widgetOf(el, 'province')).toBeTruthy()
  })

  it('required / disabled 随条件同步（含 aria-required）', () => {
    const el = mount(schema, {
      initialValues: { country: 'CN' },
      uiSchema: {
        country: {
          reactions: [
            {
              whenSchema: { schema: { const: 'CN' } },
              target: ['province', 'city'],
              fulfill: { required: true, disabled: true },
            },
          ],
        },
      },
    })
    const provinceItem = widgetOf(el, 'province')!.closest('oas-form-item')!
    expect(provinceItem.hasAttribute('required')).toBe(true)
    expect(widgetOf(el, 'province')!.getAttribute('aria-required')).toBe('true')
    expect(widgetOf(el, 'province')!.hasAttribute('disabled')).toBe(true)
    expect(widgetOf(el, 'city')!.hasAttribute('disabled')).toBe(true)
  })

  it('依赖图未命中的值变化不刷新视觉（无副作用）', () => {
    const el = mount(schema, {
      uiSchema: {
        country: {
          reactions: [{ whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: false } }],
        },
      },
    })
    const before = widgetOf(el, 'province')
    const city = widgetOf(el, 'city')!
    city.setAttribute('value', 'X')
    city.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: 'X' } }))
    expect(widgetOf(el, 'province')).toBe(before)
  })

  it('数组行内字段卸载保留键位（空串而非删键）', () => {
    const el = mount(
      {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                vip: { type: 'boolean', title: 'VIP' },
                nick: { type: 'string', title: '昵称' },
              },
            },
          },
        },
      },
      {
        initialValues: { users: [{ vip: true, nick: 'a' }] },
        uiSchema: {
          'users[].vip': {
            reactions: [
              { whenSchema: { schema: { const: true } }, target: 'users[].nick', fulfill: { visible: false } },
            ],
          },
        },
      },
    )
    // 行内字段隐藏（保留键位）：键仍在，值为空串
    expect(widgetOf(el, 'users.0.nick')).toBeTruthy()
    expect((widgetOf(el, 'users.0.nick')!.closest('oas-form-item') as HTMLElement).hidden).toBe(true)
    expect(el.getValues()).toMatchObject({ users: [{ vip: 'true', nick: '' }] })
  })
})

describe('oas-schema-form 数组（初始行 / 增删 / 嵌套）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const schema = {
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
            matrix: {
              type: 'array',
              title: '标签组',
              items: { type: 'object', properties: { label: { type: 'string', title: '标签' } } },
            },
          },
        },
      },
    },
  }

  it('初始数组长度驱动建行（1 行必须渲染 1 行）', () => {
    const el = mount(schema, { initialValues: { users: [{ nick: 'a' }, { nick: 'b' }] } })
    const list = arrayList(el)
    expect(list.querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(2)
    expect(widgetOf(el, 'users.0.nick')).toBeTruthy()
    expect(widgetOf(el, 'users.1.nick')!.getAttribute('value')).toBe('b')
  })

  it('嵌套数组：外层 name 带 {index}，内层字段名拼成 users.N.matrix.M.label', () => {
    const el = mount(schema, {
      initialValues: { users: [{ nick: 'a', matrix: [{ label: 'x' }, { label: 'y' }] }] },
    })
    expect(widgetOf(el, 'users.0.matrix.0.label')).toBeTruthy()
    expect(widgetOf(el, 'users.0.matrix.1.label')!.getAttribute('value')).toBe('y')
  })

  it('增删走 form-list 既有交互，值随行号重绑', () => {
    const el = mount(schema, { initialValues: { users: [{ nick: 'a' }] } })
    clickArrayAdd(el)
    expect(arrayList(el).querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(2)
    expect(widgetOf(el, 'users.1.nick')).toBeTruthy()
    clickArrayRemove(el, 0)
    expect(el.getValues()).toMatchObject({ users: [{ nick: '' }] })
  })

  it('空数组有占位（非空白），添加后占位消失', () => {
    const el = mount(schema)
    const empty = el.shadowRoot!.querySelector<HTMLElement>('[data-schema-key="array:users"] > [part="array-empty"]')!
    expect(empty.hidden).toBe(false)
    clickArrayAdd(el)
    expect(arrayList(el).querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(1)
    expect(empty.hidden).toBe(true)
  })

  it('reset()：值回初始基线且行数回初始长度', async () => {
    const el = mount(schema, { initialValues: { users: [{ nick: 'a' }] } })
    clickArrayAdd(el)
    expect(arrayList(el).querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(2)
    el.reset()
    expect(arrayList(el).querySelectorAll(':scope > [data-oas-form-list-item]')).toHaveLength(1)
    expect(el.getValues()).toMatchObject({ users: [{ nick: 'a' }] })
  })

  it('行内必填校验按行号注册（第二行未填即失败）', async () => {
    const el = mount(schema, { initialValues: { users: [{ nick: 'a' }, { nick: '' }] } })
    await expect(el.validate()).resolves.toBe(false)
    expect(widgetOf(el, 'users.1.nick')!.getAttribute('aria-invalid')).toBe('true')
    expect(widgetOf(el, 'users.0.nick')!.hasAttribute('aria-invalid')).toBe(false)
  })
})

describe('oas-schema-form 组合面（错误注入 / 事件 / 生命周期 / questionnaire 契约）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('setErrors 注入服务端错误到对应 form-item，clearErrors 清除', () => {
    const el = mount(basicSchema)
    el.setErrors([
      { path: 'users[0].name', message: '服务端：重复' },
      { path: 'name', message: '服务端：姓名重复' },
    ])
    const item = widgetOf(el, 'name')!.closest('oas-form-item')!
    expect(item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent).toContain('姓名重复')
    el.clearErrors(['name'])
    // 回落规则错误（name 必填且为空）：错误位仍可见，但文案已不再是注入项
    expect(item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent).not.toContain('姓名重复')
  })

  it('oas-values-change 穿出（composed），供问卷等容器汇总', () => {
    const el = mount(basicSchema)
    let detail: { name?: string; values?: unknown } | null = null
    el.addEventListener('oas-values-change', (e) => {
      detail = (e as CustomEvent<{ name: string; values: unknown }>).detail
    })
    const name = widgetOf(el, 'name')!
    name.setAttribute('value', 'abc')
    name.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: 'abc' } }))
    expect(detail!.name).toBe('name')
    expect(detail!.values).toMatchObject({ name: 'abc' })
  })

  it('questionnaire 组合契约：提供 getValues()/validate()（duck-typed）', async () => {
    const el = mount(basicSchema, { initialValues: { name: '张三' } })
    expect(typeof el.getValues).toBe('function')
    await expect(el.validate()).resolves.toBe(true)
  })

  it('setValues 为 V1b 能力：显式 devWarn 不静默', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const el = mount(basicSchema)
    el.setValues({ name: 'x' })
    expect(warn.mock.calls.some((call) => String(call[0]).includes('V1b'))).toBe(true)
    warn.mockRestore()
  })

  it('断开重连（onCleanup 清理）后仍可交互', () => {
    const el = mount(basicSchema, { initialValues: { name: '张三' } })
    const parent = el.parentElement!
    el.remove()
    expect(el.getValues()).toMatchObject({ name: '张三' })
    parent.appendChild(el)
    const name = widgetOf(el, 'name')!
    name.setAttribute('value', 'lisi')
    name.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: 'lisi' } }))
    expect(el.getValues()).toMatchObject({ name: 'lisi' })
  })

  it('标签页容器：role/tab 语义 + 方向键切页', () => {
    const el = mount(
      {
        type: 'object',
        properties: {
          group: { type: 'object', title: '分组', properties: { a: { type: 'string' }, b: { type: 'string' } } },
        },
      },
      {
        uiSchema: {
          group: {
            layout: {
              type: 'tabs',
              tabs: [
                { key: 't1', title: '甲', fields: ['a'] },
                { key: 't2', title: '乙', fields: ['b'] },
              ],
            },
          },
        },
      },
    )
    const tabs = el.shadowRoot!.querySelector<HTMLElement>('[part="tablist"]')!
    expect(tabs.getAttribute('role')).toBe('tablist')
    const buttons = tabs.querySelectorAll<HTMLElement>('[role="tab"]')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.getAttribute('aria-selected')).toBe('true')
    tabs.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(buttons[1]!.getAttribute('aria-selected')).toBe('true')
    const panels = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tabpanel"]')
    expect(panels[0]!.hidden).toBe(true)
    expect(panels[1]!.hidden).toBe(false)
  })

  it('双向通道：JSON attribute 与对象 property 均可设置（防重入）', () => {
    const el = mount(JSON.stringify(basicSchema))
    expect(formItems(el)).toHaveLength(5)
    el.schema = { type: 'object', properties: { only: { type: 'string' } } }
    expect(formItems(el)).toHaveLength(1)
    // attribute 改动后 property 通道失效（防 attr/prop 漂移）
    el.setAttribute(
      'schema',
      JSON.stringify({ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } }),
    )
    expect(formItems(el)).toHaveLength(2)
  })
})
