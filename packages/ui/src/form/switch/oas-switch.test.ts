import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSwitch } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSwitch {
  const el = new OASSwitch()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function sw(el: OASSwitch): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

describe('OASSwitch', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 button 且 role=switch，aria-checked 随 checked 同步', async () => {
    const el = mount({ checked: '' })
    const btn = sw(el)
    await Promise.resolve()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('role')).toBe('switch')
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('点击切换状态并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    sw(el).click()
    expect(detail).toEqual({ checked: true })
    expect(el.hasAttribute('checked')).toBe(true)
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('disabled 不可点击', () => {
    const el = mount({ disabled: '', checked: '' })
    sw(el).click()
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('loading 显示 spinner 且禁止切换', () => {
    const el = mount({ loading: '', checked: '' })
    expect(sw(el).querySelector('.spinner')).not.toBeNull()
    sw(el).click()
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('属性变化增量更新：改 checked 同步 aria-checked 且不重建引用', () => {
    const el = mount()
    const btn = sw(el)
    el.setAttribute('checked', '')
    expect(sw(el)).toBe(btn)
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })
})
