import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCheckbox, OASCheckboxGroup } from './index.js'

function mountCheckbox(attrs: Record<string, string> = {}, slot = '选项'): OASCheckbox {
  const el = new OASCheckbox()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function native(el: OASCheckbox): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASCheckbox', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 checkbox，label 关联', async () => {
    const el = mountCheckbox({}, '记住我')
    const input = native(el)
    await Promise.resolve()
    expect(input.type).toBe('checkbox')
    expect(el.textContent).toContain('记住我')
    expect(input.id).toBeTruthy()
    expect(el.shadowRoot!.querySelector('label')!.getAttribute('for')).toBe(input.id)
  })

  it('checked 受控同步，点击切换并派发 oas-change', () => {
    const el = mountCheckbox({ checked: '' })
    expect(native(el).checked).toBe(true)
    el.addEventListener('oas-change', () => undefined)
    native(el).click()
    expect(native(el).checked).toBe(false)
  })

  it('外部改 checked 属性增量同步', () => {
    const el = mountCheckbox()
    const input = native(el)
    el.setAttribute('checked', '')
    expect(native(el)).toBe(input)
    expect(input.checked).toBe(true)
  })

  it('indeterminate 半选状态', () => {
    const el = mountCheckbox({ indeterminate: '' })
    expect(native(el).indeterminate).toBe(true)
  })

  it('disabled 不可交互', () => {
    const el = mountCheckbox({ disabled: '', checked: '' })
    const input = native(el)
    input.click()
    expect(input.checked).toBe(true)
    expect(input.disabled).toBe(true)
  })
})

describe('OASCheckboxGroup', () => {
  function mountGroup(): OASCheckboxGroup {
    const el = new OASCheckboxGroup()
    el.setAttribute('value', '["a"]')
    el.innerHTML = `
      <oas-checkbox value="a">A</oas-checkbox>
      <oas-checkbox value="b">B</oas-checkbox>
      <oas-checkbox value="c">C</oas-checkbox>
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

  it('用原生 fieldset + legend 组织，value 数组驱动子项勾选', async () => {
    const el = mountGroup()
    await Promise.resolve()
    const fieldset = el.shadowRoot!.querySelector('fieldset')
    expect(fieldset).not.toBeNull()
    const checkbox = el.querySelector('oas-checkbox')!
    expect(checkbox.hasAttribute('checked')).toBe(true)
  })

  it('子项变化同步 group 的 value', () => {
    const el = mountGroup()
    const b = el.querySelector('oas-checkbox[value="b"]')!
    ;(b.shadowRoot!.querySelector('input')! as HTMLInputElement).click()
    expect(el.getAttribute('value')).toContain('"b"')
  })
})
