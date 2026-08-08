import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASButtonGroup } from './index.js'
import '../button/index.js'

function makeButton(value?: string, text = ''): HTMLElement {
  const btn = document.createElement('oas-button')
  if (value != null) btn.setAttribute('value', value)
  btn.textContent = text || value || 'btn'
  return btn
}

function mountGroup(
  attrs: Record<string, string> = {},
  buttons: Array<[string?, string?]> = [['a'], ['b'], ['c']],
): OASButtonGroup {
  const el = new OASButtonGroup()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const [v, t] of buttons) el.appendChild(makeButton(v, t))
  document.body.appendChild(el)
  return el
}

function groupRoot(el: OASButtonGroup): HTMLElement {
  return el.shadowRoot!.querySelector('[part="group"]')!
}

function pressButton(el: OASButtonGroup, value: string): void {
  const btn = el.querySelector(`oas-button[value="${value}"]`)!
  const native = btn.shadowRoot!.querySelector('button')! as HTMLButtonElement
  native.click()
}

function pressButtonAt(el: OASButtonGroup, index: number): void {
  const btn = el.querySelectorAll('oas-button')[index]!
  const native = btn.shadowRoot!.querySelector('button')! as HTMLButtonElement
  native.click()
}

describe('OASButtonGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('容器 role="group" 且带默认 aria-label', () => {
    const el = mountGroup()
    const root = groupRoot(el)
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('aria-label')).toBeTruthy()
  })

  it('aria-label 属性可覆盖默认文案', () => {
    const el = mountGroup({ 'aria-label': '操作组' })
    expect(groupRoot(el).getAttribute('aria-label')).toBe('操作组')
  })

  it('type/size 透传给子按钮', () => {
    const el = mountGroup({ type: 'primary', size: 'large' })
    const btn = el.querySelector('oas-button')!
    expect(btn.getAttribute('type')).toBe('primary')
    expect(btn.getAttribute('size')).toBe('large')
  })

  it('单选：点击派发 oas-change detail { value }，选中项 aria-pressed=true', () => {
    const el = mountGroup({ value: 'a' })
    let detail: unknown
    el.addEventListener('oas-change', (e) => {
      detail = (e as CustomEvent).detail
    })
    pressButton(el, 'b')
    expect(detail).toEqual({ value: 'b' })
    expect(el.getAttribute('value')).toBe('b')
    expect(el.querySelector('oas-button[value="b"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="a"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('单选：点击已选中项不重复派发', () => {
    const el = mountGroup({ value: 'a' })
    let count = 0
    el.addEventListener('oas-change', () => count++)
    pressButton(el, 'a')
    expect(count).toBe(0)
  })

  it('多选：detail { value: [] }，点击切换选中', () => {
    const el = mountGroup({ multiple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e) => {
      detail = (e as CustomEvent).detail
    })
    pressButton(el, 'a')
    expect(detail).toEqual({ value: ['a'] })
    pressButton(el, 'b')
    expect(detail).toEqual({ value: ['a', 'b'] })
    pressButton(el, 'a')
    expect(detail).toEqual({ value: ['b'] })
  })

  it('多选：初始 value 逗号分隔回显选中', () => {
    const el = mountGroup({ multiple: '', value: 'a,b' })
    expect(el.querySelector('oas-button[value="a"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="b"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="c"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('disabled 全组禁用', () => {
    const el = mountGroup({ disabled: '' })
    for (const btn of el.querySelectorAll('oas-button')) {
      expect(btn.hasAttribute('disabled')).toBe(true)
    }
  })

  it('零子按钮空组不报错', () => {
    const el = mountGroup({}, [])
    expect(el.querySelectorAll('oas-button').length).toBe(0)
    expect(groupRoot(el)).not.toBeNull()
  })

  it('无 value 属性的子按钮不参与选值', () => {
    const el = mountGroup({}, [[undefined, '操作']])
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    pressButtonAt(el, 0)
    expect(fired).toBe(false)
    expect(el.querySelector('oas-button')!.hasAttribute('aria-pressed')).toBe(false)
  })
})
