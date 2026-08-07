import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASText, OASTitle, OASParagraph } from './index.js'

function mount<T extends HTMLElement>(Ctor: new () => T, attrs: Record<string, string> = {}, slot = '文本'): T {
  const el = new Ctor()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

describe('OAS typography', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('oas-text 渲染 span，type 映射 class', async () => {
    const el = mount(OASText, { type: 'secondary' }, '正文')
    await Promise.resolve()
    const span = el.shadowRoot!.querySelector('span')!
    expect(span.classList.contains('secondary')).toBe(true)
    expect(el.textContent).toContain('正文')
  })

  it('oas-text ellipsis 加省略类', () => {
    const el = mount(OASText, { ellipsis: '' }, '长文本')
    expect(el.shadowRoot!.querySelector('span')!.classList.contains('ellipsis')).toBe(true)
  })

  it('oas-text copyable 渲染复制按钮并派发 oas-copy', async () => {
    const writeText = () => Promise.resolve()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const el = mount(OASText, { copyable: '' }, '可复制内容')
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('复制')
    let fired = 0
    el.addEventListener('oas-copy', () => fired++)
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(fired).toBe(1)
  })

  it('oas-title level 1-5 映射标题元素', () => {
    const h2 = mount(OASTitle, { level: '2' }, '标题')
    expect(h2.shadowRoot!.querySelector('h2')).not.toBeNull()
    h2.remove()
    const h4 = mount(OASTitle, { level: '4' }, '标题')
    expect(h4.shadowRoot!.querySelector('h4')).not.toBeNull()
  })

  it('oas-paragraph 渲染 p，type 映射 class', () => {
    const el = mount(OASParagraph, { type: 'warning' }, '段落')
    expect(el.shadowRoot!.querySelector('p')!.classList.contains('warning')).toBe(true)
  })
})
