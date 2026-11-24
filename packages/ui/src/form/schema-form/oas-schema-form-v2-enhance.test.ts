import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASSchemaForm, registerSchemaConverter } from './index.js'

/** V2 批 4：增强（值联动 value / 异步 convert / 数组两种 widget 切换） */

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

function widget(el: OASSchemaForm, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[name="${name}"]`)
}

function typeInto(el: OASSchemaForm, name: string, value: string): void {
  widget(el, name)!.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value } }))
}

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const fn of cleanups.splice(0)) fn()
  document.body.innerHTML = ''
})

describe('reactions 值联动（fulfill.value 转正）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const schema = {
    type: 'object',
    properties: {
      qty: { type: 'integer', title: '数量' },
      price: { type: 'integer', title: '单价' },
      total: { type: 'integer', title: '合计' },
      discount: { type: 'string', title: '折扣' },
    },
  }

  it('条件成立写入目标字段（表达式结果按内核字符串语义落地）', () => {
    const el = mount(schema, {
      uiSchema: {
        qty: {
          reactions: [{ when: '{qty} > 0', target: 'total', fulfill: { value: '{qty} * {price}' } }],
        },
      },
      initialValues: { qty: 3, price: 5 },
    })
    expect(widget(el, 'total')!.getAttribute('value')).toBe('15')
    expect(el.getValues()).toEqual({ qty: '3', price: '5', total: '15', discount: '' })
    // 联动写入的派生值属于初始状态，不算脏
    expect(el.dirty).toBe(false)
  })

  it('键入触发写值，写值再驱动下游可见性（A → B.value → C.visible 链）', () => {
    const el = mount(schema, {
      uiSchema: {
        qty: {
          reactions: [{ when: '{qty} > 0', target: 'total', fulfill: { value: '{qty} * 2' } }],
        },
        // total 被写值后，依赖 total 的条件必须重算（二次传播）
        price: {
          reactions: [
            { when: '{total} >= 10', target: 'discount', fulfill: { visible: true }, otherwise: { visible: false } },
          ],
        },
      },
      initialValues: { qty: 1, price: 1 },
    })
    expect(widget(el, 'total')!.getAttribute('value')).toBe('2')
    // 初始 total=2 < 10：discount 隐藏（非行内字段直接卸载，值不在快照里）
    expect('discount' in el.getValues()).toBe(false)

    typeInto(el, 'qty', '6')
    expect(widget(el, 'total')!.getAttribute('value')).toBe('12')
    expect('discount' in el.getValues()).toBe(true)

    // 减小到 0：条件不成立且没有 otherwise.value → 保持当前值（值不回收），下游按保持后的值求值
    typeInto(el, 'qty', '0')
    expect(widget(el, 'total')!.getAttribute('value')).toBe('12')
    expect('discount' in el.getValues()).toBe(true)
  })

  it('值表达式依赖的其它字段变化同样触发重算（依赖图纳入 value 表达式路径）', () => {
    const el = mount(schema, {
      uiSchema: {
        qty: {
          reactions: [{ when: '{qty} > 0', target: 'total', fulfill: { value: '{qty} * {price}' } }],
        },
      },
      initialValues: { qty: 2, price: 3 },
    })
    expect(widget(el, 'total')!.getAttribute('value')).toBe('6')
    typeInto(el, 'price', '5')
    expect(widget(el, 'total')!.getAttribute('value')).toBe('10')
  })

  it('otherwise.value：条件不成立时写入回落值', () => {
    const el = mount(schema, {
      uiSchema: {
        qty: {
          reactions: [
            {
              when: '{qty} > 5',
              target: 'discount',
              fulfill: { value: "'vip'" },
              otherwise: { value: "'normal'" },
            },
          ],
        },
      },
      initialValues: { qty: 1 },
    })
    expect(widget(el, 'discount')!.getAttribute('value')).toBe('normal')
    typeInto(el, 'qty', '9')
    expect(widget(el, 'discount')!.getAttribute('value')).toBe('vip')
  })

  it('数组行通配目标：逐行写值互不串扰', () => {
    const el = mount(
      {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: { qty: { type: 'integer' }, total: { type: 'integer' } },
            },
          },
        },
      },
      {
        uiSchema: {
          'users[].qty': {
            reactions: [{ when: '$self > 0', target: 'users[].total', fulfill: { value: '$self * 10' } }],
          },
        },
        initialValues: { users: [{ qty: 1 }, { qty: 2 }] },
      },
    )
    expect(widget(el, 'users.0.total')!.getAttribute('value')).toBe('10')
    expect(widget(el, 'users.1.total')!.getAttribute('value')).toBe('20')
  })

  it('写值不覆盖 visible:false 的隐藏/清值语义', () => {
    const el = mount(schema, {
      uiSchema: {
        qty: {
          reactions: [
            { when: '{qty} > 5', target: ['discount', 'total'], fulfill: { visible: false } },
            { when: '{qty} > 0', target: 'total', fulfill: { value: '{qty}' } },
          ],
        },
      },
      initialValues: { qty: 1 },
    })
    expect(widget(el, 'total')!.getAttribute('value')).toBe('1')
    typeInto(el, 'qty', '9')
    // total 被隐藏（非行内字段直接卸载）→ 值从快照消失，写值不把值塞回去
    expect(el.getValues().total).toBeUndefined()
  })
})

describe('异步 convert（Promise 返回值）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const schema = { type: 'object', properties: { price: { type: 'number', title: '价格' } } }

  it('initialValues 回填：Promise 落地后写入换算值（期间字段保持宿主原值）', async () => {
    const resolvers: Array<() => void> = []
    cleanups.push(
      registerSchemaConverter(
        'asyncCents',
        (value) => new Promise<string>((resolve) => resolvers.push(() => resolve(String(Number(value) * 100)))),
      ),
    )
    const el = mount(schema, { uiSchema: { price: { convert: 'asyncCents' } }, initialValues: { price: 1.5 } })
    const price = widget(el, 'price')!
    // 异步期间是陈旧窗口（宿主原值）：这是 README 标注的预期行为
    expect(price.getAttribute('value')).toBe('1.5')
    resolvers[0]!()
    await vi.waitFor(() => expect(price.getAttribute('value')).toBe('150'))
  })

  it('受控 values 写入：晚到的旧结果被丢弃（seq 守卫）', async () => {
    const resolvers: Array<() => void> = []
    cleanups.push(
      registerSchemaConverter(
        'asyncCents',
        (value) =>
          new Promise<string>((resolve) => resolvers.push(() => resolve(String(Math.round(Number(value) * 100))))),
      ),
    )
    const el = mount(schema, { uiSchema: { price: { convert: 'asyncCents' } }, values: { price: 1 } })
    const price = widget(el, 'price')!
    await vi.waitFor(() => expect(resolvers.length).toBe(1))
    el.values = { price: 2 }
    await vi.waitFor(() => expect(resolvers.length).toBe(2))
    // 新的先返回 → 生效；旧的晚到 → 丢弃
    resolvers[1]!()
    await vi.waitFor(() => expect(price.getAttribute('value')).toBe('200'))
    resolvers[0]!()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(price.getAttribute('value')).toBe('200')
  })

  it('空串不触发异步换算（语义不变）', () => {
    const spy = vi.fn(() => Promise.resolve('x'))
    cleanups.push(registerSchemaConverter('asyncCents', spy))
    const el = mount(schema, { uiSchema: { price: { convert: 'asyncCents' } }, initialValues: { price: 1 } })
    spy.mockClear()
    el.setValues({ price: '' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('Promise 拒绝：devWarn + 保留宿主原值（不写入）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      cleanups.push(registerSchemaConverter('asyncBad', () => Promise.reject(new Error('network'))))
      const el = mount(schema, { uiSchema: { price: { convert: 'asyncBad' } }, initialValues: { price: 7 } })
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(widget(el, 'price')!.getAttribute('value')).toBe('7')
      await vi.waitFor(() => expect(warn.mock.calls.some((call) => String(call[0]).includes('异步'))).toBe(true))
    } finally {
      warn.mockRestore()
    }
  })
})

describe('array-table 跨行粘贴（schema-form 集成：值同步 / 校验承接）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const typedSchema = {
    type: 'object',
    properties: {
      users: {
        type: 'array',
        title: '成员',
        maxItems: 3,
        items: {
          type: 'object',
          required: ['nick'],
          properties: {
            nick: { type: 'string', title: '昵称' },
            age: { type: 'integer', title: '年龄' },
          },
        },
      },
    },
  }

  function table(el: OASSchemaForm): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[data-schema-array-key="array:users"]')!
  }

  function rows(el: OASSchemaForm): HTMLElement[] {
    return [...table(el).querySelectorAll<HTMLElement>(':scope > [data-oas-form-list-item]')]
  }

  function pasteText(el: OASSchemaForm, text: string): void {
    // happy-dom 限制：焦点节点在 shadow 内时，新建 number 控件（粘贴补行）会触发 activeElement 解析异常
    ;(document.activeElement as HTMLElement | null)?.blur()
    const cell = rows(el)[0]!.querySelector<HTMLElement>('[role="cell"]')!
    const event = new Event('paste', { bubbles: true, composed: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text/plain' ? text : '') },
    })
    cell.dispatchEvent(event)
  }

  it('粘贴多行多列：值落地 + 脏态置位 + 行操作事件同套刷新（不派发 values-change 也能同步）', () => {
    const el = mount(typedSchema, { uiSchema: { users: { widget: 'array-table' } }, initialValues: { users: [{}] } })
    pasteText(el, 'A\t20\nB\t30')
    expect(rows(el)).toHaveLength(2)
    expect(el.getValues()).toEqual({
      users: [
        { nick: 'A', age: '20' },
        { nick: 'B', age: '30' },
      ],
    })
    expect(el.dirty).toBe(true)
  })

  it('粘贴超过 maxItems：截断 + 一次性告警（devWarn）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount(typedSchema, { uiSchema: { users: { widget: 'array-table' } }, initialValues: { users: [{}] } })
      pasteText(el, 'A\t1\nB\t2\nC\t3\nD\t4')
      expect(rows(el)).toHaveLength(3)
      expect(warn.mock.calls.filter((call) => String(call[0]).includes('已截断')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('类型不符的粘贴值由既有校验链拦截（integer 列收到字母 → validate 失败）', async () => {
    const el = mount(typedSchema, { uiSchema: { users: { widget: 'array-table' } }, initialValues: { users: [{}] } })
    pasteText(el, 'A\tabc')
    await expect(el.validate()).resolves.toBe(false)
    const age = widget(el, 'users.0.age')!
    expect(age.getAttribute('aria-invalid')).toBe('true')
  })

  it('粘贴触发的值变化参与联动（依赖数组路径的 reaction 重算）', () => {
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
            reactions: [{ when: 'len({users}) == 1', target: 'hint', fulfill: { required: true } }],
          },
        },
        initialValues: { users: [{}] },
      },
    )
    expect(widget(el, 'hint')!.hasAttribute('aria-required')).toBe(true)
    pasteText(el, 'A\nB')
    expect(widget(el, 'hint')!.hasAttribute('aria-required')).toBe(false)
  })
})

describe('嵌套数组深度极限（行数快照 4 轮上限）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  /** depth 层「数组套对象」链：L1 → child(L2) → child(L3) → ... → leaf 字符串 */
  function chain(depth: number): { schema: unknown; value: unknown } {
    let leaf: Record<string, unknown> = { type: 'string', title: '叶子' }
    let value: unknown = 'x'
    for (let level = depth; level >= 1; level--) {
      leaf = {
        type: 'array',
        title: `L${level}`,
        items: { type: 'object', properties: { child: leaf } },
      }
      value = [{ child: value }]
    }
    return { schema: { type: 'object', properties: { root: leaf } }, value: { root: value } }
  }

  it('4 层嵌套（恰在 4 轮上限）：结构重建后各层行数与值都保留', () => {
    const { schema, value } = chain(4)
    const el = mount(schema, { initialValues: value as Record<string, unknown> })
    const lists = () => [...el.shadowRoot!.querySelectorAll<HTMLElement>('[data-schema-array-key]')]
    const counts = () => lists().map((list) => list.querySelectorAll(':scope > [data-oas-form-list-item]').length)
    expect(counts()).toEqual([1, 1, 1, 1])
    expect(el.getValues()).toEqual(value)

    // 结构变化触发重建：4 层都要按快照恢复（4 轮 pass 恰好覆盖）
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.schema = { ...(schema as Record<string, unknown>), title: '深度极限' }
    expect(counts()).toEqual([1, 1, 1, 1])
    expect(el.getValues()).toEqual(value)
  })

  it('5 层嵌套（超出 4 轮上限）：不抛错、前 4 层按快照恢复，第 5 层按初始长度重建（行为固化）', () => {
    const { schema, value } = chain(5)
    const el = mount(schema, { initialValues: value as Record<string, unknown> })
    const lists = () => [...el.shadowRoot!.querySelectorAll<HTMLElement>('[data-schema-array-key]')]
    const counts = () => lists().map((list) => list.querySelectorAll(':scope > [data-oas-form-list-item]').length)
    // 首帧：syncArrayRows 的 4 轮 pass 上限写死——第 5 层容器已建但行数补不到（固化：前 4 层 1 行、第 5 层 0 行）；
    // 第 5 层没有行 ⇒ 没有叶子字段 ⇒ getValues() 为空对象（数组容器本身不收集值）
    const initial = counts()
    expect(initial, '4 轮上限下 5 层嵌套的行数形态固定').toEqual([1, 1, 1, 1, 0])
    expect(el.getValues()).toEqual({})

    ;(document.activeElement as HTMLElement | null)?.blur()
    el.schema = { ...(schema as Record<string, unknown>), title: '五层极限' }
    // 重建同样不抛错；形态稳定（不会因快照回填出现半层错位）
    expect(counts()).toEqual([1, 1, 1, 1, 0])
    expect(el.getValues()).toEqual({})
  })
})

describe('array-table ↔ form-list 切换不丢数据', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const schema = {
    type: 'object',
    properties: {
      users: {
        type: 'array',
        title: '成员',
        maxItems: 5,
        items: {
          type: 'object',
          properties: { nick: { type: 'string', title: '昵称' }, age: { type: 'string', title: '年龄' } },
        },
      },
    },
  }

  function list(el: OASSchemaForm): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[data-schema-array-key="array:users"]')!
  }

  function rows(el: OASSchemaForm): HTMLElement[] {
    return [...list(el).querySelectorAll<HTMLElement>(':scope > [data-oas-form-list-item]')]
  }

  it('form-list → array-table → form-list：行数与用户编辑值全程保留', () => {
    const el = mount(schema, { initialValues: { users: [{ nick: 'A' }, { nick: 'B' }] } })
    expect(list(el).tagName.toLowerCase()).toBe('oas-form-list')
    // 添加第三行并编辑
    ;(list(el).shadowRoot!.querySelector('[part="add"]') as HTMLButtonElement).click()
    typeInto(el, 'users.2.nick', 'C')
    ;(document.activeElement as HTMLElement | null)?.blur()

    el.uiSchema = { users: { widget: 'array-table' } }
    expect(list(el).tagName.toLowerCase()).toBe('oas-array-table')
    expect(rows(el)).toHaveLength(3)
    expect(widget(el, 'users.0.nick')!.getAttribute('value')).toBe('A')
    expect(widget(el, 'users.1.nick')!.getAttribute('value')).toBe('B')
    expect(widget(el, 'users.2.nick')!.getAttribute('value')).toBe('C')

    // 表格里再改一行，切回列表后编辑值仍在
    typeInto(el, 'users.1.nick', 'B2')
    ;(document.activeElement as HTMLElement | null)?.blur()
    el.uiSchema = { users: {} }
    expect(list(el).tagName.toLowerCase()).toBe('oas-form-list')
    expect(rows(el)).toHaveLength(3)
    expect(widget(el, 'users.1.nick')!.getAttribute('value')).toBe('B2')
    expect(el.getValues()).toEqual({
      users: [
        { nick: 'A', age: '' },
        { nick: 'B2', age: '' },
        { nick: 'C', age: '' },
      ],
    })
  })
})
