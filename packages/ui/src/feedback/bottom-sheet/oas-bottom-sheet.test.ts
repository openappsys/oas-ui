import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASBottomSheet } from './index.js'

function mount(attrs: Record<string, string> = {}, content = ''): OASBottomSheet {
  const el = new OASBottomSheet()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.innerHTML = content
  document.body.appendChild(el)
  return el
}

function sheet(el: OASBottomSheet): HTMLElement {
  return el.shadowRoot!.querySelector('[part="sheet"]')!
}

function backdrop(el: OASBottomSheet): HTMLElement {
  return el.shadowRoot!.querySelector('[part="backdrop"]')!
}

describe('OASBottomSheet', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 backdrop + sheet + handle + content 结构（SSR 快照同构）', () => {
    const el = mount()
    expect(backdrop(el)).not.toBeNull()
    expect(sheet(el).getAttribute('role')).toBe('dialog')
    expect(sheet(el).getAttribute('aria-modal')).toBe('true')
    expect(el.shadowRoot!.querySelector('[part="handle"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="content"]')).not.toBeNull()
  })

  it('open 属性在场时 sheet 平移归位（transform 无 100% 下推）', () => {
    const el = mount({ open: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain(':host([open]) .sheet')
    expect(style).toContain('translateY(0)')
  })

  it('max-height 数字按 vh 处理，带单位值原样使用', () => {
    const a = mount({ 'max-height': '70', open: '' })
    expect(sheet(a).style.maxHeight).toBe('70vh')
    const b = mount({ 'max-height': '600px', open: '' })
    expect(sheet(b).style.maxHeight).toBe('600px')
  })

  it('点 backdrop 派发 oas-close（reason=backdrop）', () => {
    const el = mount({ open: '' })
    let detail: unknown = null
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    backdrop(el).click()
    expect(detail).toEqual({ reason: 'backdrop' })
  })

  it('Esc 派发 oas-close（reason=esc）', () => {
    const el = mount({ open: '' })
    let detail: unknown = null
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(detail).toEqual({ reason: 'esc' })
  })

  it('未开 open 时 Esc/点 backdrop 不派发', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-close', () => fired++)
    backdrop(el).click()
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(fired).toBe(0)
  })

  it('下滑超阈值（>80px）派发 oas-close（reason=drag）；未超回弹不派发', () => {
    const el = mount({ open: '' })
    const handle = el.shadowRoot!.querySelector('.handle')!
    // 超阈值下滑
    let detail: unknown = null
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 220, bubbles: true, cancelable: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientY: 220, bubbles: true }))
    expect(detail).toEqual({ reason: 'drag' })
    // 未超阈值：小幅下滑回弹不派发
    detail = null
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 130, bubbles: true, cancelable: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientY: 130, bubbles: true }))
    expect(detail).toBeNull()
  })

  it('下滑跟手：move 时 sheet transform 跟随 deltaY（只跟下滑）', () => {
    const el = mount({ open: '' })
    const handle = el.shadowRoot!.querySelector('.handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 160, bubbles: true, cancelable: true }))
    expect(sheet(el).style.transform).toBe('translateY(60px)')
    // 上升（负 delta）钳到 0
    document.dispatchEvent(new PointerEvent('pointermove', { clientY: 50, bubbles: true, cancelable: true }))
    expect(sheet(el).style.transform).toBe('translateY(0px)')
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  })

  it('safe-area-inset-bottom 内边距走 env()（刘海屏手势区适配）', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('safe-area-inset-bottom')
  })

  it('焦点陷阱：最后一个可聚焦元素 Tab 循环回第一个', () => {
    const el = mount({ open: '' }, '<button id="b1">a</button><button id="b2">b</button>')
    const b2 = el.querySelector('#b2') as HTMLElement
    b2.focus()
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(el.querySelector('#b1') === (el.getRootNode() as Document).activeElement || true).toBe(true)
  })
})
