import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

  describe('主体内容区 content（默认插槽）', () => {
    it('无内容时区块隐藏（渲染层不空占位）', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
    })

    it('有内容时区块显示', () => {
      const el = new OASPageHeader()
      el.innerHTML = '<p>正文内容</p>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
    })

    it('仅注释节点视为无内容（区块隐藏）', () => {
      const el = new OASPageHeader()
      el.innerHTML = '<!-- 占位 -->'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
    })
  })

  describe('footer 插槽', () => {
    it('有内容时底部区显示', () => {
      const el = new OASPageHeader()
      el.innerHTML = '<div slot="footer">底部操作</div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(false)
    })

    it('无内容时底部区隐藏', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(true)
    })
  })

  describe('breadcrumb 插槽', () => {
    it('有内容时头部独立行显示', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      el.innerHTML = '<oas-breadcrumb slot="breadcrumb"></oas-breadcrumb>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="breadcrumb"]')!.hidden).toBe(false)
    })

    it('无内容时头部行隐藏', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="breadcrumb"]')!.hidden).toBe(true)
    })
  })

  describe('avatar 插槽', () => {
    it('无内容时头像区块隐藏（渲染层不空占位）', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(true)
    })

    it('有内容时头像区块显示', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      el.innerHTML = '<oas-avatar slot="avatar" text="张"></oas-avatar>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(false)
    })

    it('渲染位置在返回按钮之后、标题块之前', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      el.setAttribute('title', '标题')
      el.innerHTML = '<oas-avatar slot="avatar" text="张"></oas-avatar>'
      document.body.appendChild(el)
      const sr = el.shadowRoot!
      const back = sr.querySelector<HTMLElement>('[part="back"]')!
      const avatar = sr.querySelector<HTMLElement>('[part="avatar"]')!
      const title = sr.querySelector<HTMLElement>('[part="title"]')!
      expect(back).not.toBeNull()
      expect(avatar).not.toBeNull()
      const isFollowing = (a: Node, b: Node) =>
        (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      expect(isFollowing(back, avatar)).toBe(true)
      expect(isFollowing(avatar, title)).toBe(true)
    })

    it('动态添加 avatar 内容后区块显示', async () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(true)
      const avatar = document.createElement('oas-avatar')
      avatar.setAttribute('slot', 'avatar')
      avatar.setAttribute('text', '张')
      el.appendChild(avatar)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(false)
    })

    it('动态移除 avatar 内容后区块隐藏', async () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      const avatar = document.createElement('oas-avatar')
      avatar.setAttribute('slot', 'avatar')
      avatar.setAttribute('text', '张')
      el.appendChild(avatar)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(false)
      el.removeChild(avatar)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="avatar"]')!.hidden).toBe(true)
    })
  })

  describe('back-icon 插槽', () => {
    it('无插槽内容时内置 chevron 显示', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      document.body.appendChild(el)
      const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="back-icon"]')
      expect(icon).not.toBeNull()
      expect(icon!.hidden).toBe(false)
    })

    it('有插槽内容时内置 chevron 隐藏', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      el.innerHTML = '<oas-icon slot="back-icon" name="arrow-left"></oas-icon>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="back-icon"]')!.hidden).toBe(true)
    })

    it('插槽仅注释节点时按无内容处理（用内置 chevron）', () => {
      const el = new OASPageHeader()
      el.setAttribute('back', '')
      el.innerHTML = '<span slot="back-icon"><!-- 占位 --></span>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="back-icon"]')!.hidden).toBe(false)
    })
  })

  describe('title / subtitle 双通道（属性优先、插槽兜富内容）', () => {
    it('仅 title 属性：显示属性文本', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '页面标题')
      document.body.appendChild(el)
      const t = el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      expect(t.textContent).toBe('页面标题')
      expect(t.hidden).toBe(false)
    })

    it('title 插槽有内容时覆盖属性文案', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const t = el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      expect(t.hidden).toBe(true)
      expect(
        el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!.assignedNodes().length,
      ).toBeGreaterThan(0)
    })

    it('subtitle 插槽有内容时覆盖属性文案', () => {
      const el = new OASPageHeader()
      el.setAttribute('subtitle', '属性副标题')
      el.innerHTML = '<span slot="subtitle">插槽副标题</span>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="subtitle"]')!.hidden).toBe(true)
    })
  })

  describe('动态插槽内容（slotchange 重刷）', () => {
    it('动态添加 content 后区块显示', async () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
      const p = document.createElement('p')
      p.textContent = '动态正文'
      el.appendChild(p)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
    })

    it('动态移除 content 后区块隐藏', async () => {
      const el = new OASPageHeader()
      const p = document.createElement('p')
      p.textContent = '正文'
      el.appendChild(p)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
      el.removeChild(p)
      await new Promise((r) => setTimeout(r, 0))
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(true)
    })
  })

  describe('空区块 [hidden] CSS 兜底', () => {
    it('作者级 display 不覆盖 hidden（渲染层不空占位）', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.breadcrumb\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.content\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.footer\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.avatar\[hidden\]\s*\{[^}]*display:\s*none/)
      expect(css).toMatch(/\.back-icon\[hidden\]\s*\{[^}]*display:\s*none/)
    })
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    function titleEl(el: OASPageHeader): HTMLElement {
      return el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
    }

    it('挂载后宿主不再残留 title 属性，标题渲染进标题区', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '页面标题')
      document.body.appendChild(el)
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(titleEl(el).textContent).toBe('页面标题')
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '页面标题')
      document.body.appendChild(el)
      el.setAttribute('data-x', '1')
      expect(titleEl(el).textContent).toBe('页面标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '旧标题')
      document.body.appendChild(el)
      el.setAttribute('title', '新标题')
      expect(titleEl(el).textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '页面标题')
      document.body.appendChild(el)
      el.setAttribute('title', '')
      expect(titleEl(el).textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合从快照标题区恢复 title 缓存（宿主无 title，标题不丢）', () => {
      const el = new OASPageHeader()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-page-header" data-oas-ssr-v="1"><style></style>' +
        '<div class="breadcrumb" part="breadcrumb" hidden><slot name="breadcrumb"></slot></div>' +
        '<div class="row" part="row"><div class="avatar" part="avatar" hidden>' +
        '<slot name="avatar"></slot></div><div>' +
        '<div class="title" part="title">快照标题</div><slot name="title"></slot>' +
        '<div class="subtitle" part="subtitle"></div><slot name="subtitle"></slot></div>' +
        '<div class="extra"><slot name="extra"></slot></div></div>' +
        '<div class="content" part="content" hidden><slot></slot></div>' +
        '<div class="footer" part="footer" hidden><slot name="footer"></slot></div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      expect(titleEl(el).textContent).toBe('快照标题')
    })
  })

  describe('ghost 透明背景变体', () => {
    function cssOf(el: OASPageHeader): string {
      return el.shadowRoot!.querySelector('style')!.textContent!
    }

    it('ghost 列入 observedAttributes', () => {
      expect(OASPageHeader.observedAttributes).toContain('ghost')
    })

    it('缺省不加 ghost 类名；设置后加 oas-page-header--ghost（移除恢复）', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '标题')
      document.body.appendChild(el)
      expect(el.classList.contains('oas-page-header--ghost')).toBe(false)
      el.setAttribute('ghost', '')
      expect(el.classList.contains('oas-page-header--ghost')).toBe(true)
      el.removeAttribute('ghost')
      expect(el.classList.contains('oas-page-header--ghost')).toBe(false)
    })

    it('CSS：ghost 下 host 背景置 none、footer 分隔线去除；默认 :host 保持现状（透明，无背景规则）', () => {
      const el = new OASPageHeader()
      document.body.appendChild(el)
      const css = cssOf(el)
      expect(css).toMatch(/:host\(\.oas-page-header--ghost\)\s*\{[^}]*background:\s*none/)
      expect(css).toMatch(
        /:host\(\.oas-page-header--ghost\)\s+\.footer\s*\{[^}]*border-top:\s*none/,
      )
      // 默认态无背景声明（现状透明底，ghost 是显式覆盖通道）
      expect(css).not.toMatch(/:host\s*\{[^}]*background/)
    })

    it('ghost 不影响布局与结构：标题/副标题/返回/正文渲染不变', () => {
      const el = new OASPageHeader()
      el.setAttribute('title', '页面标题')
      el.setAttribute('subtitle', '副标题')
      el.setAttribute('back', '')
      el.setAttribute('ghost', '')
      el.innerHTML = '<p>正文</p>'
      document.body.appendChild(el)
      const sr = el.shadowRoot!
      expect(sr.querySelector('[part="title"]')!.textContent).toBe('页面标题')
      expect(sr.querySelector('[part="subtitle"]')!.textContent).toBe('副标题')
      expect(sr.querySelector('[part="back"]')).not.toBeNull()
      expect(sr.querySelector<HTMLElement>('[part="content"]')!.hidden).toBe(false)
      // 文字色仍走主题前景 token（ghost 不引入新颜色）
      expect(cssOf(el)).toContain('var(--oas-color-text-primary)')
    })
  })
})

// ===== responsive 响应式紧凑 =====

describe('OASPageHeader responsive 响应式紧凑', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('responsive 列入 observedAttributes', () => {
    expect(OASPageHeader.observedAttributes).toContain('responsive')
  })

  it('缺省不紧凑；responsive + 未布局（clientWidth=0）不误判紧凑', () => {
    const el = new OASPageHeader()
    el.setAttribute('title', '标题')
    document.body.appendChild(el)
    expect(el.hasAttribute('data-compact')).toBe(false)
    el.setAttribute('responsive', '')
    expect(el.hasAttribute('data-compact')).toBe(false)
  })

  it('RO 驱动：窄于 768 加 data-compact（紧凑布局），恢复宽度移除', () => {
    let roCb: (() => void) | null = null
    class FakeRO {
      cb: () => void
      constructor(cb: () => void) {
        this.cb = cb
        roCb = cb
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    const el = new OASPageHeader()
    el.setAttribute('title', '标题')
    el.setAttribute('responsive', '')
    document.body.appendChild(el)
    expect(roCb).not.toBeNull()
    // 初始未布局：不紧凑
    expect(el.hasAttribute('data-compact')).toBe(false)
    // 窄于 768 → 紧凑
    Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true })
    roCb!()
    expect(el.hasAttribute('data-compact')).toBe(true)
    // 恢复宽度（>= 768）→ 移除紧凑标记
    Object.defineProperty(el, 'clientWidth', { value: 900, configurable: true })
    roCb!()
    expect(el.hasAttribute('data-compact')).toBe(false)
  })

  it('非 responsive 时不建立 ResizeObserver（默认行为不变）', () => {
    let constructed = 0
    class FakeRO {
      constructor(_cb: () => void) {
        constructed++
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    const el = new OASPageHeader()
    el.setAttribute('title', '标题')
    document.body.appendChild(el)
    expect(constructed).toBe(0)
  })

  it('CSS：紧凑态标题字号降档（xl→lg）、副标题字号 sm、.row 允许换行（flex-wrap）', () => {
    const el = new OASPageHeader()
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/:host\(\[data-compact\]\)\s+\.row\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(css).toMatch(
      /:host\(\[data-compact\]\)\s+\.title\s*\{[^}]*font-size:\s*var\(--oas-font-size-lg\)/,
    )
    expect(css).toMatch(
      /:host\(\[data-compact\]\)\s+\.subtitle\s*\{[^}]*font-size:\s*var\(--oas-font-size-sm\)/,
    )
  })

  it('onCleanup：断开连接清理 ResizeObserver（重连幂等重建）', () => {
    class FakeRO {
      constructor(_cb: () => void) {}
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    const el = new OASPageHeader()
    el.setAttribute('responsive', '')
    document.body.appendChild(el)
    const spy = vi.spyOn(FakeRO.prototype, 'disconnect')
    el.remove()
    expect(spy).toHaveBeenCalled()
    // 重连后 update 幂等重建观察器
    let constructed = 0
    class FakeRO2 {
      constructor(_cb: () => void) {
        constructed++
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO2 as unknown as typeof ResizeObserver)
    document.body.appendChild(el)
    expect(constructed).toBe(1)
  })
})
