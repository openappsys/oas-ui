import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASText, OASTitle, OASParagraph } from './index.js'

function mount<T extends HTMLElement>(
  Ctor: new () => T,
  attrs: Record<string, string> = {},
  slot = '文本',
): T {
  const el = new Ctor()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

describe('OAS typography', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
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

  it('locale：复制按钮文案随 setLocale 切换', async () => {
    const el = mount(OASText, { copyable: '' }, '可复制内容')
    await Promise.resolve()
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn.textContent).toBe('复制')
    expect(btn.getAttribute('aria-label')).toBe('复制')

    setLocale(en)
    expect(btn.textContent).toBe('Copy')
    expect(btn.getAttribute('aria-label')).toBe('Copy')

    setLocale('zh-CN')
    expect(btn.textContent).toBe('复制')
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith<T extends HTMLElement>(el: T, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('oas-text：接管后节点引用保持、copyable 事件已绑定、type 同步到 class', async () => {
      const el = new OASText()
      el.setAttribute('copyable', '')
      el.setAttribute('type', 'secondary')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-text')
      const span = el.shadowRoot!.querySelector('span')!
      const copyBtn = el.shadowRoot!.querySelector('button')!
      el.textContent = '正文'
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('span')).toBe(span)
      expect(el.shadowRoot!.querySelector('button')).toBe(copyBtn)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // update() 照常：type 同步 class
      expect(span.classList.contains('secondary')).toBe(true)
      // copyable 事件已绑定
      let fired = 0
      el.addEventListener('oas-copy', () => fired++)
      copyBtn.click()
      await Promise.resolve()
      await Promise.resolve()
      expect(fired).toBe(1)
    })

    it('oas-title：level 映射的标题元素在水合时不被重建', () => {
      const el = new OASTitle()
      el.setAttribute('level', '2')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-title')
      const h2 = el.shadowRoot!.querySelector('h2')!
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('h2')).toBe(h2)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })

    it('指纹 tag 不匹配：oas-paragraph 回退 render() 重建', () => {
      const el = new OASParagraph()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-text')
      const pre = el.shadowRoot!.querySelector('p')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('p')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
