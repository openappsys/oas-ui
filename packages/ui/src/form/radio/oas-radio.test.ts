import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASRadio, OASRadioGroup } from './index.js'

function mountRadio(attrs: Record<string, string> = {}, slot = '选项'): OASRadio {
  const el = new OASRadio()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function native(el: OASRadio): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASRadio', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 radio，value 属性透传', async () => {
    const el = mountRadio({ value: 'a' }, 'A')
    const input = native(el)
    await Promise.resolve()
    expect(input.type).toBe('radio')
    expect(el.getAttribute('value')).toBe('a')
    expect(el.textContent).toContain('A')
  })

  it('checked 受控同步，点击后选中', () => {
    const el = mountRadio()
    expect(native(el).checked).toBe(false)
    native(el).click()
    expect(native(el).checked).toBe(true)
    expect(el.hasAttribute('checked')).toBe(true)
  })

  it('disabled 不可交互', () => {
    const el = mountRadio({ disabled: '', checked: '' })
    const input = native(el)
    input.click()
    expect(input.checked).toBe(true)
  })

  it('同名 radio 互斥：选中第二个后第一个取消选中', () => {
    const a = mountRadio({ name: 'g', value: 'a' }, 'A')
    const b = mountRadio({ name: 'g', value: 'b' }, 'B')
    native(b).click()
    expect(native(a).checked).toBe(false)
    expect(a.hasAttribute('checked')).toBe(false)
    expect(native(b).checked).toBe(true)
    expect(b.hasAttribute('checked')).toBe(true)
  })

  it('无 name 的 radio 不受同名互斥影响', () => {
    const a = mountRadio({}, 'A')
    const b = mountRadio({ name: 'g', value: 'b' }, 'B')
    native(b).click()
    expect(native(a).checked).toBe(false)
  })
})

describe('OASRadioGroup', () => {
  function mountGroup(): OASRadioGroup {
    const el = new OASRadioGroup()
    el.setAttribute('value', 'a')
    el.innerHTML = `
      <oas-radio value="a">A</oas-radio>
      <oas-radio value="b">B</oas-radio>
    `
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('fieldset 组织，value 驱动子项选中', async () => {
    const el = mountGroup()
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('fieldset')).not.toBeNull()
    const a = el.querySelector('oas-radio[value="a"]')!
    expect(a.hasAttribute('checked')).toBe(true)
  })

  it('选择子项后 group value 更新为该项值', () => {
    const el = mountGroup()
    const b = el.querySelector('oas-radio[value="b"]')!
    ;(b.shadowRoot!.querySelector('input')! as HTMLInputElement).click()
    expect(el.getAttribute('value')).toBe('b')
  })
})
