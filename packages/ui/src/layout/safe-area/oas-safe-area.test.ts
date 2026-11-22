import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASSafeArea } from './index.js'

function mount(attrs: Record<string, string> = {}, content = ''): OASSafeArea {
  const el = new OASSafeArea()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.textContent = content
  document.body.appendChild(el)
  return el
}

function styleText(el: OASSafeArea): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASSafeArea 基础渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 shadow 骨架与默认插槽', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="area"]')?.tagName).toBe('DIV')
    expect(el.shadowRoot!.querySelector('slot:not([name])')?.tagName).toBe('SLOT')
  })

  it('默认读取底部安全区 env', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('env(safe-area-inset-bottom')
    expect(css).toContain('--oas-safe-area-inset')
  })

  it('position="top" 读取顶部安全区 env', () => {
    const el = mount({ position: 'top' })
    expect(styleText(el)).toContain(":host([position='top'])")
    expect(styleText(el)).toContain('env(safe-area-inset-top')
  })

  it('宿主 hidden 有样式兜底', () => {
    const el = mount()
    expect(styleText(el)).toContain(':host([hidden])')
  })

  it('默认插槽内容保留（装饰点等）', () => {
    const el = mount({}, '•')
    expect(el.textContent).toBe('•')
  })
})

describe('OASSafeArea size 覆盖', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('纯数字按 px 写入变量', () => {
    const el = mount({ size: '12' })
    expect(el.style.getPropertyValue('--oas-safe-area-size')).toBe('12px')
  })

  it('CSS 长度原样写入', () => {
    const el = mount({ size: '1rem' })
    expect(el.style.getPropertyValue('--oas-safe-area-size')).toBe('1rem')
    el.setAttribute('size', '24px')
    expect(el.style.getPropertyValue('--oas-safe-area-size')).toBe('24px')
    el.setAttribute('size', 'calc(10px + 2px)')
    expect(el.style.getPropertyValue('--oas-safe-area-size')).toBe('calc(10px + 2px)')
  })

  it('移除 size 后恢复 env 兜底', () => {
    const el = mount({ size: '12' })
    el.removeAttribute('size')
    expect(el.style.getPropertyValue('--oas-safe-area-size')).toBe('')
  })

  it('非法 size 忽略并告警一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'not-a-length-xyz' })
    expect(el.style.getPropertyValue('--oas-safe-area-size')).toBe('')
    el.setAttribute('size', 'not-a-length-xyz')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
