import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
    expect(q<HTMLButtonElement>(el, 'button[type="submit"]').textContent).toBe('保存地址')
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

  it('非法 regions JSON 不抛异常，按空数据渲染', () => {
    const el = mount({ regions: '{bad' })
    expect(q<HTMLSelectElement>(el, '.province').options.length).toBe(1)
  })
})
