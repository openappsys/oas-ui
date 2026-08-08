import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASColorPicker } from './index.js'

function mount(attrs: Record<string, string> = {}): OASColorPicker {
  const el = new OASColorPicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASColorPicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function open(el: OASColorPicker): void {
  trigger(el).click()
}

describe('OASColorPicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger，aria-label=颜色选择器，默认色板', async () => {
    const el = mount()
    await Promise.resolve()
    expect(trigger(el).getAttribute('aria-label')).toBe('颜色选择器')
    expect(el.shadowRoot!.querySelector('.hex-text')!.textContent).toBe('#0066ff')
  })

  it('value 驱动色块与 hex 文本', () => {
    const el = mount({ value: '#ff0000' })
    expect(el.shadowRoot!.querySelector('.hex-text')!.textContent).toBe('#ff0000')
  })

  it('点击展开面板，aria-expanded 同步', () => {
    const el = mount()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('open')).toBe(true)
  })

  it('点击预设色提交并派发 oas-change', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const presets = el.shadowRoot!.querySelectorAll('.preset')
    expect(presets.length).toBeGreaterThan(0)
    ;(presets[1] as HTMLButtonElement).click()
    expect(el.getAttribute('value')).toBe('#16a34a')
    expect(detail).toEqual({ value: '#16a34a' })
  })

  it('RGB 输入改变颜色', () => {
    const el = mount({ value: '#000000' })
    open(el)
    const r = el.shadowRoot!.querySelector<HTMLInputElement>('.r')!
    r.value = '255'
    r.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelector('.hex-text')!.textContent).toBe('#ff0000')
  })

  it('↑↓ 调亮度并派发 oas-change', () => {
    const el = mount({ value: '#808080' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(el.getAttribute('value')).toBe('#868686')
    expect(detail).toEqual({ value: '#868686' })
  })

  it('Esc 关闭面板', () => {
    const el = mount()
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('外部点击关闭面板', () => {
    const el = mount()
    open(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 时不可展开且不可调色', () => {
    const el = mount({ disabled: '', value: '#0066ff' })
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(el.getAttribute('value')).toBe('#0066ff')
  })

  it('preset 属性（JSON）覆盖预设色板', () => {
    const el = mount({ preset: '["#111111","#222222","#333333"]' })
    open(el)
    const presets = el.shadowRoot!.querySelectorAll('.preset')
    expect(presets.length).toBe(3)
  })
})
