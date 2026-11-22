import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASOffline } from './index.js'

function mount(attrs: Record<string, string> = {}): OASOffline {
  const el = new OASOffline()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

/** happy-dom 的 navigator.onLine 可写；用 getter 覆写后事件驱动才可信 */
function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value })
}

function styleText(el: OASOffline): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASOffline 初始状态与首帧', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setNavigatorOnline(true)
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setNavigatorOnline(true)
  })

  it('在线时宿主无离线标记（首帧即隐藏）', () => {
    const el = mount()
    expect(el.hasAttribute('data-offline')).toBe(false)
    expect(styleText(el)).toContain(':host(:not([data-offline]))')
  })

  it('初始离线时首帧即带离线标记，不先显示在线态', () => {
    setNavigatorOnline(false)
    const el = mount()
    // 挂载后同步即完成判定（无「先在线、后改判」的中间帧）
    expect(el.hasAttribute('data-offline')).toBe(true)
  })

  it('离线态默认文案走 i18n，恢复在线自动隐藏', () => {
    setNavigatorOnline(false)
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toMatch(/网络|network/i)
    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))
    expect(el.hasAttribute('data-offline')).toBe(false)
  })

  it('离线时提示条带 role=status 与 polite 活区', () => {
    setNavigatorOnline(false)
    const el = mount()
    const bar = el.shadowRoot!.querySelector('[part="bar"]')!
    expect(bar.getAttribute('role')).toBe('status')
    expect(bar.getAttribute('aria-live')).toBe('polite')
    expect(bar.getAttribute('aria-atomic')).toBe('true')
  })
})

describe('OASOffline 网络事件与自定义文案', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setNavigatorOnline(true)
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setNavigatorOnline(true)
  })

  it('offline 事件进入断网态并派发 oas-offline', () => {
    const el = mount()
    const handler = vi.fn()
    el.addEventListener('oas-offline', handler)
    setNavigatorOnline(false)
    window.dispatchEvent(new Event('offline'))
    expect(el.hasAttribute('data-offline')).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('online 事件恢复并派发 oas-online', () => {
    setNavigatorOnline(false)
    const el = mount()
    const handler = vi.fn()
    el.addEventListener('oas-online', handler)
    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))
    expect(el.hasAttribute('data-offline')).toBe(false)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('事件状态未变化时不重复派发', () => {
    const el = mount()
    const handler = vi.fn()
    el.addEventListener('oas-online', handler)
    window.dispatchEvent(new Event('online'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('message 属性覆盖默认文案并随属性更新', () => {
    setNavigatorOnline(false)
    const el = mount({ message: '自定义断网提示' })
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('自定义断网提示')
    el.setAttribute('message', '第二条提示')
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('第二条提示')
  })

  it('variant=block / bar 分别对应文档流与固定条样式', () => {
    setNavigatorOnline(false)
    const block = mount({ variant: 'block' })
    const css = styleText(block)
    expect(css).toContain(":host([variant='block'])")
    expect(css).toContain('position: static')
    block.setAttribute('variant', 'bar')
    expect(styleText(block)).toContain(":host([variant='bar'])")
    expect(styleText(block)).toContain('position: fixed')
  })

  it('未知 variant 按默认 bar 渲染并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setNavigatorOnline(false)
    const el = mount({ variant: 'bogus-xyz' })
    expect(el.getAttribute('variant')).toBe('bogus-xyz')
    el.setAttribute('variant', 'bogus-xyz')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
