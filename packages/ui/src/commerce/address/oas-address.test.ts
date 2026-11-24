import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASAddress } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAddress {
  const el = new OASAddress()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function q<T extends Element>(el: OASAddress, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T
}

const REGIONS = JSON.stringify([
  {
    name: '浙江省',
    children: [
      { name: '杭州市', children: [{ name: '西湖区' }, { name: '滨江区' }] },
      { name: '宁波市', children: [{ name: '海曙区' }] },
    ],
  },
  { name: '江苏省', children: [{ name: '南京市', children: [{ name: '玄武区' }] }] },
])

const VALUE = JSON.stringify({
  name: '张三',
  phone: '13800000000',
  province: '浙江省',
  city: '杭州市',
  district: '西湖区',
  detail: '文三路 100 号',
})

const ITEMS_JSON = JSON.stringify([
  {
    id: 'a1',
    name: '张三',
    phone: '13800000000',
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
    detail: '文三路 100 号',
    isDefault: true,
  },
  {
    id: 'a2',
    name: '李四',
    phone: '13900000000',
    province: '江苏省',
    city: '南京市',
    district: '玄武区',
    detail: '中山路 8 号',
  },
])

describe('OASAddress', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('edit 模式渲染联系人 / 地区 / 详细地址字段与保存按钮', () => {
    const el = mount({ regions: REGIONS })
    expect(q<HTMLInputElement>(el, 'input[name="name"]').tagName).toBe('INPUT')
    expect(q<HTMLInputElement>(el, 'input[name="phone"]').inputMode).toBe('tel')
    expect([...q<HTMLSelectElement>(el, '.province').options].map((o) => o.value)).toEqual(['', '浙江省', '江苏省'])
    expect([...q<HTMLSelectElement>(el, '.city').options].map((o) => o.value)).toEqual([''])
    expect([...q<HTMLSelectElement>(el, '.district').options].map((o) => o.value)).toEqual([''])
    expect(q<HTMLTextAreaElement>(el, 'textarea[name="detail"]').tagName).toBe('TEXTAREA')
    expect(q<HTMLElement>(el, '[part="submit-text"]').textContent).toBe('保存地址')
    expect(q<HTMLElement>(el, '.list').hidden).toBe(true)
  })

  it('value 受控预填：字段与三级联动选中项同步', () => {
    const el = mount({ regions: REGIONS, value: VALUE })
    expect(q<HTMLInputElement>(el, 'input[name="name"]').value).toBe('张三')
    expect(q<HTMLInputElement>(el, 'input[name="phone"]').value).toBe('13800000000')
    expect(q<HTMLSelectElement>(el, '.province').value).toBe('浙江省')
    expect(q<HTMLSelectElement>(el, '.city').value).toBe('杭州市')
    expect(q<HTMLSelectElement>(el, '.district').value).toBe('西湖区')
    expect(q<HTMLTextAreaElement>(el, 'textarea[name="detail"]').value).toBe('文三路 100 号')
  })

  it('省 → 市 → 区三级联动：上级变更重置下级并派发 oas-change', () => {
    const el = mount({ regions: REGIONS })
    const events: Array<{ field: string }> = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    const province = q<HTMLSelectElement>(el, '.province')
    province.value = '江苏省'
    province.dispatchEvent(new Event('change'))
    const city = q<HTMLSelectElement>(el, '.city')
    expect([...city.options].map((o) => o.value)).toEqual(['', '南京市'])
    expect(q<HTMLSelectElement>(el, '.district').options.length).toBe(1)

    city.value = '南京市'
    city.dispatchEvent(new Event('change'))
    const district = q<HTMLSelectElement>(el, '.district')
    expect([...district.options].map((o) => o.value)).toEqual(['', '玄武区'])
    expect(events.map((e) => e.field)).toEqual(['region', 'region'])
  })

  it('地区深度按整棵树的最大层级判定（首个省份无下级不影响其他省份联动）', () => {
    const regions = JSON.stringify([
      { name: '北京市' },
      {
        name: '浙江省',
        children: [{ name: '杭州市', children: [{ name: '西湖区' }] }],
      },
    ])
    const el = mount({ regions })
    const province = q<HTMLSelectElement>(el, '.province')
    province.value = '浙江省'
    province.dispatchEvent(new Event('change'))
    const city = q<HTMLSelectElement>(el, '.city')
    expect(city.disabled).toBe(false)
    expect([...city.options].map((o) => o.value)).toEqual(['', '杭州市'])
    city.value = '杭州市'
    city.dispatchEvent(new Event('change'))
    expect(q<HTMLSelectElement>(el, '.district').disabled).toBe(false)
    expect([...q<HTMLSelectElement>(el, '.district').options].map((o) => o.value)).toEqual(['', '西湖区'])
  })

  it('提交通过校验派发 oas-submit，值包含当前草稿', () => {
    const el = mount({ regions: REGIONS })
    ;(q<HTMLInputElement>(el, 'input[name="name"]') as HTMLInputElement).value = '李四'
    q<HTMLInputElement>(el, 'input[name="phone"]').value = '13900000000'
    const province = q<HTMLSelectElement>(el, '.province')
    province.value = '浙江省'
    province.dispatchEvent(new Event('change'))
    const city = q<HTMLSelectElement>(el, '.city')
    city.value = '杭州市'
    city.dispatchEvent(new Event('change'))
    const district = q<HTMLSelectElement>(el, '.district')
    district.value = '滨江区'
    district.dispatchEvent(new Event('change'))
    q<HTMLTextAreaElement>(el, 'textarea[name="detail"]').value = '江南大道 1 号'

    let detail: { value: Record<string, unknown> } | null = null
    el.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(detail!.value).toMatchObject({
      name: '李四',
      phone: '13900000000',
      province: '浙江省',
      city: '杭州市',
      district: '滨江区',
      detail: '江南大道 1 号',
    })
  })

  it('校验失败派发 oas-invalid，标记字段并同步 aria-invalid', () => {
    const el = mount({ regions: REGIONS })
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fields).toContain('name')
    expect(fields).toContain('phone')
    expect(q<HTMLElement>(el, '.contact-group .field').getAttribute('data-invalid')).toBe('')
    expect(q<HTMLInputElement>(el, 'input[name="name"]').getAttribute('aria-invalid')).toBe('true')
    expect(q<HTMLElement>(el, '.contact-group .error').hidden).toBe(false)
  })

  it('电话格式非法派发 oas-invalid（invalidPhone 文案）', () => {
    const el = mount({})
    q<HTMLInputElement>(el, 'input[name="name"]').value = '王五'
    const phone = q<HTMLInputElement>(el, 'input[name="phone"]')
    phone.value = 'abc'
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fields).toEqual(['phone'])
    expect(q<HTMLElement>(el, '.contact-group .field:nth-of-type(2) .error').textContent).toBe('手机号码格式不正确')
  })

  it('list 模式渲染地址卡，默认地址预选中，点击其他项派发 oas-select', () => {
    const items = JSON.stringify([
      { id: 'a', name: '张三', phone: '13800000000', detail: '文三路 100 号', isDefault: true },
      { id: 'b', name: '李四', phone: '13900000000', detail: '江南大道 1 号' },
    ])
    const el = mount({ mode: 'list', items })
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    expect(cards.length).toBe(2)
    expect(cards[0]!.hasAttribute('data-selected')).toBe(true)
    expect(cards[0]!.querySelector<HTMLInputElement>('input')!.checked).toBe(true)
    expect(cards[0]!.querySelector('.badge')!.textContent).toBe('默认')

    let detail: { id: string } | null = null
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    cards[1]!.querySelector<HTMLInputElement>('input')!.click()
    expect(detail!.id).toBe('b')
    expect(el.getAttribute('selected-id')).toBe('b')
    expect(cards[1]!.isConnected, '选中变化不重建列表（焦点不丢）').toBe(true)
    expect(cards[1]!.hasAttribute('data-selected')).toBe(true)
  })

  it('list 空态显示 empty 文案，新增按钮派发 oas-add', () => {
    const el = mount({ mode: 'list', items: '[]' })
    expect(q<HTMLElement>(el, '.empty').hidden).toBe(false)
    expect(q<HTMLElement>(el, '.empty').textContent).toBe('暂无收货地址')
    let fired = false
    el.addEventListener('oas-add', () => (fired = true))
    q<HTMLButtonElement>(el, '.add').click()
    expect(fired).toBe(true)
  })

  it('contact 轻模式只显示姓名与电话，输入派发 oas-change', () => {
    const el = mount({ mode: 'contact' })
    expect(q<HTMLElement>(el, '.region-group').hidden).toBe(true)
    expect(q<HTMLElement>(el, '.default-field').hidden).toBe(true)
    expect(q<HTMLElement>(el, '.actions').hidden).toBe(true)
    let detail: { field: string } | null = null
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    const name = q<HTMLInputElement>(el, 'input[name="name"]')
    name.value = '赵六'
    name.dispatchEvent(new Event('input'))
    expect(detail!.field).toBe('name')
  })

  it('disabled 时保存按钮禁用且不派发提交事件', () => {
    const el = mount({ disabled: '' })
    const btn = q<HTMLButtonElement>(el, 'button[type="submit"]')
    expect(btn.disabled).toBe(true)
    let fired = false
    el.addEventListener('oas-submit', () => (fired = true))
    btn.click()
    expect(fired).toBe(false)
  })

  it('readonly 用原生 readOnly（可聚焦复制），提交与新增仍禁用', () => {
    const el = mount({ readonly: '', value: VALUE })
    const name = q<HTMLInputElement>(el, 'input[name="name"]')
    expect(name.readOnly).toBe(true)
    expect(name.disabled, 'readonly 不得等于 disabled（否则无法聚焦复制）').toBe(false)
    expect(q<HTMLTextAreaElement>(el, 'textarea[name="detail"]').readOnly).toBe(true)
    expect(q<HTMLButtonElement>(el, 'button[type="submit"]').disabled).toBe(true)
    expect(name.hasAttribute('aria-disabled')).toBe(false)
    // 只读仍拦截提交
    let fired = false
    el.addEventListener('oas-submit', () => (fired = true))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fired).toBe(false)
  })

  it('非法 regions JSON 不抛异常，按空数据渲染', () => {
    const el = mount({ regions: '{bad' })
    expect(q<HTMLSelectElement>(el, '.province').options.length).toBe(1)
  })

  it('地区必填校验：错误可见 + aria-invalid 落在三级下拉上（不再静默）', () => {
    const el = mount({ regions: REGIONS })
    q<HTMLInputElement>(el, 'input[name="name"]').value = '张三'
    q<HTMLInputElement>(el, 'input[name="phone"]').value = '13800000000'
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fields).toContain('region')
    const field = el.shadowRoot!.querySelector<HTMLElement>('.region-group > .field')!
    expect(field.hasAttribute('data-invalid')).toBe(true)
    const error = field.querySelector<HTMLElement>('.error')!
    expect(error.hidden).toBe(false)
    expect(error.textContent).toBe('该项为必填项')
    const province = q<HTMLSelectElement>(el, '.province')
    expect(province.getAttribute('aria-invalid')).toBe('true')
    expect(province.getAttribute('aria-describedby')).toBe(error.id)

    // 选全三级后错误清除
    province.value = '浙江省'
    province.dispatchEvent(new Event('change'))
    expect(field.hasAttribute('data-invalid')).toBe(false)
    expect(province.hasAttribute('aria-invalid')).toBe(false)
  })

  it('电话格式收紧：纯符号串 / 加号不在首位 / 数字不足 6 位均判非法', () => {
    const el = mount({})
    const phone = q<HTMLInputElement>(el, 'input[name="phone"]')
    const name = q<HTMLInputElement>(el, 'input[name="name"]')
    name.value = '张三'
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    for (const bad of ['------', '+', '12-34', '++13800000000', '138+00000000']) {
      fields = []
      phone.value = bad
      q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
      expect(fields, `${bad} 不应通过电话格式校验`).toContain('phone')
    }
    for (const ok of ['13800000000', '+86 138 0000 0000', '021-12345678']) {
      fields = []
      phone.value = ok
      q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
      expect(fields, `${ok} 应通过电话格式校验`).toEqual([])
    }
  })

  it('非法 mode 告警一次并按 edit 渲染（不随 update 刷屏）', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ mode: 'weird' })
      el.setAttribute('value', JSON.stringify({ name: '张三', phone: '13800000000' }))
      el.setAttribute('items', '[]')
      expect(el.getAttribute('data-mode')).toBe('edit')
      const hits = spy.mock.calls.filter((call) => String(call[0]).includes('mode="weird"'))
      expect(hits.length).toBe(1)
    } finally {
      spy.mockRestore()
    }
  })

  it('property 通道：value / items / regions 收数组对象与 JSON 字符串，均反射 attribute', () => {
    const el = mount()
    el.regions = [{ name: '探针省', children: [{ name: '探针市', children: [{ name: '探针区' }] }] }]
    el.value = { name: '张三', phone: '13800000000', province: '探针省' }
    expect(JSON.parse(el.getAttribute('regions')!)).toEqual([
      { name: '探针省', children: [{ name: '探针市', children: [{ name: '探针区' }] }] },
    ])
    expect(JSON.parse(el.getAttribute('value')!)).toMatchObject({ name: '张三', phone: '13800000000' })
    expect(el.regions).toEqual([{ name: '探针省', children: [{ name: '探针市', children: [{ name: '探针区' }] }] }])
    expect(el.value).toMatchObject({ name: '张三', phone: '13800000000' })
    expect(q<HTMLInputElement>(el, 'input[name="name"]').value).toBe('张三')
    expect([...q<HTMLSelectElement>(el, '.province').options].map((o) => o.value)).toEqual(['', '探针省'])

    el.items = JSON.stringify([{ id: 'x1', name: '李四', phone: '13900000000' }])
    expect(el.items).toMatchObject([{ id: 'x1', name: '李四' }])
    expect(el.getAttribute('items')).toBe('[{"id":"x1","name":"李四","phone":"13900000000"}]')
  })

  it('选中项被宿主删除后 selected-id 回落 default / 首项并派发 oas-select', () => {
    const el = mount({
      mode: 'list',
      items: JSON.stringify([
        { id: 'a1', name: '张三', phone: '13800000000', isDefault: true },
        { id: 'a2', name: '李四', phone: '13900000000' },
      ]),
      'selected-id': 'a2',
    })
    expect(el.shadowRoot!.querySelector('.card[data-id="a2"]')!.hasAttribute('data-selected')).toBe(true)
    let detail: { id: string; item: { name: string } | null } | null = null
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    // 宿主删掉 a2：只剩 a1（default）
    el.setAttribute('items', JSON.stringify([{ id: 'a1', name: '张三', phone: '13800000000', isDefault: true }]))
    expect(el.getAttribute('selected-id')).toBe('a1')
    expect(detail).toMatchObject({ id: 'a1', item: { name: '张三' } })
    expect(el.shadowRoot!.querySelector('.card[data-id="a1"]')!.getAttribute('data-selected')).toBe('')
  })

  it('contact 模式 Enter 隐式提交被拦截（无提交按钮契约）', () => {
    const el = mount({ mode: 'contact', value: JSON.stringify({ name: '王五', phone: '13700000000' }) })
    let submitted = false
    let invalidated = false
    el.addEventListener('oas-submit', () => (submitted = true))
    el.addEventListener('oas-invalid', () => (invalidated = true))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(submitted).toBe(false)
    expect(invalidated).toBe(false)
  })

  it('分区显隐与 inert 同步：隐藏分区不可聚焦，切回后恢复', () => {
    const el = mount({ mode: 'list', items: '[]' })
    const form = q<HTMLFormElement>(el, 'form')
    expect(form.hidden).toBe(true)
    expect(form.hasAttribute('inert'), '隐藏表单必须 inert（防键盘/读屏可达）').toBe(true)

    el.setAttribute('mode', 'edit')
    expect(form.hidden).toBe(false)
    expect(form.hasAttribute('inert'), '可见表单不得残留 inert').toBe(false)
    expect(q<HTMLElement>(el, '.region-group').hasAttribute('inert')).toBe(false)

    // contact：地区/详细地址/保存按钮整组隐藏并 inert，联系人分区可见
    el.setAttribute('mode', 'contact')
    expect(q<HTMLElement>(el, '.region-group').hasAttribute('inert')).toBe(true)
    expect(q<HTMLElement>(el, '.contact-group').hasAttribute('inert')).toBe(false)
  })

  it('列表行编辑钮：每张卡一个，点击派发 oas-edit({ id, item }) 且不改变选中', () => {
    const el = mount({ mode: 'list', items: ITEMS_JSON })
    const details: Array<{ id?: string; item?: { id?: string } }> = []
    let selects = 0
    el.addEventListener('oas-edit', (e) => details.push((e as CustomEvent).detail))
    el.addEventListener('oas-select', () => selects++)
    const editBtns = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-edit"]')]
    expect(editBtns).toHaveLength(2)
    editBtns[1]!.click()
    expect(details).toHaveLength(1)
    expect(details[0]!.id).toBe('a2')
    expect(details[0]!.item?.id).toBe('a2')
    expect(selects).toBe(0)
    // 禁用态拦截
    el.setAttribute('disabled', '')
    expect(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-edit"]')[0]!.disabled).toBe(true)
  })

  it('show-delete：删除钮只在属性在场时渲染，点击派发 oas-delete({ id, item })', () => {
    expect(mount({ mode: 'list', items: ITEMS_JSON }).shadowRoot!.querySelectorAll('[part="card-delete"]').length).toBe(
      0,
    )
    const el = mount({ mode: 'list', items: ITEMS_JSON, 'show-delete': '' })
    const delBtns = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')]
    expect(delBtns).toHaveLength(2)
    const details: Array<{ id?: string; item?: { id?: string } }> = []
    el.addEventListener('oas-delete', (e) => details.push((e as CustomEvent).detail))
    delBtns[0]!.click()
    expect(details).toHaveLength(1)
    expect(details[0]!.id).toBe('a1')
    el.setAttribute('disabled', '')
    expect(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')[0]!.disabled).toBe(true)
  })

  it('deleting 态：删除钮禁用 + aria-busy + spinner；saving 态：保存钮禁用 + aria-busy + spinner', () => {
    const list = mount({ mode: 'list', items: ITEMS_JSON, 'show-delete': '', deleting: '' })
    const del = list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')[0]!
    expect(del.disabled).toBe(true)
    expect(del.getAttribute('aria-busy')).toBe('true')
    // deleting 态删除钮的 spinner 真实可见（hidden=false）
    expect(del.querySelector<HTMLElement>('[part="card-delete-spinner"]')?.hidden).toBe(false)
    const edit = list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-edit"]')[0]!
    expect(edit.disabled).toBe(false)
    list.removeAttribute('deleting')
    expect(list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')[0]!.disabled).toBe(false)

    const form = mount({ regions: REGIONS, saving: '' })
    const submitBtn = q<HTMLButtonElement>(form, 'button[type="submit"]')
    expect(submitBtn.disabled).toBe(true)
    expect(submitBtn.getAttribute('aria-busy')).toBe('true')
    // saving 态保存钮的 spinner 真实可见（hidden=false）
    expect(submitBtn.querySelector<HTMLElement>('[part="save-spinner"]')?.hidden).toBe(false)
    form.removeAttribute('saving')
    expect(q<HTMLButtonElement>(form, 'button[type="submit"]').disabled).toBe(false)
  })

  it('运行时切 deleting：列表不重建（DOM 引用不变，保焦点/滚动），忙态增量同步上/下', () => {
    const list = mount({ mode: 'list', items: ITEMS_JSON, 'show-delete': '' })
    const before = [...list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')]
    expect(before[0]!.querySelector<HTMLElement>('[part="card-delete-spinner"]')?.hidden).toBe(true)
    // 开：卡片节点身份不变（重建签名不含 busy），spinner 转可见 + aria-busy + 禁用
    list.setAttribute('deleting', '')
    const after = [...list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')]
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
    expect(after[0]!.disabled).toBe(true)
    expect(after[0]!.getAttribute('aria-busy')).toBe('true')
    expect(after[0]!.querySelector<HTMLElement>('[part="card-delete-spinner"]')?.hidden).toBe(false)
    // 关：忙态撤下，节点身份依旧不变
    list.removeAttribute('deleting')
    const final = [...list.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')]
    expect(final[0]).toBe(before[0])
    expect(final[0]!.disabled).toBe(false)
    expect(final[0]!.hasAttribute('aria-busy')).toBe(false)
    expect(final[0]!.querySelector<HTMLElement>('[part="card-delete-spinner"]')?.hidden).toBe(true)
  })

  it('validator property：返回错误串并入 oas-invalid（字段标记 + fields 数组含自定义键）', () => {
    const el = mount({ regions: REGIONS })
    el.validator = (key, value) => {
      if (key === 'phone' && value.endsWith('00000000')) return '该手机号已拉黑'
      if (key === 'detail' && value.includes('文三路')) return '详细地址含敏感词'
      return null
    }
    el.setAttribute(
      'value',
      JSON.stringify({
        name: '张三',
        phone: '13800000000',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        detail: '文三路 100 号',
      }),
    )
    const invalids: Array<{ fields?: string[] }> = []
    el.addEventListener('oas-invalid', (e) => invalids.push((e as CustomEvent).detail))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(invalids).toHaveLength(1)
    expect(invalids[0]!.fields).toEqual(['phone', 'detail'])
    // 自定义错误串渲染在对应字段下方
    expect(q<HTMLElement>(el, 'input[name="phone"]').closest('.field')!.querySelector('.error')!.textContent).toBe(
      '该手机号已拉黑',
    )
    // 合法值重新提交通过（换一个不含敏感词的详细地址 + 未拉黑手机号）
    el.setAttribute(
      'value',
      JSON.stringify({
        name: '张三',
        phone: '13911112222',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        detail: '中山路 2 号',
      }),
    )
    let submitted = 0
    el.addEventListener('oas-submit', () => submitted++)
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(submitted).toBe(1)
  })

  it('validator 抛错：devWarn 一次并按无错误处理（不阻断提交）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ regions: REGIONS })
      el.validator = () => {
        throw new Error('boom')
      }
      el.setAttribute(
        'value',
        JSON.stringify({
          name: '张三',
          phone: '13800000000',
          province: '浙江省',
          city: '杭州市',
          district: '西湖区',
          detail: '文三路 1 号',
        }),
      )
      let invalids = 0
      let submitted = 0
      el.addEventListener('oas-invalid', () => invalids++)
      el.addEventListener('oas-submit', () => submitted++)
      q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
      expect(invalids).toBe(0)
      expect(submitted).toBe(1)
      expect(warn.mock.calls.some((c) => String(c[0]).includes('boom'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it('value-format="code"：oas-submit / oas-change 输出区划编码；缺省 name 通道不变', () => {
    const REGIONS_WITH_CODE = JSON.stringify([
      {
        name: '浙江省',
        code: '330000',
        children: [{ name: '杭州市', code: '330100', children: [{ name: '西湖区', code: '330106' }] }],
      },
    ])
    // 缺省：输出名称（现状不变）
    const byName = mount({ regions: REGIONS_WITH_CODE })
    byName.setAttribute(
      'value',
      JSON.stringify({
        name: '张三',
        phone: '13800000000',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        detail: '文三路 1 号',
      }),
    )
    let nameDetail: { value?: { province?: string } } | null = null
    byName.addEventListener('oas-submit', (e) => (nameDetail = (e as CustomEvent).detail))
    q<HTMLFormElement>(byName, 'form').dispatchEvent(new Event('submit'))
    expect(nameDetail!.value!.province).toBe('浙江省')

    // code 档：输出编码；回填按编码匹配到下拉（下拉显示名称）
    const byCode = mount({ regions: REGIONS_WITH_CODE, 'value-format': 'code' })
    byCode.setAttribute(
      'value',
      JSON.stringify({
        name: '张三',
        phone: '13800000000',
        province: '330000',
        city: '330100',
        district: '330106',
        detail: '文三路 1 号',
      }),
    )
    expect(q<HTMLSelectElement>(byCode, '.province').value).toBe('浙江省')
    expect(q<HTMLSelectElement>(byCode, '.district').value).toBe('西湖区')
    let codeDetail: { value?: { province?: string; city?: string; district?: string } } | null = null
    byCode.addEventListener('oas-submit', (e) => (codeDetail = (e as CustomEvent).detail))
    q<HTMLFormElement>(byCode, 'form').dispatchEvent(new Event('submit'))
    expect(codeDetail!.value!.province).toBe('330000')
    expect(codeDetail!.value!.city).toBe('330100')
    expect(codeDetail!.value!.district).toBe('330106')
  })
})
