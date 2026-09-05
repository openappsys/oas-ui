import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSkeletonItem } from './index.js'

function mountItem(attrs: Record<string, string> = {}): OASSkeletonItem {
  const el = new OASSkeletonItem()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function indicator(el: OASSkeletonItem): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
}

describe('OASSkeletonItem', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('注册为 oas-skeleton-item（与 oas-skeleton 同目录子组件）', () => {
    expect(customElements.get('oas-skeleton-item')).toBe(OASSkeletonItem)
  })

  it('默认 type=text', () => {
    const el = mountItem()
    expect(indicator(el).getAttribute('data-type')).toBe('text')
  })

  it('七种类型各自映射 data-type（text/title/avatar/button/input/image/rect）', () => {
    for (const t of ['text', 'title', 'avatar', 'button', 'input', 'image', 'rect']) {
      const el = mountItem({ type: t })
      expect(indicator(el).getAttribute('data-type'), `type=${t}`).toBe(t)
      el.remove()
    }
  })

  it('非法 type 回落 text', () => {
    const el = mountItem({ type: 'circle' })
    expect(indicator(el).getAttribute('data-type')).toBe('text')
  })

  it('挂载后切换 type 增量生效', () => {
    const el = mountItem({ type: 'text' })
    el.setAttribute('type', 'avatar')
    expect(indicator(el).getAttribute('data-type')).toBe('avatar')
  })

  it('width/height 内联样式覆盖各 type 默认尺寸', () => {
    const el = mountItem({ type: 'image', width: '240px', height: '120px' })
    expect(indicator(el).style.width).toBe('240px')
    expect(indicator(el).style.height).toBe('120px')
  })

  it('移除 width/height 后内联样式清空（回落 type 默认）', () => {
    const el = mountItem({ type: 'rect', width: '50%', height: '8px' })
    el.removeAttribute('width')
    el.removeAttribute('height')
    expect(indicator(el).style.width).toBe('')
    expect(indicator(el).style.height).toBe('')
  })

  it('effect 默认 none，sheen/pulse 生效，非法回落 none', () => {
    expect(indicator(mountItem()).getAttribute('data-effect')).toBe('none')
    expect(indicator(mountItem({ effect: 'sheen' })).getAttribute('data-effect')).toBe('sheen')
    expect(indicator(mountItem({ effect: 'pulse' })).getAttribute('data-effect')).toBe('pulse')
    expect(indicator(mountItem({ effect: 'blink' })).getAttribute('data-effect')).toBe('none')
  })

  it('装饰性占位 aria-hidden="true"', () => {
    const el = mountItem()
    expect(indicator(el).getAttribute('aria-hidden')).toBe('true')
  })
})
