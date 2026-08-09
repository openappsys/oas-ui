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
    el.shadowRoot!.querySelector('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
    )
    expect(el.getAttribute('active')).toBe('b')
  })

  it('懒渲染：未激活面板默认隐藏', () => {
    const el = mount()
    const panels = el.querySelectorAll('oas-tab-panel')
    expect((panels[1] as HTMLElement).hidden).toBe(true)
    expect((panels[0] as HTMLElement).hidden).toBe(false)
  })

  it('默认 type=line 为下划线式，无卡片类名', () => {
    const el = mount()
    expect(el.classList.contains('oas-tabs--card')).toBe(false)
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs[0]!.classList.contains('tab--card')).toBe(false)
    expect(tabs[1]!.classList.contains('tab--card')).toBe(false)
  })

  it('type=card 时为卡片式，host 与标签带卡片类名', () => {
    const el = mount({ type: 'card' })
    expect(el.classList.contains('oas-tabs--card')).toBe(true)
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs[0]!.classList.contains('tab--card')).toBe(true)
    expect(tabs[1]!.classList.contains('tab--card')).toBe(true)
  })

  it('type 从 line 切换为 card 时类名同步', () => {
    const el = mount()
    el.setAttribute('type', 'card')
    expect(el.classList.contains('oas-tabs--card')).toBe(true)
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs[0]!.classList.contains('tab--card')).toBe(true)
  })

  it('closable：每个标签渲染关闭按钮（span role=button，非 button 嵌套）', () => {
    const el = mount({ closable: '' })
    const closes = el.shadowRoot!.querySelectorAll('.tab-close')
    expect(closes.length).toBe(2)
    expect(closes[0]!.tagName).toBe('SPAN')
    expect(closes[0]!.getAttribute('role')).toBe('button')
    expect(closes[0]!.getAttribute('aria-label')).toBeTruthy()
  })

  it('closable：点击 × 派发 oas-close detail { key }，不自动移除、不触发切换', () => {
    const el = mount({ closable: '' })
    let detail: unknown
    let changeCount = 0
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', () => changeCount++)
    ;(el.shadowRoot!.querySelectorAll('.tab-close')[0] as HTMLElement).click()
    expect(detail).toEqual({ key: 'a' })
    expect(changeCount).toBe(0)
    expect(el.querySelectorAll('oas-tab-panel').length).toBe(2)
    expect(el.hasAttribute('active')).toBe(false)
  })

  it('closable：关闭按钮支持 Enter / Space 触发 oas-close', () => {
    const el = mount({ closable: '' })
    let keys: unknown[] = []
    el.addEventListener('oas-close', (e: Event) => keys.push((e as CustomEvent).detail.key))
    const close = el.shadowRoot!.querySelector<HTMLElement>('.tab-close')!
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    close.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(keys).toEqual(['a', 'a'])
  })

  it('closable 关闭后外部移除面板，标签栏增量刷新（MutationObserver）', async () => {
    const el = mount({ closable: '' })
    el.querySelector('oas-tab-panel[value="a"]')!.remove()
    // MutationObserver 回调为微任务，先 flush 再断言
    await Promise.resolve()
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(1)
    expect(tabs[0]!.textContent).toContain('标签二')
  })

  it('badge：带 badge 属性的 tab 渲染徽标，未设置的不渲染', () => {
    const el = new OASTabs()
    el.innerHTML = `
      <oas-tab-panel label="标签一" value="a" badge="3"><p>内容一</p></oas-tab-panel>
      <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
      <oas-tab-panel label="标签三" value="c" badge="新"><p>内容三</p></oas-tab-panel>
    `
    document.body.appendChild(el)
    const badges = el.shadowRoot!.querySelectorAll('.tab-badge')
    expect(badges.length).toBe(2)
    expect(badges[0]!.textContent).toBe('3')
    expect(badges[1]!.textContent).toBe('新')
  })

  it('tab-position=left：host 与 tablist 带纵向布局类名', () => {
    const el = mount({ 'tab-position': 'left' })
    expect(el.classList.contains('oas-tabs--vertical')).toBe(true)
    expect(el.classList.contains('oas-tabs--left')).toBe(true)
    expect(el.classList.contains('oas-tabs--right')).toBe(false)
    expect(el.classList.contains('oas-tabs--bottom')).toBe(false)
    expect(el.shadowRoot!.querySelector('[role="tablist"]')!.classList.contains('tablist--vertical')).toBe(true)
  })

  it('tab-position 默认 top，可切换 right / bottom 并同步类名', () => {
    const el = mount()
    expect(el.classList.contains('oas-tabs--vertical')).toBe(false)
    el.setAttribute('tab-position', 'right')
    expect(el.classList.contains('oas-tabs--vertical')).toBe(true)
    expect(el.classList.contains('oas-tabs--right')).toBe(true)
    el.setAttribute('tab-position', 'bottom')
    expect(el.classList.contains('oas-tabs--vertical')).toBe(false)
    expect(el.classList.contains('oas-tabs--bottom')).toBe(true)
    el.setAttribute('tab-position', 'top')
    expect(el.classList.contains('oas-tabs--bottom')).toBe(false)
    expect(el.classList.contains('oas-tabs--vertical')).toBe(false)
  })
})
