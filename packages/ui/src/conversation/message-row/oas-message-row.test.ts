import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASMessageRow } from './index.js'

function mount(inner = '', attrs: Record<string, string> = {}): OASMessageRow {
  const el = new OASMessageRow()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

const STATUS_TEXT: Record<string, string> = {
  sending: '发送中',
  sent: '已发送',
  delivered: '已送达',
  read: '已读',
  error: '发送失败',
}

describe('OASMessageRow', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染四个插槽（avatar/header/footer + 默认内容），空插槽隐藏', async () => {
    const el = mount('<oas-bubble>hi</oas-bubble>')
    const names = Array.from(el.shadowRoot!.querySelectorAll('slot')).map((s) => s.getAttribute('name'))
    for (const n of ['avatar', 'header', 'footer']) expect(names).toContain(n)
    expect(names).toContain(null)
    for (const part of ['avatar', 'header', 'footer']) {
      expect(el.shadowRoot!.querySelector(`[part="${part}"]`)!.hasAttribute('hidden'), part).toBe(true)
    }
    el.innerHTML = `
      <oas-avatar slot="avatar" size="32">我</oas-avatar>
      <span slot="header">我 · 12:00</span>
      <oas-bubble>内容</oas-bubble>
      <span slot="footer">操作</span>
    `
    await new Promise((r) => setTimeout(r, 0))
    for (const part of ['avatar', 'header', 'footer']) {
      expect(el.shadowRoot!.querySelector(`[part="${part}"]`)!.hasAttribute('hidden'), part).toBe(false)
    }
  })

  it('align=start/end：行方向翻转走 flex 逻辑方向（RTL 安全，无物理方向 CSS）', () => {
    const el = mount('<oas-bubble>x</oas-bubble>', { align: 'end' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([align="end"])')
    expect(css).toMatch(/flex-direction:\s*row-reverse/)
    expect(css).not.toMatch(/margin-left:|margin-right:|padding-left:|padding-right:/)
  })

  it('头像底对齐（长消息贴底通行细节）', () => {
    const el = mount('<oas-bubble>x</oas-bubble>')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/align-items:\s*flex-end/)
  })

  it('status 合法值渲染可见小字（图标 aria-hidden + locale 文本，不靠颜色传达）', () => {
    for (const [state, text] of Object.entries(STATUS_TEXT)) {
      const el = mount('<oas-bubble>x</oas-bubble>', { status: state })
      const status = el.shadowRoot!.querySelector('[part="status"]')!
      expect(status.hasAttribute('hidden'), `status=${state}`).toBe(false)
      expect(status.textContent, `status=${state}`).toContain(text)
      for (const svg of status.querySelectorAll('svg')) {
        expect(svg.getAttribute('aria-hidden')).toBe('true')
      }
    }
  })

  it('error 态用 danger token 色标（文本本身已可见，颜色是增强不是唯一通道）', () => {
    const el = mount('<oas-bubble>x</oas-bubble>', { status: 'error' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/:host\(\[status="error"\]\)/)
    expect(css).toMatch(/--oas-color-danger/)
  })

  it('sending 态图标有旋转动画且尊重 prefers-reduced-motion（.spin 类有对应 scoped 规则）', () => {
    const el = mount('<oas-bubble>x</oas-bubble>', { status: 'sending' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 回归：此前 icon 自带 .spin 类但 STYLE 无规则——sending 图标静止不动（死类）
    expect(css).toMatch(/\.status svg\.spin[^{]*\{[^}]*animation:\s*message-row-spin/)
    expect(css).toMatch(/@keyframes message-row-spin/)
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{[^}]*\.status svg\.spin[^}]*animation:\s*none/)
    const svg = el.shadowRoot!.querySelector('[part="status"] svg')!
    expect(svg.classList.contains('spin'), 'sending 图标带 .spin 类').toBe(true)
  })

  it('status 非法值不渲染状态区；移除属性后状态区隐藏', () => {
    const el = mount('<oas-bubble>x</oas-bubble>', { status: 'weird' })
    expect(el.shadowRoot!.querySelector('[part="status"]')!.hasAttribute('hidden')).toBe(true)
    el.setAttribute('status', 'sent')
    expect(el.shadowRoot!.querySelector('[part="status"]')!.hasAttribute('hidden')).toBe(false)
    el.removeAttribute('status')
    expect(el.shadowRoot!.querySelector('[part="status"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('grouped：与上一条同发送者聚拢时收行间距（CSS 变量开口）', () => {
    const el = mount('<oas-bubble>x</oas-bubble>', { grouped: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/:host\(\[grouped\]\)/)
    expect(css).toMatch(/--oas-message-gap/)
  })

  it('observedAttributes 声明 align/status/grouped', () => {
    for (const a of ['align', 'status', 'grouped']) {
      expect(OASMessageRow.observedAttributes, `缺 ${a}`).toContain(a)
    }
  })

  it('空行渲染不报错', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="row"]')).not.toBeNull()
  })
})
