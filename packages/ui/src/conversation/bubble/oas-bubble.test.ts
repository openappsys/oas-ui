import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASBubble } from './index.js'

function mount(inner = '', attrs: Record<string, string> = {}): OASBubble {
  const el = new OASBubble()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

const VARIANTS = ['default', 'secondary', 'muted', 'outline', 'ghost', 'destructive']

describe('OASBubble', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染默认插槽内容与 part=bubble 骨架', () => {
    const el = mount('<p>你好</p>')
    expect(el.shadowRoot!.querySelector('[part="bubble"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="content"]')).not.toBeNull()
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])')!
    expect(slot.assignedNodes().some((n: Node) => (n.textContent ?? '').includes('你好'))).toBe(true)
  })

  it('无内容渲染不报错（纯表面容器，空态合法）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="bubble"]')).not.toBeNull()
  })

  it('六种 variant 全部有 :host([variant=…]) 级 CSS 规则（纯 CSS 消费）', () => {
    const el = mount('<p>x</p>')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    for (const v of VARIANTS) {
      expect(css, `variant=${v} 缺规则`).toContain(`:host([variant="${v}"])`)
    }
  })

  it('颜色全走语义 token（无硬编码色值）', () => {
    const el = mount('<p>x</p>')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 禁止十六进制/rgb 字面色（color-mix 的颜料与透明度除外）
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  it('align=start/end 双侧规则存在且用逻辑布局（RTL 安全）', () => {
    const el = mount('<p>x</p>', { align: 'end' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([align="end"])')
    // 行方向翻转用 flex 逻辑方向（row-reverse），不得出现物理 left/right 边距
    expect(css).not.toMatch(/margin-left:|margin-right:|padding-left:|padding-right:/)
  })

  it('max-width 默认 80% 且走 CSS 变量开口；ghost 放开上限', () => {
    const el = mount('<p>x</p>')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/max-width:\s*var\(--oas-bubble-max-width,\s*80%\)/)
    expect(css).toMatch(/:host\(\[variant="ghost"\]\)[^{]*\{[^}]*max-width:\s*none/)
  })

  it('loading：内容隐藏、打字点显示、aria-busy 反射宿主', async () => {
    const el = mount('<p>长回答</p>')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="typing"]')!.hasAttribute('hidden')).toBe(true)
    el.setAttribute('loading', '')
    expect(el.hasAttribute('aria-busy')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="typing"]')!.hasAttribute('hidden')).toBe(false)
    el.removeAttribute('loading')
    expect(el.hasAttribute('aria-busy')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('loading 态打字点有可读名称（locale：正在输入…）且三点均 aria-hidden', () => {
    const el = mount('<p>x</p>', { loading: '' })
    const typing = el.shadowRoot!.querySelector('[part="typing"]')!
    expect(typing.getAttribute('role')).toBe('status')
    expect(typing.getAttribute('aria-label')).toBe('正在输入…')
    for (const dot of typing.querySelectorAll('span')) {
      expect(dot.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('打字点动画尊重 prefers-reduced-motion', () => {
    const el = mount('<p>x</p>', { loading: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/@keyframes/)
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{[^}]*animation:\s*none/)
  })

  it('observedAttributes 声明 loading；非法 variant/align 不报错', () => {
    expect(OASBubble.observedAttributes).toContain('loading')
    const el = mount('<p>x</p>', { variant: 'neon', align: 'middle' })
    expect(el.shadowRoot!.querySelector('[part="bubble"]')).not.toBeNull()
  })
})
