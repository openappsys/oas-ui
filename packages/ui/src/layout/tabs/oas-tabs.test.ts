import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTabs } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTabs {
  const el = new OASTabs()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  `
  document.body.appendChild(el)
  return el
}

describe('OASTabs', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标签栏，默认激活第一项', () => {
    const el = mount()
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(2)
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('点击标签切换并派发 oas-change', async () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelectorAll('[role="tab"]')[1] as HTMLElement).click()
    expect(detail).toEqual({ value: 'b' })
    expect(el.getAttribute('active')).toBe('b')
  })

  it('左右方向键切换', () => {
    const el = mount()
    el.shadowRoot!.querySelector('[role="tablist"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(el.getAttribute('active')).toBe('b')
  })

  it('懒渲染：未激活面板默认隐藏', () => {
    const el = mount()
    const panels = el.querySelectorAll('oas-tab-panel')
    expect((panels[1] as HTMLElement).hidden).toBe(true)
    expect((panels[0] as HTMLElement).hidden).toBe(false)
  })
})
