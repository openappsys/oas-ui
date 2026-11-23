import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OASSchemaForm,
  registerSchemaConverter,
  registerSchemaOptionSource,
  registerSchemaTransformer,
} from './index.js'

/** V2 批 2：数据流（convert / transform 双钩子 + 异步选项窄面） */

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
})

describe('值变换：入向 convert', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const moneySchema = {
    type: 'object',
    properties: { price: { type: 'number', title: '价格' } },
  }
  const moneyUi = { price: { convert: 'cents' } }

  it('initialValues 回填时换算（宿主给元，组件收分）', () => {
    cleanups.push(registerSchemaConverter('cents', (value) => String(Math.round(Number(value) * 100))))
    const el = mount(moneySchema, { uiSchema: moneyUi, initialValues: { price: 1.5 } })
    expect(widget(el, 'price')!.getAttribute('value')).toBe('150')
  })

  it('受控 values 与 setValues 写入换算；空串不调用', () => {
    const spy = vi.fn((value: unknown) => String(Math.round(Number(value) * 100)))
    cleanups.push(registerSchemaConverter('cents', spy))
    const el = mount(moneySchema, { uiSchema: moneyUi, values: { price: 2 } })
    expect(widget(el, 'price')!.getAttribute('value')).toBe('200')
    el.values = { price: 3 }
    expect(widget(el, 'price')!.getAttribute('value')).toBe('300')
    el.setValues({ price: 4 })
    expect(widget(el, 'price')!.getAttribute('value')).toBe('400')
    // 空值不调用换算（防 moneyToCents(undefined) 得 NaN）
    spy.mockClear()
    el.setValues({ price: '' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('键入交互不经过 convert（widget 值已是组件语义）', () => {
    const spy = vi.fn((value: unknown) => String(Math.round(Number(value) * 100)))
    cleanups.push(registerSchemaConverter('cents', spy))
    const el = mount(moneySchema, { uiSchema: moneyUi, initialValues: { price: 1 } })
    spy.mockClear()
    typeInto(el, 'price', '7')
    expect(spy).not.toHaveBeenCalled()
    expect(widget(el, 'price')!.getAttribute('value')).toBe('7')
  })

  it('结构重建的快照回填不二次换算', () => {
    cleanups.push(registerSchemaConverter('cents', (value) => String(Math.round(Number(value) * 100))))
    const el = mount(moneySchema, { uiSchema: moneyUi, initialValues: { price: 1 } })
    expect(widget(el, 'price')!.getAttribute('value')).toBe('100')
    typeInto(el, 'price', '7')
    el.schema = {
      type: 'object',
      properties: { price: { type: 'number', title: '价格' }, note: { type: 'string', title: '备注' } },
    }
    expect(widget(el, 'price')!.getAttribute('value')).toBe('7')
  })

  it('数组行内的通配路径换算（users[].price）', () => {
    cleanups.push(registerSchemaConverter('cents', (value) => String(Math.round(Number(value) * 100))))
    const el = mount(
      {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: { type: 'object', properties: { price: { type: 'number', title: '价格' } } },
          },
        },
      },
      { uiSchema: { 'users[].price': { convert: 'cents' } }, initialValues: { users: [{ price: 1 }, { price: 2 }] } },
    )
    expect(widget(el, 'users.0.price')!.getAttribute('value')).toBe('100')
    expect(widget(el, 'users.1.price')!.getAttribute('value')).toBe('200')
  })

  it('钩子抛错 / 未注册：devWarn + 恒等回落（不阻断渲染）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      cleanups.push(
        registerSchemaConverter('boom', () => {
          throw new Error('boom')
        }),
      )
      const el = mount(moneySchema, { uiSchema: { price: { convert: 'boom' } }, initialValues: { price: 5 } })
      expect(widget(el, 'price')!.getAttribute('value')).toBe('5')
      expect(warn.mock.calls.some((call) => String(call[0]).includes('恒等'))).toBe(true)

      const el2 = mount(moneySchema, { uiSchema: { price: { convert: 'notRegistered' } }, initialValues: { price: 6 } })
      expect(widget(el2, 'price')!.getAttribute('value')).toBe('6')
      expect(warn.mock.calls.some((call) => String(call[0]).includes('未注册'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('值变换：出向 transform', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const schema = {
    type: 'object',
    properties: { price: { type: 'number', title: '价格' } },
  }
  const upper = (value: unknown): unknown => `fmt:${String(value)}`

  it('getValues 与 oas-submit / oas-values-change 载荷应用出向变换', async () => {
    cleanups.push(registerSchemaTransformer('fmt', upper))
    const el = mount(schema, { uiSchema: { price: { transform: 'fmt' } }, initialValues: { price: 2 } })
    expect(el.getValues()).toEqual({ price: 'fmt:2' })

    let submitValues: Record<string, unknown> | null = null
    el.addEventListener('oas-submit', (event) => {
      submitValues = (event as CustomEvent<{ values: Record<string, unknown> }>).detail.values
    })
    el.submit()
    await vi.waitFor(() => expect(submitValues).toEqual({ price: 'fmt:2' }))

    const changes: Array<{ value: unknown; values: Record<string, unknown> }> = []
    el.addEventListener('oas-values-change', (event) => {
      const detail = (event as CustomEvent<{ value: string; values: Record<string, unknown> }>).detail
      changes.push({ value: detail.value, values: detail.values })
    })
    typeInto(el, 'price', '9')
    expect(changes[0]!.value).toBe('fmt:9')
    expect(changes[0]!.values).toEqual({ price: 'fmt:9' })
  })

  it('oas-validate-fail 载荷同样变换', async () => {
    cleanups.push(registerSchemaTransformer('fmt', upper))
    const el = mount(
      { type: 'object', required: ['price'], properties: { price: { type: 'string', title: '价格' } } },
      { uiSchema: { price: { transform: 'fmt' } } },
    )
    let failValues: Record<string, unknown> | null = null
    el.addEventListener('oas-validate-fail', (event) => {
      failValues = (event as CustomEvent<{ values: Record<string, unknown> }>).detail.values
    })
    el.submit()
    await vi.waitFor(() => expect(failValues).toEqual({ price: '' }))
  })

  it('内部 dirty / 快照走内核原始值：出向变换不影响脏态判定', () => {
    cleanups.push(registerSchemaTransformer('fmt', upper))
    const el = mount(schema, { uiSchema: { price: { transform: 'fmt' } }, initialValues: { price: 2 } })
    expect(el.dirty).toBe(false)
    typeInto(el, 'price', '3')
    expect(el.dirty).toBe(true)
    expect(el.getValues()).toEqual({ price: 'fmt:3' })
  })

  it('convert + transform 往返：initialValues 换算进、事件载荷换出', async () => {
    cleanups.push(registerSchemaConverter('cents', (value) => String(Math.round(Number(value) * 100))))
    cleanups.push(registerSchemaTransformer('yuan', (value) => (Number(value) / 100).toFixed(2)))
    const el = mount(schema, {
      uiSchema: { price: { convert: 'cents', transform: 'yuan' } },
      initialValues: { price: 1.5 },
    })
    expect(widget(el, 'price')!.getAttribute('value')).toBe('150')
    let submitValues: Record<string, unknown> | null = null
    el.addEventListener('oas-submit', (event) => {
      submitValues = (event as CustomEvent<{ values: Record<string, unknown> }>).detail.values
    })
    el.submit()
    await vi.waitFor(() => expect(submitValues).toEqual({ price: '1.50' }))
  })

  it('容器节点上的 convert / transform 告警忽略（只对叶子字段生效）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mount(
        { type: 'object', properties: { box: { type: 'object', properties: { a: { type: 'string' } } } } },
        { uiSchema: { box: { convert: 'cents' } } },
      )
      expect(warn.mock.calls.some((call) => String(call[0]).includes('仅对叶子字段生效'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('异步选项源（options.source / sourceDeps）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const selectSchema = {
    type: 'object',
    properties: {
      city: { type: 'string', title: '城市' },
      district: { type: 'string', title: '区县' },
    },
  }

  it('select：加载中置 loading，完成后写 options', async () => {
    let resolve!: (value: unknown[]) => void
    const promise = new Promise<unknown[]>((r) => {
      resolve = r
    })
    cleanups.push(registerSchemaOptionSource('cities', () => promise))
    const el = mount(selectSchema, { uiSchema: { city: { options: { source: 'cities' } } } })
    const city = widget(el, 'city')!
    expect(city.hasAttribute('loading')).toBe(true)
    expect(city.getAttribute('loading-text')).toBe('选项加载中…')
    resolve([{ label: '杭州', value: 'hz' }])
    await vi.waitFor(() => expect(city.hasAttribute('loading')).toBe(false))
    expect(city.getAttribute('options')).toBe(JSON.stringify([{ label: '杭州', value: 'hz' }]))
  })

  it('radio-group / checkbox-group：loading 布尔属性随加载切换（向后兼容增量）', async () => {
    let resolve!: (value: unknown[]) => void
    const promise = new Promise<unknown[]>((r) => {
      resolve = r
    })
    cleanups.push(registerSchemaOptionSource('levels', () => promise))
    const el = mount(
      {
        type: 'object',
        properties: {
          level: { type: 'string', title: '等级' },
          tags: { type: 'array', title: '标签' },
        },
      },
      {
        uiSchema: {
          level: { widget: 'oas-radio-group', options: { source: 'levels' } },
          tags: { widget: 'oas-checkbox-group', options: { source: 'levels' } },
        },
      },
    )
    const level = widget(el, 'level')!
    const tags = widget(el, 'tags')!
    expect(level.tagName.toLowerCase()).toBe('oas-radio-group')
    expect(level.hasAttribute('loading')).toBe(true)
    expect(tags.hasAttribute('loading')).toBe(true)
    resolve([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ])
    await vi.waitFor(() => expect(level.hasAttribute('loading')).toBe(false))
    expect(tags.hasAttribute('loading')).toBe(false)
    expect(level.getAttribute('options')).toContain('"value":"a"')
  })

  it('sourceDeps：依赖值变化才 reload（A 变 → B 的选项重载）', async () => {
    const calls: Array<Record<string, unknown>> = []
    cleanups.push(
      registerSchemaOptionSource('districts', (values) => {
        calls.push({ ...values })
        return Promise.resolve([{ label: `${String(values.city)}-区`, value: 'x' }])
      }),
    )
    const el = mount(
      {
        type: 'object',
        properties: {
          city: { type: 'string', title: '城市', enum: ['hz', 'sh'] },
          district: { type: 'string', title: '区县' },
        },
      },
      {
        uiSchema: { district: { options: { source: 'districts', sourceDeps: ['city'] } } },
        initialValues: { city: 'hz' },
      },
    )
    await vi.waitFor(() => expect(calls.length).toBe(1))
    expect(widget(el, 'district')!.getAttribute('options')).toContain('hz-区')

    calls.length = 0
    const city = widget(el, 'city')!
    city.setAttribute('value', 'sh')
    city.dispatchEvent(new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value: 'sh' } }))
    await vi.waitFor(() => expect(calls.length).toBe(1))
    expect(widget(el, 'district')!.getAttribute('options')).toContain('sh-区')
  })

  it('失败态：错误文案 + 重试按钮（i18n），点击重试重新加载', async () => {
    let attempt = 0
    cleanups.push(
      registerSchemaOptionSource('flaky', () => {
        attempt += 1
        return attempt === 1 ? Promise.reject(new Error('network')) : Promise.resolve([{ label: 'A', value: 'a' }])
      }),
    )
    const el = mount(selectSchema, { uiSchema: { city: { options: { source: 'flaky' } } } })
    await vi.waitFor(() => {
      expect(el.shadowRoot!.querySelector('[part="options-status"]')?.getAttribute('role')).toBe('alert')
    })
    const status = el.shadowRoot!.querySelector<HTMLElement>('[part="options-status"]')!
    expect(status.textContent).toContain('选项加载失败')
    expect(status.textContent).toContain('请检查网络后重试')
    const retry = status.querySelector<HTMLButtonElement>('[part="options-retry"]')!
    expect(retry.textContent).toBe('重试')
    retry.click()
    await vi.waitFor(() => expect(widget(el, 'city')!.getAttribute('options')).toContain('"a"'))
    expect(el.shadowRoot!.querySelector('[part="options-status"]')).toBeNull()
  })

  it('空结果：显示空态文案；reloadOptions(path) 手动刷新', async () => {
    let items: unknown[] = []
    cleanups.push(registerSchemaOptionSource('maybe', () => Promise.resolve(items)))
    const el = mount(selectSchema, { uiSchema: { city: { options: { source: 'maybe' } } } })
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('[part="options-status"]')?.textContent).toBe('暂无可选项'),
    )
    items = [{ label: 'A', value: 'a' }]
    el.reloadOptions('city')
    await vi.waitFor(() => expect(widget(el, 'city')!.getAttribute('options')).toContain('"a"'))
  })

  it('竞态：慢的旧响应不覆盖新响应（seq 守卫）', async () => {
    const resolvers: Array<(value: unknown[]) => void> = []
    cleanups.push(
      registerSchemaOptionSource('slow', () => new Promise<unknown[]>((resolve) => resolvers.push(resolve))),
    )
    const el = mount(selectSchema, { uiSchema: { city: { options: { source: 'slow' } } } })
    await vi.waitFor(() => expect(resolvers.length).toBe(1))
    // 第二次请求（手动刷新）先返回；第一次的慢响应随后返回必须被丢弃
    el.reloadOptions('city')
    await vi.waitFor(() => expect(resolvers.length).toBe(2))
    resolvers[1]!([{ label: 'NEW', value: 'new' }])
    await vi.waitFor(() => expect(widget(el, 'city')!.getAttribute('options')).toContain('NEW'))
    resolvers[0]!([{ label: 'OLD', value: 'old' }])
    await new Promise((r) => setTimeout(r, 0))
    expect(widget(el, 'city')!.getAttribute('options')).toContain('NEW')
    expect(widget(el, 'city')!.getAttribute('options')).not.toContain('OLD')
  })

  it('三通道优先级：enum 与静态 options.options 优先于 source（source 不调用 + 告警）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const spy = vi.fn(() => Promise.resolve([{ label: 'S', value: 's' }]))
    try {
      cleanups.push(registerSchemaOptionSource('src', spy))
      const el = mount(
        {
          type: 'object',
          properties: {
            city: { type: 'string', title: '城市', enum: ['hz', 'sh'] },
            level: { type: 'string', title: '等级' },
          },
        },
        {
          uiSchema: {
            city: { options: { source: 'src' } },
            level: { widget: 'oas-select', options: { options: [{ label: 'A', value: 'a' }], source: 'src' } },
          },
        },
      )
      await new Promise((r) => setTimeout(r, 0))
      expect(spy).not.toHaveBeenCalled()
      expect(widget(el, 'city')!.getAttribute('options')).toContain('hz')
      expect(widget(el, 'level')!.getAttribute('options')).toContain('"a"')
      expect(warn.mock.calls.some((call) => String(call[0]).includes('按优先级取前者'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it('卸载后丢弃结果：断开连接期间落地的响应不写回', async () => {
    let resolve!: (value: unknown[]) => void
    cleanups.push(registerSchemaOptionSource('late', () => new Promise<unknown[]>((r) => (resolve = r))))
    const el = mount(selectSchema, { uiSchema: { city: { options: { source: 'late' } } } })
    const city = widget(el, 'city')!
    el.remove()
    resolve([{ label: 'A', value: 'a' }])
    await new Promise((r) => setTimeout(r, 0))
    expect(city.hasAttribute('options')).toBe(false)
  })
})
