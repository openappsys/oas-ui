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
})
