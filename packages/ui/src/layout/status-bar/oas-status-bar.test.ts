import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASStatusBar } from './index.js'

function mount(attrs: Record<string, string> = {}, content = ''): OASStatusBar {
  const el = new OASStatusBar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.textContent = content
  document.body.appendChild(el)
  return el
}

function styleText(el: OASStatusBar): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASStatusBar 基础渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 shadow 骨架与插槽', () => {
    const el = mount({}, '9:41')
    expect(el.shadowRoot!.querySelector('[part="area"]')?.tagName).toBe('DIV')
    expect(el.shadowRoot!.querySelector('slot:not([name])')?.tagName).toBe('SLOT')
    expect(el.textContent).toBe('9:41')
  })

  it('默认高度读取顶部安全区 env，背景默认透明', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('env(safe-area-inset-top')
    expect(css).toContain('--oas-status-bar-bg, transparent')
    expect(css).toContain(':host([hidden])')
  })
})

describe('OASStatusBar 高度覆盖', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('纯数字按 px，CSS 长度原样', () => {
    const el = mount({ height: '44' })
    expect(el.style.getPropertyValue('--oas-status-bar-height')).toBe('44px')
    el.setAttribute('height', '1.5rem')
    expect(el.style.getPropertyValue('--oas-status-bar-height')).toBe('1.5rem')
  })

  it('非法高度忽略并告警一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ height: 'oops-height-xyz' })
    expect(el.style.getPropertyValue('--oas-status-bar-height')).toBe('')
    el.setAttribute('height', 'oops-height-xyz')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('移除 height 恢复 env 兜底', () => {
    const el = mount({ height: '44' })
    el.removeAttribute('height')
    expect(el.style.getPropertyValue('--oas-status-bar-height')).toBe('')
  })
})

describe('OASStatusBar 前景色覆盖（ui-spec §4.1）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('11 预设名解析为 -text 安全档 token', () => {
    const el = mount({ color: 'blue' })
    expect(el.style.getPropertyValue('--oas-status-bar-color')).toBe('var(--oas-preset-blue-text)')
    el.setAttribute('color', 'purple')
    expect(el.style.getPropertyValue('--oas-status-bar-color')).toBe('var(--oas-preset-purple-text)')
  })

  it('任意 CSS 色值原样注入', () => {
    const el = mount({ color: '#ffffff' })
    expect(el.style.getPropertyValue('--oas-status-bar-color')).toBe('#ffffff')
    el.setAttribute('color', 'rgba(255, 255, 255, 0.8)')
    expect(el.style.getPropertyValue('--oas-status-bar-color')).toBe('rgba(255, 255, 255, 0.8)')
  })

  it('移除 color 恢复 token 默认（变量清除）', () => {
    const el = mount({ color: 'blue' })
    el.removeAttribute('color')
    expect(el.style.getPropertyValue('--oas-status-bar-color')).toBe('')
  })
})
