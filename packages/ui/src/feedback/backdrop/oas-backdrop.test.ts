import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASBackdrop } from './index.js'

function mount(attrs: Record<string, string> = {}, inner = ''): OASBackdrop {
  const el = new OASBackdrop()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (inner) el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

/** 等一帧（data-shown 延迟添加：ENTER_FRAME_MS=20） */
function waitFrame(): Promise<void> {
  return new Promise((r) => setTimeout(r, 40))
}

/** 等一个动画周期（进入 ≈20+180ms、退场 ≈180ms，取 280ms 裕量） */
function waitAnim(): Promise<void> {
  return new Promise((r) => setTimeout(r, 280))
}

/** 等 shake 动画结束（CSS 300ms，取 420ms 裕量） */
function waitShake(): Promise<void> {
  return new Promise((r) => setTimeout(r, 420))
}

function maskClick(el: OASBackdrop): MouseEvent {
  const ev = new MouseEvent('click', { bubbles: true, composed: true })
  el.shadowRoot!.querySelector<HTMLElement>('[part="mask"]')!.dispatchEvent(ev)
  return ev
}

describe('OASBackdrop', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.style.overflow = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.style.overflow = ''
    // 兜底还原 matchMedia stub（reduced-motion 测试失败也不污染后续用例）
    vi.unstubAllGlobals()
  })

  function dispatchWheel(): boolean {
    const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true })
    document.body.dispatchEvent(ev)
    return ev.defaultPrevented
  }

  describe('滚动锁定（既有能力保持）', () => {
    it('open 锁定滚动：拦截滚动行为但保留滚动条（不移除 → 视口宽度不变 → 无页面位移）', () => {
      const el = mount({ open: '' })
      expect(el.shadowRoot!.querySelector('[part="mask"]')).not.toBeNull()
      // 不移除滚动条（overflow 保持空，滚动条可见）
      expect(document.documentElement.style.overflow).toBe('')
      // 拦截滚动行为
      expect(dispatchWheel()).toBe(true)
    })

    it('open=false 播放退场后卸载节点并解除滚动拦截（无孤儿 DOM）', async () => {
      const el = mount({ open: '' })
      await waitFrame()
      expect(document.body.contains(el)).toBe(true)
      el.removeAttribute('open')
      // 立即进入退场态（data-closing 保持可见播放淡出）
      expect(el.hasAttribute('data-closing')).toBe(true)
      await waitAnim()
      expect(document.body.contains(el)).toBe(false)
      expect(dispatchWheel()).toBe(false)
    })

    it('lock-scroll=false 不锁定滚动', () => {
      mount({ open: '', 'lock-scroll': 'false' })
      expect(dispatchWheel()).toBe(false)
    })

    it('宿主直接移除节点（不经退场）时解除滚动拦截', () => {
      const el = mount({ open: '' })
      expect(dispatchWheel()).toBe(true)
      el.remove()
      expect(dispatchWheel()).toBe(false)
    })

    it('嵌套遮罩：都关闭后才解除拦截', () => {
      const a = mount({ open: '' })
      const b = mount({ open: '' })
      expect(dispatchWheel()).toBe(true)
      a.remove()
      expect(dispatchWheel()).toBe(true)
      b.remove()
      expect(dispatchWheel()).toBe(false)
    })
  })

  describe('P1 内容插槽', () => {
    it('默认 slot 承载内容：scrim 在内容下层（DOM 层序）、内容经 slot 分发', () => {
      const el = mount({ open: '' }, '<div class="loading">加载中</div>')
      const mask = el.shadowRoot!.querySelector('[part="mask"]')!
      const scrim = el.shadowRoot!.querySelector('[part="scrim"]')!
      const content = el.shadowRoot!.querySelector('[part="content"]')!
      const children = Array.from(mask.children)
      expect(children.indexOf(scrim)).toBeLessThan(children.indexOf(content))
      const slot = content.querySelector('slot')!
      expect(slot.assignedNodes().some((n) => (n.textContent ?? '').includes('加载中'))).toBe(true)
    })
  })

  describe('P2 color / opacity 定制', () => {
    it('color 任意 CSS 色值注入 scrim 背景', () => {
      const el = mount({ open: '', color: '#123456' })
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!.style.background).toBe(
        '#123456',
      )
    })

    it('color 预设名映射 preset token（协议 §4.1）', () => {
      const el = mount({ open: '', color: 'red' })
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!.style.background).toBe(
        'var(--oas-preset-red)',
      )
    })

    it('opacity 档位（thin/default/thick）与数字', () => {
      const scrimOf = (attrs: Record<string, string>) =>
        mount(attrs).shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!
      expect(scrimOf({ open: '', opacity: 'thin' }).style.opacity).toBe('0.35')
      expect(scrimOf({ open: '', opacity: 'default' }).style.opacity).toBe('0.55')
      expect(scrimOf({ open: '', opacity: 'thick' }).style.opacity).toBe('0.75')
      expect(scrimOf({ open: '', opacity: '0.3' }).style.opacity).toBe('0.3')
    })

    it('未设置时回落 CSS 变量通道（无内联样式）', () => {
      const el = mount({ open: '' })
      const scrim = el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!
      expect(scrim.style.background).toBe('')
      expect(scrim.style.opacity).toBe('')
    })

    it('样式走 CSS 变量开口（--oas-backdrop-bg / --oas-backdrop-opacity）+ transparent 快捷', () => {
      const css = mount({ open: '' }).shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('var(--oas-backdrop-bg, var(--oas-color-overlay))')
      expect(css).toContain('var(--oas-backdrop-opacity, 1)')
      expect(css).toContain(':host([transparent]) .scrim')
    })
  })

  describe('P3 blur 全值化', () => {
    it('布尔 blur 回落默认 blur(4px)（兼容既有用法）', () => {
      const el = mount({ open: '', blur: '' })
      const scrim = el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!
      expect(scrim.style.backdropFilter).toBe('blur(4px)')
      const webkit = (
        scrim.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }
      ).webkitBackdropFilter
      expect(webkit).toBe('blur(4px)')
    })

    it('blur 支持任意 CSS 滤镜全值', () => {
      const el = mount({ open: '', blur: 'blur(6px) saturate(150%)' })
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!.style.backdropFilter,
      ).toBe('blur(6px) saturate(150%)')
    })

    it('未设置时回落 CSS 变量（--oas-backdrop-blur）', () => {
      const el = mount({ open: '' })
      expect(el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!.style.backdropFilter).toBe(
        '',
      )
      expect(el.shadowRoot!.querySelector('style')!.textContent).toContain('var(--oas-backdrop-blur')
    })
  })

  describe('P4 淡入淡出动画 + 生命周期事件', () => {
    it('打开后延迟一帧添加 data-shown（淡入起点 opacity 0）', async () => {
      const el = mount({ open: '' })
      expect(el.hasAttribute('data-shown')).toBe(false)
      await waitFrame()
      expect(el.hasAttribute('data-shown')).toBe(true)
    })

    it('动画结束派发 oas-after-show', async () => {
      const el = mount({ open: '' })
      const events: string[] = []
      el.addEventListener('oas-after-show', () => events.push('after-show'))
      await waitAnim()
      expect(events).toEqual(['after-show'])
    })

    it('open=false 播放退场（data-closing）后卸载并派发 oas-after-close', async () => {
      const el = mount({ open: '' })
      await waitFrame()
      const events: string[] = []
      el.addEventListener('oas-after-close', () => events.push('after-close'))
      el.removeAttribute('open')
      expect(el.hasAttribute('data-closing')).toBe(true)
      await waitAnim()
      expect(document.body.contains(el)).toBe(false)
      expect(events).toEqual(['after-close'])
    })

    it('退场期间重开：取消退场、恢复淡入、不卸载', async () => {
      const el = mount({ open: '' })
      await waitFrame()
      el.removeAttribute('open')
      expect(el.hasAttribute('data-closing')).toBe(true)
      el.setAttribute('open', '')
      expect(el.hasAttribute('data-closing')).toBe(false)
      await waitFrame()
      expect(el.hasAttribute('data-shown')).toBe(true)
      expect(document.body.contains(el)).toBe(true)
    })

    it('prefers-reduced-motion：跳过过渡直接落最终态并派发事件', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
      // 先挂监听再 mount：reduced-motion 下 after-show 在连接时同步派发，不能漏听
      const el = new OASBackdrop()
      el.setAttribute('open', '')
      const events: string[] = []
      el.addEventListener('oas-after-show', () => events.push('after-show'))
      el.addEventListener('oas-after-close', () => events.push('after-close'))
      document.body.appendChild(el)
      // 进入立即落可见态 + after-show
      expect(el.hasAttribute('data-shown')).toBe(true)
      expect(events).toEqual(['after-show'])
      el.removeAttribute('open')
      // 退出立即卸载 + after-close
      expect(document.body.contains(el)).toBe(false)
      expect(events).toEqual(['after-show', 'after-close'])
      vi.unstubAllGlobals()
    })

    it('动画只走 opacity（transform/opacity 纪律）+ reduced-motion 降级', () => {
      const css = mount({ open: '' }).shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.mask\s*\{[^}]*transition:\s*opacity/)
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('P5 点击判定 + stopPropagation', () => {
    it('点击遮罩本体派发 oas-click（detail 携带 originalEvent）', () => {
      const el = mount({ open: '' })
      let detail: { originalEvent?: Event } | undefined
      el.addEventListener('oas-click', (e) => {
        detail = (e as CustomEvent).detail
      })
      const ev = maskClick(el)
      expect(detail?.originalEvent).toBe(ev)
    })

    it('点击内容区（slot 内）不派发 oas-click', () => {
      const el = mount({ open: '' }, '<button id="inner">内容</button>')
      let n = 0
      el.addEventListener('oas-click', () => n++)
      // 模拟点击内容：事件从 light DOM 内容发起（bubbles+composed 经 slot 穿入 shadow 到达 mask）
      const ev = new MouseEvent('click', { bubbles: true, composed: true })
      el.querySelector('#inner')!.dispatchEvent(ev)
      expect(n).toBe(0)
    })

    it('点击内容容器（.content 空区）不派发 oas-click', () => {
      const el = mount({ open: '' }, '<span>内容</span>')
      let n = 0
      el.addEventListener('oas-click', () => n++)
      const ev = new MouseEvent('click', { bubbles: true })
      el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.dispatchEvent(ev)
      expect(n).toBe(0)
    })

    it('stop-propagation 默认阻断点击传播到宿主文档', () => {
      const el = mount({ open: '' })
      const onDoc = vi.fn()
      document.addEventListener('click', onDoc)
      maskClick(el)
      expect(onDoc).not.toHaveBeenCalled()
      document.removeEventListener('click', onDoc)
    })

    it('stop-propagation=false 点击可传播到宿主文档', () => {
      const el = mount({ open: '', 'stop-propagation': 'false' })
      const onDoc = vi.fn()
      document.addEventListener('click', onDoc)
      maskClick(el)
      expect(onDoc).toHaveBeenCalledTimes(1)
      document.removeEventListener('click', onDoc)
    })
  })

  describe('P6 persistent + P7 点击反馈动画', () => {
    it('persistent 时点击遮罩不派发 oas-click（拦截事件驱动关闭）', () => {
      const el = mount({ open: '', persistent: '' }, '<span>内容</span>')
      let n = 0
      el.addEventListener('oas-click', () => n++)
      maskClick(el)
      expect(n).toBe(0)
    })

    it('persistent 点击遮罩触发内容 shake 反馈，动画结束后移除', async () => {
      const el = mount({ open: '', persistent: '' }, '<span>内容</span>')
      const content = el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!
      maskClick(el)
      expect(content.classList.contains('oas-shake')).toBe(true)
      await waitShake()
      expect(content.classList.contains('oas-shake')).toBe(false)
    })

    it('非 persistent 点击不触发 shake', () => {
      const el = mount({ open: '' }, '<span>内容</span>')
      maskClick(el)
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.classList.contains(
          'oas-shake',
        ),
      ).toBe(false)
    })

    it('prefers-reduced-motion 下 persistent 点击不触发 shake', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
      const el = mount({ open: '', persistent: '' }, '<span>内容</span>')
      maskClick(el)
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!.classList.contains(
          'oas-shake',
        ),
      ).toBe(false)
      vi.unstubAllGlobals()
    })

    it('shake 动画走 transform keyframes（性能纪律）', () => {
      const css = mount({ open: '' }).shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/@keyframes\s+oas-backdrop-shake[\s\S]*?transform:/)
      expect(css).toContain('.content.oas-shake')
    })
  })

  describe('P8 读屏关闭通道', () => {
    it('渲染 aria-button 语义的关闭按钮（默认 locale 文案）', () => {
      const el = mount({ open: '' })
      const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="sr-close"]')!
      expect(btn.type).toBe('button')
      expect(btn.getAttribute('aria-label')).toBe('关闭')
    })

    it('close-label 属性覆盖 aria-label', () => {
      const el = mount({ open: '', 'close-label': '关闭遮罩' })
      expect(
        el.shadowRoot!.querySelector<HTMLElement>('[part="sr-close"]')!.getAttribute('aria-label'),
      ).toBe('关闭遮罩')
    })

    it('激活关闭按钮派发 oas-click（键盘/SR 关闭通道可达）', () => {
      const el = mount({ open: '' })
      let detail: { originalEvent?: Event } | undefined
      el.addEventListener('oas-click', (e) => {
        detail = (e as CustomEvent).detail
      })
      const btn = el.shadowRoot!.querySelector<HTMLElement>('[part="sr-close"]')!
      const ev = new MouseEvent('click', { bubbles: true, composed: true })
      btn.dispatchEvent(ev)
      expect(detail?.originalEvent).toBe(ev)
    })

    it('persistent 下关闭按钮同样被拦截（一致语义）', () => {
      const el = mount({ open: '', persistent: '' })
      let n = 0
      el.addEventListener('oas-click', () => n++)
      el.shadowRoot!
        .querySelector<HTMLElement>('[part="sr-close"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(n).toBe(0)
    })

    it('关闭按钮默认视觉隐藏、聚焦时显示（skip-link 模式）', () => {
      const css = mount({ open: '' }).shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.sr-close\s*\{[^}]*clip-path:\s*inset\(50%\)/)
      expect(css).toMatch(/\.sr-close:focus\s*\{[^}]*clip-path:\s*none/)
    })
  })

  describe('增量同步', () => {
    it('运行时改 color/blur 增量同步（shadow 不重建）', () => {
      const el = mount({ open: '', color: '#111111' })
      const styleRef = el.shadowRoot!.querySelector('style')
      el.setAttribute('color', '#222222')
      el.setAttribute('blur', 'blur(8px)')
      const scrim = el.shadowRoot!.querySelector<HTMLElement>('[part="scrim"]')!
      expect(scrim.style.background).toBe('#222222')
      expect(scrim.style.backdropFilter).toBe('blur(8px)')
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    })
  })
})
