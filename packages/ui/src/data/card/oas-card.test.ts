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

  it('无 title 且无 extra：header 应设 hidden（逻辑层）', () => {
    const el = mount({}, '<p>卡片内容</p>')
    expect(part(el, 'header').hidden).toBe(true)
  })

  it('header[hidden] CSS 兜底：作者级 .header{display:flex} 不覆盖 hidden 属性（渲染层不空占位）', () => {
    const el = mount({}, '<p>卡片内容</p>')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 与 .cover[hidden] 同款兜底（46-50 行有 cover 先例，header 曾是遗漏）
    expect(css).toMatch(/\.header\[hidden\]\s*\{[^}]*display:\s*none/)
  })

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本（slot 优先渲染）', () => {
      const el = mount({ title: '属性标题' }, '<span slot="title">插槽标题</span><p>正文</p>')
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      // 宿主 title 仍被吸收（吸收状态机不变）
      expect(el.hasAttribute('title')).toBe(false)
      // 标题区有标题语义：不隐藏
      expect(part(el, 'header').hidden).toBe(false)
    })

    it('仅 slot 无属性：标题区渲染 slot 内容且不隐藏', () => {
      const el = mount({}, '<span slot="title">插槽标题</span><p>正文</p>')
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(part(el, 'header').hidden).toBe(false)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('双空（无 title 无 slot）：标题区隐藏逻辑保持', () => {
      const el = mount({}, '<p>正文</p>')
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(part(el, 'header').hidden).toBe(true)
      // 兜底 span 无文本、不隐藏（属性通道空态）
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('')
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = mount({ title: '属性标题' }, '<span slot="title">插槽标题</span>')
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题渲染进标题区', () => {
      const el = mount({ title: '偏好设置' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(part(el, 'title').textContent).toBe('偏好设置')
      expect(part(el, 'header').hidden).toBe(false)
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = mount({ title: '偏好设置' })
      el.setAttribute('data-x', '1')
      expect(part(el, 'title').textContent).toBe('偏好设置')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新标题')
      expect(part(el, 'title').textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图），头部隐藏', () => {
      const el = mount({ title: '偏好设置' })
      el.setAttribute('title', '')
      expect(part(el, 'title').textContent).toBe('')
      expect(part(el, 'header').hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('el.title 属性通道（原生反射到 attribute）同样被吸收', () => {
      const el = mount()
      el.title = '编程式标题'
      expect(part(el, 'title').textContent).toBe('编程式标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title 从无到有动态设置：标题区由隐藏转为渲染（消费式同步，非仅首连读取一次）', () => {
      const el = mount({}, '<p>正文</p>')
      expect(part(el, 'header').hidden).toBe(true)
      el.setAttribute('title', '动态标题')
      expect(part(el, 'header').hidden).toBe(false)
      expect(part(el, 'title').textContent).toBe('动态标题')
      expect(el.hasAttribute('title')).toBe(false)
    })
  })

  it('hoverable 映射为 shadow-hover 悬浮阴影类（兼容别名）', () => {
    const el = mount({ hoverable: '' })
    expect(part(el, 'card').classList.contains('shadow-hover')).toBe(true)
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

    it('clickable：点击正文（事件路径穿过包装锚点）仍派发 oas-click', () => {
      const el = mount({ clickable: '' }, '<p id="t">正文</p>')
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      // 点击 light DOM 正文：composedPath 含 shadow 内的 .card 包装锚点，
      // 包装锚点是卡自身结构，不算「内部交互元素」
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      el.querySelector('#t')!.dispatchEvent(evt)
      expect(fired).toBe(1)
      expect(evt.defaultPrevented).toBe(false)
      // 再从 shadow 内部节点派发（happy-dom 下 light DOM 路径不进 shadow，双路覆盖）
      let fired2 = 0
      el.addEventListener('oas-click', () => fired2++)
      const evt2 = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      el.shadowRoot!.querySelector('[part="body"]')!.dispatchEvent(evt2)
      expect(fired2).toBe(1)
      expect(evt2.defaultPrevented).toBe(false)
    })

    it('href：点击正文不阻止锚点默认导航（包装锚点不算内部交互元素）', () => {
      const el = mount({ href: 'https://example.com' }, '<p id="t">正文</p>')
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      el.querySelector('#t')!.dispatchEvent(evt)
      expect(evt.defaultPrevented).toBe(false)
      const evt2 = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      el.shadowRoot!.querySelector('[part="body"]')!.dispatchEvent(evt2)
      expect(evt2.defaultPrevented).toBe(false)
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

    it('shadow-hover：悬停阴影 + 指针 + 提升过渡（hoverable 映射同一套规则）', () => {
      const el = mount({ hoverable: '' })
      const css = styleText(el)
      expect(css).toMatch(/\.card\.shadow-hover\s*\{[^}]*transition:/)
      expect(css).toMatch(/\.card\.shadow-hover:hover\s*\{[^}]*box-shadow:/)
      expect(css).toMatch(/\.card\.shadow-hover:hover\s*\{[^}]*transform:/)
      expect(css).toMatch(/\.card\.shadow-hover\s*\{[^}]*cursor:\s*pointer/)
    })

    it('shadow-always：常显阴影走 overlay token', () => {
      const el = mount({ shadow: 'always' })
      const css = styleText(el)
      expect(css).toMatch(/\.card\.shadow-always\s*\{[^}]*box-shadow:[^}]*var\(--oas-color-overlay\)/)
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

  describe('loading 骨架屏', () => {
    it('loading：骨架区显示、正文插槽隐藏、宿主 aria-busy', () => {
      const el = mount({ loading: '' })
      expect(part(el, 'skeleton').hasAttribute('hidden')).toBe(false)
      const bodySlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])')!
      expect(bodySlot.hasAttribute('hidden')).toBe(true)
      expect(el.getAttribute('aria-busy')).toBe('true')
    })

    it('非 loading：骨架区隐藏、正文插槽显示', () => {
      const el = mount({})
      expect(part(el, 'skeleton').hasAttribute('hidden')).toBe(true)
      const bodySlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])')!
      expect(bodySlot.hasAttribute('hidden')).toBe(false)
      expect(el.hasAttribute('aria-busy')).toBe(false)
    })

    it('动态切换 loading：骨架显隐跟随', () => {
      const el = mount({})
      el.setAttribute('loading', '')
      expect(part(el, 'skeleton').hasAttribute('hidden')).toBe(false)
      el.removeAttribute('loading')
      expect(part(el, 'skeleton').hasAttribute('hidden')).toBe(true)
    })

    it('骨架样式走 token（底色 --oas-color-bg-hover + 微光动画）', () => {
      const el = mount({ loading: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/var\(--oas-color-bg-hover\)/)
      expect(css).toMatch(/@keyframes\s+oas-card-sk/)
      expect(css).toMatch(/animation:/)
    })
  })

  describe('size 紧凑尺寸', () => {
    it('size="small"：正文/标题区紧凑 padding 与标题字号（CSS 契约）', () => {
      const el = mount({ size: 'small' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[size="small"\]\)\s*\.body\s*\{[^}]*padding:\s*var\(--oas-space-3\)/)
      expect(css).toMatch(
        /:host\(\[size="small"\]\)\s*\.title\s*\{[^}]*font-size:\s*var\(--oas-font-size-md\)/,
      )
    })
  })

  describe('variant 形态', () => {
    it('默认 outlined：宿主带边框 token', () => {
      const el = mount({})
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\s*\{[^}]*border:\s*1px\s+solid\s+var\(--oas-color-border\)/)
    })

    it('variant="borderless"：无边框规则（CSS 契约）', () => {
      const el = mount({ variant: 'borderless' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[variant="borderless"\]\)\s*\{[^}]*border:\s*none/)
    })
  })

  describe('footer 底条', () => {
    it('slot="footer" 有内容时显示，无内容隐藏', () => {
      const el = mount({}, '<p slot="footer">底条说明</p><p>正文</p>')
      expect(part(el, 'footer').hasAttribute('hidden')).toBe(false)
      const empty = mount({})
      expect(part(empty, 'footer').hasAttribute('hidden')).toBe(true)
    })

    it('footer 与 actions 是两个独立底区，可同时存在', () => {
      const el = mount(
        {},
        '<button slot="actions">操作</button><p slot="footer">说明</p><p>正文</p>',
      )
      expect(part(el, 'actions').hasAttribute('hidden')).toBe(false)
      expect(part(el, 'footer').hasAttribute('hidden')).toBe(false)
    })

    it('footer 分隔线用 border token', () => {
      const el = mount({})
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(
        /\.footer\s*\{[^}]*border-top:\s*1px\s+solid\s+var\(--oas-color-border\)/,
      )
    })
  })

  describe('header-bordered 标题分割线', () => {
    it('默认有分割线（header 底部 border）', () => {
      const el = mount({ title: '卡片标题' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.header\s*\{[^}]*border-bottom:\s*1px\s+solid\s+var\(--oas-color-border\)/)
      expect(el.hasAttribute('header-bordered')).toBe(false)
    })

    it('header-bordered="false"：关闭分割线（CSS 契约）', () => {
      const el = mount({ title: '卡片标题', 'header-bordered': 'false' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(
        /:host\(\[header-bordered="false"\]\)\s*\.header\s*\{[^}]*border-bottom:\s*none/,
      )
    })
  })

  describe('shadow 三态与 hoverable 映射', () => {
    it('shadow="always"：常显阴影类', () => {
      const el = mount({ shadow: 'always' })
      expect(part(el, 'card').classList.contains('shadow-always')).toBe(true)
      expect(part(el, 'card').classList.contains('shadow-hover')).toBe(false)
    })

    it('shadow="hover"：悬浮阴影类', () => {
      const el = mount({ shadow: 'hover' })
      expect(part(el, 'card').classList.contains('shadow-hover')).toBe(true)
    })

    it('shadow="none"：无阴影类', () => {
      const el = mount({ shadow: 'none' })
      const card = part(el, 'card')
      expect(card.classList.contains('shadow-hover')).toBe(false)
      expect(card.classList.contains('shadow-always')).toBe(false)
    })

    it('hoverable 无 shadow：映射 shadow-hover（兼容旧用法）', () => {
      const el = mount({ hoverable: '' })
      expect(part(el, 'card').classList.contains('shadow-hover')).toBe(true)
    })

    it('显式 shadow 优先于 hoverable：shadow="none" + hoverable 无阴影', () => {
      const el = mount({ shadow: 'none', hoverable: '' })
      const card = part(el, 'card')
      expect(card.classList.contains('shadow-hover')).toBe(false)
      expect(card.classList.contains('shadow-always')).toBe(false)
    })

    it('运行时切换 shadow 属性：阴影类跟随', () => {
      const el = mount({ shadow: 'always' })
      el.setAttribute('shadow', 'hover')
      expect(part(el, 'card').classList.contains('shadow-hover')).toBe(true)
      expect(part(el, 'card').classList.contains('shadow-always')).toBe(false)
    })
  })

  describe('Meta（avatar + description）', () => {
    it('description 属性渲染副文案到标题下方', () => {
      const el = mount({ title: '成员', description: '前端工程师' })
      expect(part(el, 'description').hasAttribute('hidden')).toBe(false)
      expect(part(el, 'description').textContent).toContain('前端工程师')
    })

    it('slot="description" 覆盖属性文案（双通道，与 title 同款机制）', () => {
      const el = mount(
        { title: '成员', description: '属性文案' },
        '<span slot="description">插槽文案</span><p>正文</p>',
      )
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.desc-text')!
      expect(fallback.hidden).toBe(true)
      const descSlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="description"]')!
      expect(descSlot.assignedNodes().length).toBeGreaterThan(0)
    })

    it('仅 description（无 title/extra）：标题区仍显示', () => {
      const el = mount({ description: '仅副文案' }, '<p>正文</p>')
      expect(part(el, 'header').hidden).toBe(false)
      expect(part(el, 'description').hasAttribute('hidden')).toBe(false)
      expect(part(el, 'title').textContent).toBe('')
    })

    it('description="" 且无插槽：副文案区隐藏', () => {
      const el = mount({ title: '成员', description: '' })
      expect(part(el, 'description').hasAttribute('hidden')).toBe(true)
    })

    it('slot="avatar" 有内容时头像区显示，无内容隐藏', () => {
      const el = mount({}, '<oas-avatar slot="avatar">晓</oas-avatar><p>正文</p>')
      expect(part(el, 'avatar').hasAttribute('hidden')).toBe(false)
      const empty = mount({})
      expect(part(empty, 'avatar').hasAttribute('hidden')).toBe(true)
    })

    it('副文案为次级小字（font-size sm + text-secondary token）', () => {
      const el = mount({ description: '副文案' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.description\s*\{[^}]*font-size:\s*var\(--oas-font-size-sm\)/)
      expect(css).toMatch(/\.description\s*\{[^}]*color:\s*var\(--oas-color-text-secondary\)/)
    })
  })

  describe('href 链接卡', () => {
    it('href：内部锚点带 href，host 不设按钮角色', () => {
      const el = mount({ href: 'https://example.com/doc' })
      const link = el.shadowRoot!.querySelector<HTMLAnchorElement>('[part="link"]')!
      expect(link.getAttribute('href')).toBe('https://example.com/doc')
      expect(el.hasAttribute('role')).toBe(false)
      expect(el.hasAttribute('tabindex')).toBe(false)
    })

    it('href + target：target 透传到锚点', () => {
      const el = mount({ href: 'https://example.com', target: '_blank' })
      const link = el.shadowRoot!.querySelector<HTMLAnchorElement>('[part="link"]')!
      expect(link.getAttribute('target')).toBe('_blank')
    })

    it('clickable + href：焦点交给内部锚点，host 不设 role/tabindex（避免嵌套交互语义）', () => {
      const el = mount({ clickable: '', href: 'https://example.com' })
      expect(el.hasAttribute('role')).toBe(false)
      expect(el.hasAttribute('tabindex')).toBe(false)
      const link = el.shadowRoot!.querySelector<HTMLAnchorElement>('[part="link"]')!
      expect(link.getAttribute('href')).toBe('https://example.com')
    })

    it('无 href：锚点不带 href 属性（普通容器卡）', () => {
      const el = mount({})
      const link = el.shadowRoot!.querySelector<HTMLAnchorElement>('[part="link"]')!
      expect(link.hasAttribute('href')).toBe(false)
    })

    it('href 时点击内部交互元素：阻止锚点默认导航且不派发 oas-click', () => {
      const el = mount(
        { href: 'https://example.com', clickable: '' },
        '<button slot="actions">删除</button><p>正文</p>',
      )
      let fired = 0
      el.addEventListener('oas-click', () => fired++)
      const btn = el.querySelector('button')!
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      btn.dispatchEvent(evt)
      expect(evt.defaultPrevented).toBe(true)
      expect(fired).toBe(0)
    })

    it('无 href 时点击内部按钮不阻止默认行为', () => {
      const el = mount({ clickable: '' }, '<button slot="actions">删除</button><p>正文</p>')
      const btn = el.querySelector('button')!
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
      btn.dispatchEvent(evt)
      expect(evt.defaultPrevented).toBe(false)
    })

    it('href 焦点环落在内部锚点上（.card-link:focus-visible）', () => {
      const el = mount({ href: 'https://example.com' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(
        /\.card-link:focus-visible\s+\.card\s*\{[^}]*box-shadow:\s*var\(--oas-focus-ring\)/,
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

  it('extra 操作区 flex 带 gap（用户实测：header 内多按钮曾紧贴无空隙）', () => {
    const el = document.createElement('oas-card')
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.extra\s*\{[^}]*gap:\s*var\(--oas-space-2\)/)
    el.remove()
  })
})
