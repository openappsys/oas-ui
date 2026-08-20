import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASCode } from './index.js'

const JS_SRC = `const msg = 'hi'\nfunction add(a, b) {\n  return a + b // 求和\n}\n`

function mount(attrs: Record<string, string> = {}): OASCode {
  const el = new OASCode()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function codeEl(el: OASCode): HTMLElement {
  return el.shadowRoot!.querySelector('[part="code"]')!
}

describe('OASCode', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.restoreAllMocks()
  })

  it('渲染代码并转义 HTML（防注入）', () => {
    const el = mount({ code: '<script>alert(1)</script>' })
    const code = codeEl(el)
    expect(code.innerHTML).toContain('&lt;script&gt;')
    expect(code.querySelector('script')).toBeNull()
  })

  it('js 语言高亮关键字/字符串/注释', () => {
    const el = mount({ code: JS_SRC, language: 'js' })
    const code = codeEl(el)
    expect(code.querySelector('.tok-keyword')).not.toBeNull()
    expect(code.querySelector('.tok-string')).not.toBeNull()
    expect(code.querySelector('.tok-comment')).not.toBeNull()
  })

  it('未知语言按纯文本渲染，不报错', () => {
    const el = mount({ code: 'hello world', language: 'unknown-lang' })
    const code = codeEl(el)
    expect(code.textContent).toBe('hello world')
    expect(code.querySelector('.tok-keyword')).toBeNull()
  })

  it('show-line-number 显示行号（aria-hidden）', () => {
    const el = mount({ code: 'a\nb\nc', 'show-line-number': '' })
    const lines = el.shadowRoot!.querySelectorAll('[part="line"]')
    expect(lines.length).toBe(3)
    const ln = el.shadowRoot!.querySelector('[part="line-number"]')!
    expect(ln.textContent).toBe('1')
    expect(ln.getAttribute('aria-hidden')).toBe('true')
  })

  it('默认不显示行号', () => {
    const el = mount({ code: 'a\nb' })
    expect(el.shadowRoot!.querySelector('[part="line-number"]')).toBeNull()
  })

  it('复制按钮默认显示，copyable=false 隐藏', () => {
    const el = mount({ code: 'hi' })
    expect(el.shadowRoot!.querySelector('[part="copy"]')).not.toBeNull()
    el.setAttribute('copyable', 'false')
    expect(el.shadowRoot!.querySelector('[part="copy"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('点击复制 emit oas-copy，含原始 code', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    const el = mount({ code: 'const a = 1' })
    const copyEvent = new Promise<CustomEvent>((res) =>
      el.addEventListener('oas-copy', res as EventListener),
    )
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="copy"]')!.click()
    const evt = await copyEvent
    expect((evt.detail as { text: string }).text).toBe('const a = 1')
  })

  it('复制失败 emit oas-copy-error', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    const el = mount({ code: 'x' })
    const errEvent = new Promise<CustomEvent>((res) =>
      el.addEventListener('oas-copy-error', res as EventListener),
    )
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="copy"]')!.click()
    const evt = await errEvent
    expect((evt.detail as { text: string }).text).toBe('x')
  })

  it('复制按钮文案走 i18n', () => {
    const el = mount({ code: 'x' })
    expect(el.shadowRoot!.querySelector('[part="copy"]')!.textContent).toBe('复制')
    setLocale(en)
    expect(el.shadowRoot!.querySelector('[part="copy"]')!.textContent).toBe('Copy')
  })

  it('json/html 语言分别高亮', () => {
    const jsonEl = mount({ code: '{"a": 1}', language: 'json' })
    expect(jsonEl.shadowRoot!.querySelector('.tok-string')).not.toBeNull()
    const htmlEl = mount({ code: '<div class="x">hi</div>', language: 'html' })
    expect(htmlEl.shadowRoot!.querySelector('.tok-tag')).not.toBeNull()
  })

  it('code 变化增量更新内容', () => {
    const el = mount({ code: 'aaa', language: 'js' })
    const code = codeEl(el)
    el.setAttribute('code', 'const b = 2')
    expect(code).toBe(codeEl(el))
    expect(code.querySelector('.tok-keyword')).not.toBeNull()
  })

  describe('inline 行内代码', () => {
    it('inline 进入 observedAttributes', () => {
      expect(OASCode.observedAttributes).toContain('inline')
    })

    it('inline 渲染行内代码（块级容器隐藏，inline 元素显示）', () => {
      const el = mount({ code: 'const a = 1', inline: '' })
      const block = el.shadowRoot!.querySelector('.block') as HTMLElement
      const inline = el.shadowRoot!.querySelector('.inline') as HTMLElement
      expect(block.hidden).toBe(true)
      expect(inline.hidden).toBe(false)
    })

    it('inline + language 仍高亮', () => {
      const el = mount({ code: 'const a = 1', language: 'js', inline: '' })
      expect(el.shadowRoot!.querySelector('.tok-keyword')).not.toBeNull()
    })
  })

  describe('word-wrap 换行', () => {
    it('word-wrap 进入 observedAttributes', () => {
      expect(OASCode.observedAttributes).toContain('word-wrap')
    })

    it('word-wrap 时 line-code 换行（white-space: pre-wrap）', () => {
      const el = mount({ code: 'a'.repeat(200), 'word-wrap': '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.block\.word-wrap\s+[^{]*\{[^}]*white-space:\s*pre-wrap/)
    })

    it('缺省不换行（无 word-wrap class）', () => {
      const el = mount({ code: 'x' })
      const block = el.shadowRoot!.querySelector('.block')!
      expect(block.classList.contains('word-wrap')).toBe(false)
    })
  })

  describe('trim 去首尾空白', () => {
    it('trim 进入 observedAttributes', () => {
      expect(OASCode.observedAttributes).toContain('trim')
    })

    it('默认 trim（首尾空白去除）', () => {
      const el = mount({ code: '\n  const a = 1\n  ' })
      const code = codeEl(el)
      expect(code.textContent!.trim()).toBe('const a = 1')
    })

    it('trim="false" 保留首尾空白', () => {
      const el = mount({ code: '\n  const a = 1\n  ', trim: 'false' })
      const code = codeEl(el)
      expect(code.textContent).toContain('\n')
    })
  })

  describe('size 档位（inline 语境）', () => {
    it('size 进入 observedAttributes', () => {
      expect(OASCode.observedAttributes).toContain('size')
    })

    it('size 四档映射 class（缺省 medium 零回归）', () => {
      for (const s of ['xs', 'small', 'large'] as const) {
        const el = mount({ code: 'x', inline: '', size: s })
        expect(el.shadowRoot!.querySelector('.inline')!.classList.contains(s)).toBe(true)
        el.remove()
      }
      const md = mount({ code: 'x', inline: '' })
      expect(md.shadowRoot!.querySelector('.inline')!.classList.contains('small')).toBe(false)
    })

    it('非法值回落 medium 并告警', () => {
      const el = mount({ code: 'x', inline: '', size: 'xxl' })
      expect(el.shadowRoot!.querySelector('.inline')!.classList.contains('xs')).toBe(false)
    })
  })

  describe('variant 形态（inline 语境）', () => {
    it('variant 进入 observedAttributes', () => {
      expect(OASCode.observedAttributes).toContain('variant')
    })

    it('variant 四形态映射 class（subtle 默认）', () => {
      for (const v of ['outline', 'plain', 'solid'] as const) {
        const el = mount({ code: 'x', inline: '', variant: v })
        expect(el.shadowRoot!.querySelector('.inline')!.classList.contains(v)).toBe(true)
        el.remove()
      }
      const def = mount({ code: 'x', inline: '' })
      expect(def.shadowRoot!.querySelector('.inline')!.classList.contains('outline')).toBe(false)
    })

    it('非法值回落 subtle 并告警', () => {
      const el = mount({ code: 'x', inline: '', variant: 'wavy' })
      expect(el.shadowRoot!.querySelector('.inline')!.classList.contains('outline')).toBe(false)
    })

    it('CSS：四形态规则存在', () => {
      const el = mount({ code: 'x', inline: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.inline\.outline\s*{/)
      expect(css).toMatch(/\.inline\.plain\s*{/)
      expect(css).toMatch(/\.inline\.solid\s*{/)
    })
  })

  describe('color 属性（统一协议：11 预设名→-text token / 任意 CSS 色值直注入）', () => {
    it('color 进入 observedAttributes', () => {
      expect(OASCode.observedAttributes).toContain('color')
    })

    it('预设名映射 --oas-preset-*-text 达标 token（inline 语境文字色）', () => {
      const el = mount({ code: 'x', inline: '', color: 'geekblue' })
      const inlineEl = el.shadowRoot!.querySelector('.inline') as HTMLElement
      expect(inlineEl.style.getPropertyValue('--oas-code-color')).toBe(
        'var(--oas-preset-geekblue-text)',
      )
    })

    it('任意 CSS 色值直注入（#hex）', () => {
      const el = mount({ code: 'x', inline: '', color: '#0e7490' })
      const inlineEl = el.shadowRoot!.querySelector('.inline') as HTMLElement
      expect(inlineEl.style.getPropertyValue('--oas-code-color')).toBe('#0e7490')
    })

    it('动态切换与移除即时生效', () => {
      const el = mount({ code: 'x', inline: '', color: 'red' })
      const inlineEl = el.shadowRoot!.querySelector('.inline') as HTMLElement
      el.setAttribute('color', '#00b96b')
      expect(inlineEl.style.getPropertyValue('--oas-code-color')).toBe('#00b96b')
      el.removeAttribute('color')
      expect(inlineEl.style.getPropertyValue('--oas-code-color')).toBe('')
    })
  })
})
