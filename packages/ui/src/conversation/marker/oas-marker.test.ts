import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMarker } from './index.js'

function mount(inner = '', attrs: Record<string, string> = {}): OASMarker {
  const el = new OASMarker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

describe('OASMarker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 icon 槽与内容槽，part=marker 骨架', async () => {
    const el = mount('昨天 18:20')
    expect(el.shadowRoot!.querySelector('[part="marker"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="content"]')).not.toBeNull()
    const icon = document.createElement('span')
    icon.setAttribute('slot', 'icon')
    icon.textContent = '◆'
    el.appendChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="icon"]')!
    expect(slot.assignedNodes()).toContain(icon)
  })

  it('三种 variant 全部有 :host([variant=…]) 级 CSS 规则（纯 CSS 消费）', () => {
    const el = mount('x')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    for (const v of ['default', 'border', 'separator']) {
      expect(css, `variant=${v} 缺规则`).toContain(`:host([variant="${v}"])`)
    }
  })

  it('a11y 纪律：带文字分隔线不得加 role=separator（其可读名会被 aria-label 吞掉）', () => {
    const el = mount('今天', { variant: 'separator' })
    expect(el.getAttribute('role')).toBeNull()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).not.toContain('role')
  })

  it('icon 槽内容按装饰处理：包裹层 aria-hidden', async () => {
    const el = mount('同步中', { role: 'status' })
    const icon = document.createElement('span')
    icon.setAttribute('slot', 'icon')
    el.appendChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('role 透传约定：宿主直接写 role=status 即生效（浏览器原生 ARIA 反射，组件不重复处理）', () => {
    const el = mount('生成中…', { role: 'status' })
    expect(el.getAttribute('role')).toBe('status')
  })

  it('空内容：default/border 变体隐藏整件；separator 保留分隔线本体', async () => {
    const plain = mount()
    await new Promise((r) => setTimeout(r, 0))
    expect(plain.hasAttribute('data-empty'), '空 default data-empty 反射').toBe(true)
    const bordered = mount('', { variant: 'border' })
    await new Promise((r) => setTimeout(r, 0))
    expect(bordered.hasAttribute('data-empty')).toBe(true)
    const sep = mount('', { variant: 'separator' })
    await new Promise((r) => setTimeout(r, 0))
    expect(sep.hasAttribute('data-empty')).toBe(false)
    // 空态收起走 data-empty + scoped CSS，不写宿主 hidden
    expect(plain.hasAttribute('hidden')).toBe(false)
    const css = plain.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/:host\(\[data-empty\]\)/)
  })

  it('宿主显式 hidden 不被组件清除（空态收起不占用宿主 hidden 属性）', async () => {
    const el = mount('有内容', { hidden: '' })
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('hidden'), '有内容 + 宿主 hidden：组件不得清除').toBe(true)
    expect(el.hasAttribute('data-empty')).toBe(false)
    // 内容清空后：data-empty 出现（CSS 收起），宿主 hidden 原样保留
    el.textContent = ''
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('hidden')).toBe(true)
    expect(el.hasAttribute('data-empty')).toBe(true)
  })

  it('颜色全走语义 token（无硬编码色值）', () => {
    const el = mount('x')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  it('observedAttributes 声明 variant；非法值不报错', () => {
    expect(OASMarker.observedAttributes).toContain('variant')
    const el = mount('x', { variant: 'fancy' })
    expect(el.shadowRoot!.querySelector('[part="marker"]')).not.toBeNull()
  })
})
