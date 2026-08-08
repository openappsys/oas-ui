import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASLabel } from './index.js'

function mountLabel(attrs: Record<string, string> = {}, slot = '姓名'): OASLabel {
  const el = new OASLabel()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function labelEl(el: OASLabel): HTMLElement {
  return el.shadowRoot!.querySelector('[part="label"]')!
}

describe('OASLabel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 <label part="label"> 与 slot 文本', () => {
    const el = mountLabel()
    expect(el.textContent).toContain('姓名')
    expect(labelEl(el).tagName.toLowerCase()).toBe('label')
    expect(labelEl(el).querySelector('slot')).not.toBeNull()
  })

  it('for 属性同步到原生 label', () => {
    const el = mountLabel({ for: 'name-input' })
    expect(labelEl(el).getAttribute('for')).toBe('name-input')
  })

  it('点击代理聚焦 for 指向的控件', () => {
    const input = document.createElement('input')
    input.id = 'name-input'
    document.body.appendChild(input)
    const el = mountLabel({ for: 'name-input' })
    labelEl(el).click()
    expect(document.activeElement).toBe(input)
  })

  it('无 for 时点击不报错、无焦点代理', () => {
    const el = mountLabel()
    expect(() => labelEl(el).click()).not.toThrow()
    expect(document.activeElement).toBe(document.body)
  })

  it('required 追加 * 标记（aria-hidden）', () => {
    const el = mountLabel({ required: '' })
    const marker = el.shadowRoot!.querySelector('[part="required"]')
    expect(marker).not.toBeNull()
    expect(marker!.getAttribute('aria-hidden')).toBe('true')
    expect(marker!.textContent).toBe('*')
    expect(marker!.hasAttribute('hidden')).toBe(false)
  })

  it('无 required 时 * 标记隐藏', () => {
    const el = mountLabel()
    const marker = el.shadowRoot!.querySelector('[part="required"]')
    expect(marker!.hasAttribute('hidden')).toBe(true)
  })

  it('position="before" 时星号前置（reverse 布局类）', () => {
    const before = mountLabel({ required: '', position: 'before' })
    expect(labelEl(before).classList.contains('reverse')).toBe(true)
    const after = mountLabel({ required: '' })
    expect(labelEl(after).classList.contains('reverse')).toBe(false)
  })

  it('长文本换行不溢出（break 类）', () => {
    const el = mountLabel({}, '这是一段特别长的标签文案，用于验证长文本换行不溢出容器边界。')
    expect(labelEl(el).classList.contains('wrap')).toBe(true)
  })
})
