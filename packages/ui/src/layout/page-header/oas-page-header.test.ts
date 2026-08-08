import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPageHeader } from './index.js'

describe('OASPageHeader', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与返回按钮', () => {
    const el = new OASPageHeader()
    el.setAttribute('title', '页面标题')
    el.setAttribute('back', '')
    document.body.appendChild(el)
    const sr = el.shadowRoot!
    expect(sr.querySelector('[part="title"]')!.textContent).toBe('页面标题')
    const back = sr.querySelector('[part="back"]')
    expect(back).not.toBeNull()
    // 返回按钮为 SVG chevron 图标按钮（替代文本字符 ‹）
    expect(back!.querySelector('svg')).not.toBeNull()
    expect(back!.getAttribute('aria-label')).toBe('返回')
  })

  it('点击返回派发 oas-back', () => {
    const el = new OASPageHeader()
    el.setAttribute('back', '')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-back', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="back"]') as HTMLElement).click()
    expect(fired).toBe(1)
  })

  it('extra 插槽存在', () => {
    const el = new OASPageHeader()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot[name="extra"]')).not.toBeNull()
  })
})
