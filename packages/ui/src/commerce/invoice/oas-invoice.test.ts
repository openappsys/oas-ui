import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASInvoice } from './index.js'
import { segmentedStep } from './oas-invoice.js'

function mount(attrs: Record<string, string> = {}): OASInvoice {
  const el = new OASInvoice()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function q<T extends Element>(el: OASInvoice, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T
}

const CONTENTS = JSON.stringify([
  { value: 'goods', label: '商品明细' },
  { value: 'services', label: '服务费' },
])

const SAVED = JSON.stringify([
  { id: 's1', type: 'company', title: '杭州示例科技有限公司', taxId: '91330100MA2AB1234X' },
  { id: 's2', type: 'personal', title: '张三' },
])

describe('OASInvoice', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认个人抬头：税号字段隐藏，分段控件两项且个人选中', () => {
    const el = mount()
    expect(q<HTMLElement>(el, '.tax-field').hidden).toBe(true)
    const segments = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.segment')]
    expect(segments.length).toBe(2)
    expect(segments[0]!.getAttribute('aria-checked')).toBe('true')
    expect(segments[1]!.getAttribute('aria-checked')).toBe('false')
    expect(q<HTMLElement>(el, '.segmented').getAttribute('aria-label')).toBe('抬头类型')
  })

  it('切换企业抬头显示税号字段并派发 oas-change', () => {
    const el = mount()
    let detail: { field: string; value: { type: string } } | null = null
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    ;[...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.segment')][1]!.click()
    expect(el.getAttribute('type')).toBe('company')
    expect(q<HTMLElement>(el, '.tax-field').hidden).toBe(false)
    expect(detail!.field).toBe('type')
    expect(detail!.value.type).toBe('company')
  })

  it('contents 注入渲染内容下拉，切换写 content 属性并派发 change', () => {
    const el = mount({ contents: CONTENTS })
    const select = q<HTMLSelectElement>(el, 'select[name="content"]')
    expect([...select.options].map((o) => o.value)).toEqual(['goods', 'services'])
    let detail: { field: string } | null = null
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    select.value = 'services'
    select.dispatchEvent(new Event('change'))
    expect(el.getAttribute('content')).toBe('services')
    expect(detail!.field).toBe('content')
  })

  it('个人抬头提交只要求抬头，派发 oas-submit', () => {
    const el = mount({ contents: CONTENTS })
    q<HTMLInputElement>(el, 'input[name="title"]').value = '张三'
    let detail: { value: Record<string, unknown> } | null = null
    el.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(detail!.value).toMatchObject({ type: 'personal', title: '张三', content: 'goods', taxId: '' })
    expect(el.getAttribute('title')).toBe('张三')
  })

  it('输入抬头后切换内容 / 类型不重置草稿', () => {
    const el = mount({ contents: CONTENTS })
    const title = q<HTMLInputElement>(el, 'input[name="title"]')
    title.value = '草稿抬头'
    title.dispatchEvent(new Event('input'))
    const select = q<HTMLSelectElement>(el, 'select[name="content"]')
    select.value = 'services'
    select.dispatchEvent(new Event('change'))
    expect(title.value).toBe('草稿抬头')
    ;[...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.segment')][1]!.click()
    expect(title.value).toBe('草稿抬头')
  })

  it('企业抬头税号非法派发 oas-invalid 并显示错误文案', () => {
    const el = mount({ type: 'company' })
    q<HTMLInputElement>(el, 'input[name="title"]').value = '示例公司'
    q<HTMLInputElement>(el, 'input[name="taxId"]').value = '123'
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fields).toEqual(['taxId'])
    expect(q<HTMLElement>(el, '.tax-field').getAttribute('data-invalid')).toBe('')
    expect(q<HTMLElement>(el, '.tax-field .error').textContent).toBe('纳税人识别号需为 15–20 位字母或数字')
    expect(q<HTMLInputElement>(el, 'input[name="taxId"]').getAttribute('aria-invalid')).toBe('true')
  })

  it('企业抬头税号合法提交成功', () => {
    const el = mount({ type: 'company' })
    q<HTMLInputElement>(el, 'input[name="title"]').value = '示例公司'
    q<HTMLInputElement>(el, 'input[name="taxId"]').value = '91330100MA2AB1234X'
    let detail: { value: { taxId: string } } | null = null
    el.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(detail!.value.taxId).toBe('91330100MA2AB1234X')
  })

  it('已保存抬头弹层：打开、选择回填并派发 oas-title-select', () => {
    const el = mount({ 'save-titles': SAVED })
    const trigger = q<HTMLButtonElement>(el, '.saved-trigger')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    trigger.click()
    expect(q<HTMLElement>(el, '.picker').hidden).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const options = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(options.length).toBe(2)

    let detail: { id: string } | null = null
    el.addEventListener('oas-title-select', (e) => (detail = (e as CustomEvent).detail))
    options[0]!.click()
    expect(detail!.id).toBe('s1')
    expect(el.getAttribute('type')).toBe('company')
    expect(el.getAttribute('title')).toBe('杭州示例科技有限公司')
    expect(q<HTMLInputElement>(el, 'input[name="taxId"]').value).toBe('91330100MA2AB1234X')
    expect(q<HTMLElement>(el, '.picker').hidden).toBe(true)
  })

  it('弹层键盘：ArrowDown 移动、Escape 关闭并归还焦点', () => {
    const el = mount({ 'save-titles': SAVED })
    const trigger = q<HTMLButtonElement>(el, '.saved-trigger')
    trigger.click()
    const list = q<HTMLElement>(el, '.picker-list')
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const options = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(options[1]!.hasAttribute('data-active')).toBe(true)
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(q<HTMLElement>(el, '.picker').hidden).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(trigger)
  })

  it('点击宿主外部关闭弹层（文档 pointerdown）', () => {
    const el = mount({ 'save-titles': SAVED })
    q<HTMLButtonElement>(el, '.saved-trigger').click()
    expect(q<HTMLElement>(el, '.picker').hidden).toBe(false)
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(q<HTMLElement>(el, '.picker').hidden).toBe(true)
  })

  it('无已保存抬头时隐藏入口', () => {
    const el = mount()
    expect(q<HTMLElement>(el, '.saved').hidden).toBe(true)
  })

  it('disabled 时输入与提交按钮禁用，提交被拦截', () => {
    const el = mount({ disabled: '', type: 'company' })
    expect(q<HTMLInputElement>(el, 'input[name="title"]').disabled).toBe(true)
    expect(q<HTMLButtonElement>(el, '.submit').disabled).toBe(true)
    let fired = false
    el.addEventListener('oas-submit', () => (fired = true))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fired).toBe(false)
  })

  it('非法 contents / save-titles 不抛异常', () => {
    const el = mount({ contents: '{oops', 'save-titles': 'nope' })
    expect(q<HTMLElement>(el, '.content-field').hidden).toBe(true)
    expect(q<HTMLElement>(el, '.saved').hidden).toBe(true)
  })

  it('readonly 用原生 readOnly（可聚焦复制），内容选择与提交仍禁用', () => {
    const el = mount({ readonly: '', contents: CONTENTS, title: '张三' })
    const title = q<HTMLInputElement>(el, 'input[name="title"]')
    expect(title.readOnly).toBe(true)
    expect(title.disabled, 'readonly 不得等于 disabled（否则无法聚焦复制）').toBe(false)
    expect(title.value).toBe('张三')
    expect(q<HTMLSelectElement>(el, 'select[name="content"]').disabled).toBe(true)
    expect(q<HTMLButtonElement>(el, '.submit').disabled).toBe(true)
    let fired = false
    el.addEventListener('oas-submit', () => (fired = true))
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit'))
    expect(fired).toBe(false)
  })

  it('property 通道：contents / savedTitles 收数组与 JSON 字符串，均反射 attribute', () => {
    const el = mount()
    el.contents = [{ value: 'probe', label: '探针内容' }]
    expect(el.getAttribute('contents')).toBe('[{"value":"probe","label":"探针内容"}]')
    expect(el.contents).toEqual([{ value: 'probe', label: '探针内容' }])
    expect([...q<HTMLSelectElement>(el, 'select[name="content"]').options].map((o) => o.value)).toEqual(['probe'])

    el.saveTitles = JSON.stringify([{ id: 't9', type: 'personal', title: '探针抬头' }])
    expect(el.getAttribute('save-titles')).toBe('[{"id":"t9","type":"personal","title":"探针抬头"}]')
    expect(el.saveTitles).toEqual([{ id: 't9', type: 'personal', title: '探针抬头' }])
    expect(q<HTMLElement>(el, '.saved').hidden).toBe(false)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(1)
  })

  it('save-titles 从 0 涨到 N：空态文案隐藏（不得残留在弹层里）', () => {
    const el = mount({ contents: CONTENTS })
    expect(q<HTMLElement>(el, '.empty').hidden).toBe(false)
    el.saveTitles = [{ id: 's1', type: 'personal', title: '张三' }]
    expect(q<HTMLElement>(el, '.empty').hidden).toBe(true)
    q<HTMLButtonElement>(el, '.saved-trigger').click()
    expect(q<HTMLElement>(el, '.empty').hidden, '弹层里不该出现「暂无已保存抬头」').toBe(true)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(1)
  })

  it('content 值不在 contents 选项中：devWarn 回落首项并同步 attribute', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ contents: CONTENTS, content: 'not-in-options' })
      const select = q<HTMLSelectElement>(el, 'select[name="content"]')
      expect(select.value).toBe('goods')
      expect(el.getAttribute('content')).toBe('goods')
      expect(spy.mock.calls.some((call) => String(call[0]).includes('not-in-options'))).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })

  it('弹层空间不足时向上翻转（视口下缘检测 → data-placement=up）', () => {
    const el = mount({ 'save-titles': SAVED })
    const trigger = q<HTMLButtonElement>(el, '.saved-trigger')
    const picker = q<HTMLElement>(el, '.picker')
    const rect = (top: number, height: number): DOMRect =>
      ({
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 100,
        width: 100,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect
    expect(window.innerHeight).toBeGreaterThan(300)
    // 触发器贴近视口底部：下方空间不足、上方更宽裕 → 向上
    trigger.getBoundingClientRect = () => rect(window.innerHeight - 40, 32)
    picker.getBoundingClientRect = () => rect(0, 200)
    trigger.click()
    expect(picker.getAttribute('data-placement')).toBe('up')
    trigger.click() // 关闭
    expect(picker.hidden).toBe(true)

    // 上方充裕（视口中部）→ 保持向下
    trigger.getBoundingClientRect = () => rect(120, 32)
    trigger.click()
    expect(picker.hasAttribute('data-placement')).toBe(false)
  })

  it('RTL：方向键语义随 direction 互换（segmentedStep 单一真源）', () => {
    expect(segmentedStep('ArrowRight', false)).toBe(1)
    expect(segmentedStep('ArrowLeft', false)).toBe(-1)
    expect(segmentedStep('ArrowRight', true)).toBe(-1)
    expect(segmentedStep('ArrowLeft', true)).toBe(1)
    expect(segmentedStep('Enter', true)).toBe(0)

    // 组件内：RTL 下 ArrowLeft = 下一项（两项组内等价于切到另一项），且焦点跟随
    const el = mount()
    const group = q<HTMLElement>(el, '.segmented')
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('type')).toBe('company')
    expect((el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.value).toBe('company')
  })
})
