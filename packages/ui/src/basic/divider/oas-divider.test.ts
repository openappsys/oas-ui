import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDivider } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '分割'): OASDivider {
  const el = new OASDivider()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function line(el: OASDivider): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.divider')
}

describe('OASDivider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认水平分割线：role=separator 且 aria-orientation=horizontal', async () => {
    const el = mount({}, '')
    const d = line(el)!
    await Promise.resolve()
    expect(d.getAttribute('role')).toBe('separator')
    expect(d.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('direction=vertical 切换竖线', () => {
    const el = mount({ direction: 'vertical' }, '')
    const d = line(el)!
    expect(d.getAttribute('aria-orientation')).toBe('vertical')
  })

  it('有内容时两侧留线，content-position 控制位置', () => {
    const el = mount({ 'content-position': 'left' }, '标题')
    const d = line(el)!
    expect(el.textContent).toContain('标题')
    expect(d.classList.contains('left')).toBe(true)
  })

  it('dashed 属性加虚线样式类', () => {
    const el = mount({ dashed: '' }, '')
    expect(line(el)!.classList.contains('dashed')).toBe(true)
  })

  it('属性变化增量更新：切换 direction 即时生效', () => {
    const el = mount({}, '')
    const d = line(el)!
    el.setAttribute('direction', 'vertical')
    expect(d).toBe(line(el))
    expect(d.getAttribute('aria-orientation')).toBe('vertical')
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASDivider, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、DOM 引用保持、update 照常同步 aria-orientation、指纹移除', () => {
      const el = new OASDivider()
      el.setAttribute('direction', 'vertical')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-divider')
      const d = el.shadowRoot!.querySelector('.divider')!
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.divider')).toBe(d)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // update() 照常执行：direction 同步到 aria-orientation
      expect(d.getAttribute('aria-orientation')).toBe('vertical')
      el.remove()
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASDivider()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-tag')
      const pre = el.shadowRoot!.querySelector('.divider')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.divider')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
