import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCard } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '<p>卡片内容</p>'): OASCard {
  const el = new OASCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = slot
  document.body.appendChild(el)
  return el
}

function part(el: OASCard, name: string): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!
}

describe('OASCard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与内容', () => {
    const el = mount({ title: '卡片标题' })
    const sr = el.shadowRoot!
    expect(sr.querySelector('[part="title"]')!.textContent).toBe('卡片标题')
    expect(sr.querySelector('slot')).not.toBeNull()
  })

  it('hoverable 时带悬浮阴影类', () => {
    const el = mount({ hoverable: '' })
    expect(part(el, 'card').classList.contains('hoverable')).toBe(true)
  })

  describe('封面 cover', () => {
    it('cover-src 渲染封面图并设 src/alt', () => {
      const el = mount({ 'cover-src': 'https://example.com/pic.jpg' })
      const img = el.shadowRoot!.querySelector<HTMLImageElement>('[part="cover-img"]')!
      expect(img).not.toBeNull()
      expect(img.getAttribute('src')).toBe('https://example.com/pic.jpg')
      expect(part(el, 'cover').hasAttribute('hidden')).toBe(false)
      expect(img.hasAttribute('hidden')).toBe(false)
    })

    it('无封面时 cover 容器隐藏（不占位）', () => {
      const el = mount({})
      expect(part(el, 'cover').hasAttribute('hidden')).toBe(true)
    })

    it('cover 插槽有内容时封面区显示', () => {
      const el = mount({}, '<img slot="cover" src="x.jpg"><p>正文</p>')
      expect(part(el, 'cover').hasAttribute('hidden')).toBe(false)
      expect(
        el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="cover"]')!.hasAttribute('hidden'),
      ).toBe(false)
    })

    it('cover-src 与 cover 插槽同存在时 cover-src 优先', () => {
      const el = mount(
        { 'cover-src': 'https://example.com/a.jpg' },
        '<img slot="cover" src="b.jpg">',
      )
      const img = el.shadowRoot!.querySelector<HTMLImageElement>('[part="cover-img"]')!
      expect(img.hasAttribute('hidden')).toBe(false)
      expect(
        el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="cover"]')!.hasAttribute('hidden'),
      ).toBe(true)
    })
  })

  describe('操作区 actions', () => {
    it('actions 插槽有内容时显示，带分隔线样式', () => {
      const el = mount({}, '<oas-button slot="actions">查看</oas-button><p>正文</p>')
      expect(part(el, 'actions').hasAttribute('hidden')).toBe(false)
    })

    it('无 actions 插槽内容时隐藏', () => {
      const el = mount({})
      expect(part(el, 'actions').hasAttribute('hidden')).toBe(true)
    })
  })

  describe('clickable', () => {
    it('clickable → 宿主 role=button + tabindex=0，可聚焦', () => {
      const el = mount({ clickable: '' })
      expect(el.getAttribute('role')).toBe('button')
      expect(el.getAttribute('tabindex')).toBe('0')
    })

    it('点击整卡派发 oas-click（bubbles + composed），detail 含 originalEvent', () => {
      const el = mount({ clickable: '' })
      let fired = 0
      let detail: unknown
      el.addEventListener('oas-click', (e: Event) => {
        fired++
        detail = e
      })
      el.click()
      expect(fired).toBe(1)
      const ev = detail as CustomEvent
      expect(ev.bubbles).toBe(true)
      expect(ev.composed).toBe(true)
      expect(ev.detail).toHaveProperty('originalEvent')
    })

    it('clickable + Enter/Space 键盘触发 oas-click', () => {
      const el = mount({ clickable: '' })
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(fired).toBe(1)
      fired = 0
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      expect(fired).toBe(1)
    })

    it('非 clickable：无按钮语义、点击不派发 oas-click', () => {
      const el = mount({})
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.click()
      expect(fired).toBe(0)
      expect(el.hasAttribute('role')).toBe(false)
      expect(el.hasAttribute('tabindex')).toBe(false)
    })

    it('clickable：点击操作区内的按钮不触发整卡 oas-click', () => {
      const el = mount({ clickable: '' }, '<button slot="actions">删除</button><p>正文</p>')
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      el.querySelector('button')!.click()
      expect(fired).toBe(0)
    })

    it('clickable 属性移除后恢复普通容器语义', () => {
      const el = mount({ clickable: '' })
      el.removeAttribute('clickable')
      expect(el.hasAttribute('role')).toBe(false)
      expect(el.hasAttribute('tabindex')).toBe(false)
    })
  })

  describe('样式契约（shadow CSS 断言）', () => {
    function styleText(el: OASCard): string {
      return el.shadowRoot!.querySelector('style')!.textContent!
    }

    it('hoverable：悬停阴影 + 指针 + 提升过渡', () => {
      const el = mount({ hoverable: '' })
      const css = styleText(el)
      expect(css).toMatch(/\.card\.hoverable\s*\{[^}]*transition:/)
      expect(css).toMatch(/\.card\.hoverable:hover\s*\{[^}]*box-shadow:/)
      expect(css).toMatch(/\.card\.hoverable:hover\s*\{[^}]*transform:/)
      expect(css).toMatch(/\.card\.hoverable\s*\{[^}]*cursor:\s*pointer/)
    })

    it('clickable：focus-visible 焦点环（--oas-focus-ring）', () => {
      const el = mount({ clickable: '' })
      const css = styleText(el)
      expect(css).toMatch(
        /:host\(\[clickable\]:focus-visible\)\s*\.card\s*\{[^}]*box-shadow:\s*var\(--oas-focus-ring\)/,
      )
    })

    it('封面图自适应裁切：object-fit cover + 全宽', () => {
      const el = mount({})
      const css = styleText(el)
      expect(css).toMatch(/object-fit:\s*cover/)
      expect(css).toMatch(/\.cover-img\s*\{[^}]*width:\s*100%/)
    })

    it('actions 分隔线用 border token', () => {
      const el = mount({})
      const css = styleText(el)
      expect(css).toMatch(
        /\.actions\s*\{[^}]*border-top:\s*1px\s+solid\s+var\(--oas-color-border\)/,
      )
    })
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASCard, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、事件已绑定（含 clickable 的 oas-click）', () => {
      const el = new OASCard()
      el.setAttribute('clickable', '')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-card')
      const cardEl = part(el, 'card')
      el.textContent = '卡片'
      document.body.appendChild(el)

      // 真水合：card 是同一对象（未重建）
      expect(part(el, 'card')).toBe(cardEl)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()

      // host 级 click 已绑定：整卡点击派发 oas-click
      let clickFired = 0
      el.addEventListener('oas-click', () => clickFired++)
      el.click()
      expect(clickFired).toBe(1)
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASCard()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-button')
      const pre = part(el, 'card')
      document.body.appendChild(el)

      expect(part(el, 'card')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
