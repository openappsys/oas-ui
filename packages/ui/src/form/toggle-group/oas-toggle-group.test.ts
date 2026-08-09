import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASToggleGroup } from './index.js'

const ITEMS = JSON.stringify([
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
])

function mount(attrs: Record<string, string> = {}): OASToggleGroup {
  const el = new OASToggleGroup()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function group(el: OASToggleGroup): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="group"]')!
}

function buttons(el: OASToggleGroup): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="item"]')] as HTMLButtonElement[]
}

function key(el: OASToggleGroup, k: string): void {
  group(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
}

describe('OASToggleGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 items 为 radio 语义按钮，aria-checked 跟随 value', () => {
    const el = mount({ value: 'week' })
    const btns = buttons(el)
    expect(btns.length).toBe(3)
    expect(group(el).getAttribute('role')).toBe('radiogroup')
    expect(btns[0]!.getAttribute('role')).toBe('radio')
    expect(btns[0]!.getAttribute('aria-checked')).toBe('false')
    expect(btns[1]!.getAttribute('aria-checked')).toBe('true')
    expect(btns[2]!.getAttribute('aria-checked')).toBe('false')
  })

  it('roving tabindex：单选模式仅选中项可聚焦', () => {
    const el = mount({ value: 'week' })
    const btns = buttons(el)
    expect(btns[0]!.tabIndex).toBe(-1)
    expect(btns[1]!.tabIndex).toBe(0)
    expect(btns[2]!.tabIndex).toBe(-1)
  })

  it('点击切换 value 并派发 oas-change（单选）', () => {
    const el = mount({ value: 'day' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    buttons(el)[2]!.click()
    expect(el.getAttribute('value')).toBe('month')
    expect(detail).toEqual({ value: 'month' })
    expect(buttons(el)[2]!.getAttribute('aria-checked')).toBe('true')
    expect(buttons(el)[0]!.getAttribute('aria-checked')).toBe('false')
  })

  it('单选：点击已选中项不重复派发', () => {
    const el = mount({ value: 'day' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('disabled 项不可选且 aria-disabled 同步', () => {
    const el = mount({
      items: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
      ]),
    })
    expect(buttons(el)[1]!.getAttribute('aria-disabled')).toBe('true')
    expect(buttons(el)[1]!.tabIndex).toBe(-1)
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[1]!.click()
    expect(fired).toBe(0)
  })

  it('multiple：checkbox 语义，点击切换多选数组', () => {
    const el = mount({ multiple: '', value: '["day"]' })
    const btns = buttons(el)
    expect(group(el).getAttribute('role')).toBe('group')
    expect(btns[0]!.getAttribute('role')).toBe('checkbox')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('["day","week"]')
    expect(detail).toEqual({ value: ['day', 'week'] })
    btns[0]!.click()
    expect(detail).toEqual({ value: ['week'] })
    expect(btns[0]!.getAttribute('aria-checked')).toBe('false')
  })

  it('键盘方向键：单选移动并选中', () => {
    const el = mount({ value: 'day' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowRight')
    expect(el.getAttribute('value')).toBe('week')
    expect(detail).toEqual({ value: 'week' })
    expect(buttons(el)[1]!.getAttribute('aria-checked')).toBe('true')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[1])
    key(el, 'ArrowLeft')
    expect(el.getAttribute('value')).toBe('day')
  })

  it('键盘：多选方向键仅移动焦点，Space 切换选中', () => {
    const el = mount({ multiple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[1])
    expect(detail).toBeUndefined()
    key(el, ' ')
    expect(detail).toEqual({ value: ['week'] })
  })

  it('value 属性变化增量更新，不重建按钮引用', () => {
    const el = mount({ value: 'day' })
    const first = buttons(el)[0]
    el.setAttribute('value', 'week')
    expect(buttons(el)[0]).toBe(first)
    expect(buttons(el)[1]!.getAttribute('aria-checked')).toBe('true')
    expect(buttons(el)[1]!.tabIndex).toBe(0)
  })

  it('items 属性变化重建列表', () => {
    const el = mount()
    const first = buttons(el)[0]
    el.setAttribute('items', JSON.stringify([{ label: 'x', value: 'x' }]))
    expect(buttons(el)[0]).not.toBe(first)
    expect(buttons(el).length).toBe(1)
  })

  it('空 items 渲染空组不报错', () => {
    const el = mount({ items: '[]' })
    expect(buttons(el).length).toBe(0)
  })
})
