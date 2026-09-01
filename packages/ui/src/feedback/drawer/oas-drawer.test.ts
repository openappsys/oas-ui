import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASDrawer, drawer, destroyAll } from './index.js'

/** 挂载抽屉：attrs 先设置（title 吸收等状态机在 update 中生效），再写入 light DOM 内容 */
function mount(attrs: Record<string, string> = {}, content = '<p>抽屉内容</p>'): OASDrawer {
  const el = new OASDrawer()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = content
  document.body.appendChild(el)
  return el
}

function panel(el: OASDrawer): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
}

/** 触发打开动画结束（happy-dom 无真实过渡，手动派发 transitionend） */
function endOpen(el: OASDrawer): void {
  panel(el).dispatchEvent(new Event('transitionend'))
}

/** 关闭并结束关闭动画 */
function closeSync(el: OASDrawer): void {
  el.removeAttribute('visible')
  panel(el).dispatchEvent(new Event('transitionend'))
}

/** 模拟一次拖拽手势：控制 performance.now 推进拖拽时长，velocity 判定不被同步派发误触发 */
function dragGesture(
  target: HTMLElement,
  from: { x?: number; y?: number },
  to: { x?: number; y?: number },
  durationMs = 600,
): void {
  const nowMock = vi.spyOn(performance, 'now').mockReturnValue(1000)
  target.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: from.x ?? 0, clientY: from.y ?? 0, button: 0, bubbles: true }),
  )
  nowMock.mockReturnValue(1000 + durationMs)
  document.dispatchEvent(
    new PointerEvent('pointermove', { clientX: to.x ?? 0, clientY: to.y ?? 0, bubbles: true }),
  )
  document.dispatchEvent(
    new PointerEvent('pointerup', { clientX: to.x ?? 0, clientY: to.y ?? 0, bubbles: true }),
  )
}

describe('OASDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ===== 基线（既有行为保持） =====

  it('visible 时渲染面板，placement 默认 right', async () => {
    const el = mount({ visible: '', title: '筛选' })
    await Promise.resolve()
    expect(panel(el)).not.toBeNull()
    expect(panel(el).getAttribute('role')).toBe('dialog')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
  })

  it('visible 缺省时隐藏（aria-hidden=true，面板常驻 DOM）', () => {
    const el = mount()
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('点击 ✕ 移除 visible 并派发 oas-close', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(close).toBe(1)
  })

  it('点击确定移除 visible 并派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(ok).toBe(1)
  })

  it('width 属性控制面板宽度（px 与百分比，动态切换）', async () => {
    const el = mount({ visible: '', width: '640px' })
    await Promise.resolve()
    expect(panel(el).style.width).toBe('640px')
    el.setAttribute('width', '60%')
    expect(panel(el).style.width).toBe('60%')
    el.removeAttribute('width')
    expect(panel(el).style.width).toBe('')
  })

  it('size 档位映射预设宽度（small/medium/large）', async () => {
    const cases: Array<[string, string]> = [
      ['small', '256px'],
      ['medium', '378px'],
      ['large', '736px'],
    ]
    for (const [size, width] of cases) {
      const el = mount({ visible: '', size })
      await Promise.resolve()
      expect(panel(el).style.width).toBe(width)
      el.remove()
    }
  })

  it('size 支持具体值（纯数字视为 px，长度/百分比原样生效）', async () => {
    const el = mount({ visible: '', size: '512' })
    await Promise.resolve()
    expect(panel(el).style.width).toBe('512px')
    el.setAttribute('size', '40%')
    expect(panel(el).style.width).toBe('40%')
  })

  it('width 优先级高于 size', async () => {
    const el = mount({ visible: '', size: 'small', width: '400px' })
    await Promise.resolve()
    expect(panel(el).style.width).toBe('400px')
  })

  it('未设置 width/size 时回退 CSS 默认（无内联宽度）', () => {
    const el = mount({ visible: '' })
    expect(panel(el).style.width).toBe('')
  })

  // ===== P1 四向 placement（横向管宽、纵向管高） =====

  it('placement=left/top/bottom 写 data-placement', () => {
    for (const p of ['left', 'top', 'bottom']) {
      const el = mount({ visible: '', placement: p })
      expect(panel(el).getAttribute('data-placement')).toBe(p)
      el.remove()
    }
  })

  it('top/bottom 抽屉：width/size 映射为高度，宽度交给 CSS 100%', () => {
    const el = mount({ visible: '', placement: 'top', size: 'small' })
    expect(panel(el).style.height).toBe('256px')
    expect(panel(el).style.width).toBe('')
    el.setAttribute('placement', 'bottom')
    el.setAttribute('width', '400px')
    expect(panel(el).style.height).toBe('400px')
    expect(panel(el).style.width).toBe('')
  })

  it('left/right 抽屉：width/size 映射为宽度', () => {
    const el = mount({ visible: '', placement: 'left', width: '300px' })
    expect(panel(el).style.width).toBe('300px')
    expect(panel(el).style.height).toBe('')
  })

  it('placement 动态切换：left → bottom 时尺寸从宽切到高', () => {
    const el = mount({ visible: '', placement: 'left', width: '360px' })
    expect(panel(el).style.width).toBe('360px')
    el.setAttribute('placement', 'bottom')
    expect(panel(el).style.height).toBe('360px')
    expect(panel(el).style.width).toBe('')
  })

  // ===== P2 动画 + 生命周期事件（open/opened/close/closed） =====

  it('打开：oas-open 派发 + mask/panel 写入 data-open（驱动 CSS 过渡）', () => {
    const el = mount()
    let open = 0
    el.addEventListener('oas-open', () => open++)
    el.setAttribute('visible', '')
    expect(open).toBe(1)
    expect(panel(el).getAttribute('data-open')).toBe('')
    expect(el.shadowRoot!.querySelector('.mask')!.getAttribute('data-open')).toBe('')
  })

  it('打开动画结束（transitionend）后派发 oas-opened', () => {
    const el = mount({ visible: '' })
    let opened = 0
    el.addEventListener('oas-opened', () => opened++)
    expect(opened).toBe(0)
    endOpen(el)
    expect(opened).toBe(1)
  })

  it('关闭：oas-close 带关闭来源 detail，动画结束派发 oas-closed', () => {
    const el = mount({ visible: '' })
    let closeDetail: { source: string } | undefined
    let closed = 0
    el.addEventListener('oas-close', (e) => {
      closeDetail = (e as CustomEvent).detail
    })
    el.addEventListener('oas-closed', () => closed++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(closeDetail?.source).toBe('close')
    expect(closed).toBe(0)
    panel(el).dispatchEvent(new Event('transitionend'))
    expect(closed).toBe(1)
    expect(panel(el).getAttribute('data-open')).toBeNull()
  })

  it('关闭动画走 transform/opacity（style 含 transition 且面板位移用 translate）', () => {
    const el = mount({ visible: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('transform')
    expect(css).toContain('opacity')
    expect(css).toContain('translateX')
    expect(css).toContain('translateY')
  })

  it('reduced-motion 降级：media 查询存在且关闭过渡', () => {
    const el = mount({ visible: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('transition: none')
  })

  // ===== P3 body 滚动锁 + 焦点陷阱 =====

  it('打开锁定 body 滚动，关闭恢复原值', () => {
    const el = mount({ visible: '' })
    expect(document.body.style.overflow).toBe('hidden')
    closeSync(el)
    expect(document.body.style.overflow).toBe('')
  })

  it('no-scroll-lock 不锁 body 滚动', () => {
    const el = mount({ visible: '', 'no-scroll-lock': '' })
    expect(document.body.style.overflow).toBe('')
  })

  it('嵌套抽屉滚动锁深度计数：内层关闭后 body 仍锁定', () => {
    const a = mount({ visible: '' })
    const b = mount({ visible: '' })
    expect(document.body.style.overflow).toBe('hidden')
    closeSync(b)
    expect(document.body.style.overflow).toBe('hidden')
    closeSync(a)
    expect(document.body.style.overflow).toBe('')
  })

  it('焦点陷阱：末位元素按 Tab 循环回首位', () => {
    const el = mount({ visible: '' })
    const ok = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    ok.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(close)
  })

  it('焦点陷阱：首位元素 Shift+Tab 回末位', () => {
    const el = mount({ visible: '' })
    const ok = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    close.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(ok)
  })

  it('no-focus-trap 关闭圈禁', () => {
    const el = mount({ visible: '', 'no-focus-trap': '' })
    const ok = el.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    ok.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(ok)
  })

  it('打开时焦点移入面板，关闭后归还来源焦点', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const el = mount({ visible: '' })
    // 初始焦点：默认 ✕ 按钮
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="close"]'))
    closeSync(el)
    expect(document.activeElement).toBe(trigger)
  })

  // ===== P4 before-close 关闭拦截（cancelable + source） =====

  it('oas-before-close preventDefault 后抽屉保持打开', () => {
    const el = mount({ visible: '' })
    let before = 0
    el.addEventListener('oas-before-close', (e) => {
      before++
      e.preventDefault()
    })
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
    expect(before).toBe(1)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('关闭来源 detail：遮罩=mask / Esc=esc / 取消=cancel / 确定=ok', () => {
    const sources: Array<[string, (el: OASDrawer) => void]> = [
      ['mask', (el) => el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))],
      ['esc', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
      ['cancel', (el) => (el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()],
      ['ok', (el) => (el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()],
    ]
    for (const [src, act] of sources) {
      const el = mount({ visible: '' })
      let detail: { source: string } | undefined
      el.addEventListener('oas-close', (e) => {
        detail = (e as CustomEvent).detail
      })
      act(el)
      expect(detail?.source).toBe(src)
      expect(el.hasAttribute('visible')).toBe(false)
    }
  })

  it('ok 关闭路径也走 before-close 拦截', () => {
    const el = mount({ visible: '' })
    el.addEventListener('oas-before-close', (e) => e.preventDefault())
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(true)
  })

  // ===== P5 footer/header 插槽 + ok/cancel 文案 =====

  it('footer 插槽有内容时隐藏内置按钮组', () => {
    const el = mount({ visible: '' }, '<p slot="footer">自定义底部</p><p>内容</p>')
    expect(el.shadowRoot!.querySelector('.footer-actions')!.hasAttribute('hidden')).toBe(true)
    // 插槽内容在 light DOM，宿主 textContent 含自定义底部
    expect(el.textContent).toContain('自定义底部')
  })

  it('footer 插槽为空时保留内置按钮组', () => {
    const el = mount({ visible: '' })
    expect(el.shadowRoot!.querySelector('.footer-actions')!.hasAttribute('hidden')).toBe(false)
  })

  it('no-footer 隐藏整个底部区', () => {
    const el = mount({ visible: '', 'no-footer': '' })
    expect((el.shadowRoot!.querySelector('[part="footer"]') as HTMLElement).style.display).toBe(
      'none',
    )
  })

  it('ok-text / cancel-text 覆盖内置文案', () => {
    const el = mount({ visible: '', 'ok-text': '保存', 'cancel-text': '放弃' })
    expect(el.shadowRoot!.querySelector('[part="ok"]')!.textContent).toContain('保存')
    expect(el.shadowRoot!.querySelector('[part="cancel"]')!.textContent).toBe('放弃')
  })

  it('header-actions 插槽有内容时显示扩展区', () => {
    const el = mount({ visible: '' }, '<button slot="header-actions">刷新</button><p>内容</p>')
    const actions = el.shadowRoot!.querySelector('[part="header-actions"]')!
    expect(actions.hasAttribute('hidden')).toBe(false)
    // 插槽内容在 light DOM
    expect(el.textContent).toContain('刷新')
  })

  // ===== P7 mobile 手势（swipe 关闭 / snap 吸附 / 拖拽把手） =====

  it('swipeable：bottom 抽屉显示拖拽把手', () => {
    const el = mount({ visible: '', placement: 'bottom', swipeable: '' })
    expect(el.shadowRoot!.querySelector('[part="handle"]')!.hasAttribute('hidden')).toBe(false)
    const noSwipe = mount({ visible: '', placement: 'bottom' })
    expect(noSwipe.shadowRoot!.querySelector('[part="handle"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('swipe 超阈值关闭：拖拽位移超过 35% 面板尺寸 → oas-close source=swipe', () => {
    const el = mount({ visible: '', placement: 'bottom', swipeable: '', width: '400' })
    const handle = el.shadowRoot!.querySelector<HTMLElement>('[part="handle"]')!
    let detail: { source: string } | undefined
    el.addEventListener('oas-close', (e) => {
      detail = (e as CustomEvent).detail
    })
    dragGesture(handle, { y: 100 }, { y: 300 })
    expect(detail?.source).toBe('swipe')
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('swipe 未达阈值回弹：慢速小位移 → 面板 transform 清除、抽屉保持打开', () => {
    const el = mount({ visible: '', placement: 'bottom', swipeable: '', width: '400' })
    const handle = el.shadowRoot!.querySelector<HTMLElement>('[part="handle"]')!
    dragGesture(handle, { y: 100 }, { y: 150 })
    expect(el.hasAttribute('visible')).toBe(true)
    expect(panel(el).style.transform).toBe('')
  })

  it('swipe 快速滑动：低于位移阈值但速度高 → 仍关闭', () => {
    const el = mount({ visible: '', placement: 'bottom', swipeable: '', width: '400' })
    const handle = el.shadowRoot!.querySelector<HTMLElement>('[part="handle"]')!
    dragGesture(handle, { y: 100 }, { y: 200 }, 80)
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('snap-points：bottom 抽屉打开时吸附最高点（视口比例）', () => {
    const el = mount({ visible: '', placement: 'bottom', 'snap-points': '0.4, 0.85' })
    const h = Math.round(window.innerHeight * 0.85)
    expect(panel(el).style.height).toBe(`${h}px`)
  })

  it('snap-points：释放后吸附最近点并派发 oas-resize', () => {
    const h85 = Math.round(window.innerHeight * 0.85)
    const h40 = Math.round(window.innerHeight * 0.4)
    // width 显式给吸附高度：happy-dom 无布局 rect，currentDimensionPx 走 width 属性
    const el = mount({
      visible: '',
      placement: 'bottom',
      'snap-points': '0.4, 0.85',
      width: `${h85}px`,
    })
    const handle = el.shadowRoot!.querySelector<HTMLElement>('[part="handle"]')!
    let resize: { size: number } | undefined
    el.addEventListener('oas-resize', (e) => {
      resize = (e as CustomEvent).detail
    })
    // 拖 30% 视口高（慢速）：target = 0.85h - 0.30h = 0.55h，距 0.4h 更近 → 吸附 0.4h
    dragGesture(handle, { y: 100 }, { y: 100 + h85 * 0.3 })
    expect(el.hasAttribute('visible')).toBe(true)
    expect(panel(el).style.height).toBe(`${h40}px`)
    expect(resize?.size).toBe(h40)
  })

  // ===== P8 命令式 API（drawer()） =====

  it('drawer() 创建并打开抽屉（标题渲染、内容为纯文本）', () => {
    drawer({ title: '命令式', content: '我是内容' })
    const el = document.querySelector('oas-drawer[visible]') as OASDrawer
    expect(el).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('命令式')
    expect(el.textContent).toContain('我是内容')
  })

  it('drawer() 异步 onOk：确定进入 ok-loading，resolve 后关闭销毁', async () => {
    let resolve!: (v: unknown) => void
    const p = new Promise((r) => {
      resolve = r
    })
    const h = drawer({ title: 'T', content: 'C', onOk: () => p })
    const el = document.querySelector('oas-drawer[visible]') as OASDrawer
    const ok = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="ok"]')!
    ok.click()
    expect(el.hasAttribute('ok-loading')).toBe(true)
    expect(ok.disabled).toBe(true)
    resolve(undefined)
    await Promise.resolve()
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(false)
    // 关闭动画结束（oas-closed）后销毁 DOM
    el.shadowRoot!.querySelector('[part="panel"]')!.dispatchEvent(new Event('transitionend'))
    await Promise.resolve()
    expect(document.querySelector('oas-drawer')).toBeNull()
    void h
  })

  it('drawer() 同步 onOk 立即关闭并销毁', async () => {
    drawer({ title: 'T', onOk: () => undefined })
    const el = document.querySelector('oas-drawer[visible]') as OASDrawer
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    el.shadowRoot!.querySelector('[part="panel"]')!.dispatchEvent(new Event('transitionend'))
    await Promise.resolve()
    expect(document.querySelector('oas-drawer')).toBeNull()
  })

  it('handle.close() 播放关闭动画后销毁 DOM', async () => {
    const h = drawer({ title: 'T' })
    const el = document.querySelector('oas-drawer[visible]') as OASDrawer
    h.close()
    expect(el.hasAttribute('visible')).toBe(false)
    // 关闭动画期间仍在 DOM
    expect(document.querySelector('oas-drawer')).toBe(el)
    el.shadowRoot!.querySelector('[part="panel"]')!.dispatchEvent(new Event('transitionend'))
    await Promise.resolve()
    expect(document.querySelector('oas-drawer')).toBeNull()
  })

  it('destroyAll 关闭并销毁全部命令式抽屉', async () => {
    drawer({ title: 'a' })
    drawer({ title: 'b' })
    expect(document.querySelectorAll('oas-drawer[visible]').length).toBe(2)
    destroyAll()
    for (const el of document.querySelectorAll('oas-drawer')) {
      el.shadowRoot!.querySelector('[part="panel"]')!.dispatchEvent(new Event('transitionend'))
    }
    await Promise.resolve()
    expect(document.querySelectorAll('oas-drawer').length).toBe(0)
  })

  // ===== P9 destroy-on-close =====

  it('destroy-on-close：关闭动画结束后清空 light DOM 内容', () => {
    const el = mount({ visible: '', 'destroy-on-close': '' })
    expect(el.children.length).toBe(1)
    closeSync(el)
    expect(el.children.length).toBe(0)
  })

  it('未设置 destroy-on-close：关闭后内容保留', () => {
    const el = mount({ visible: '' })
    closeSync(el)
    expect(el.children.length).toBe(1)
  })

  // ===== P10 loading + confirmLoading（ok-loading） =====

  it('loading：骨架显示、内容隐藏、确定/取消禁用', () => {
    const el = mount({ visible: '', loading: '' })
    expect(el.shadowRoot!.querySelector('[part="skeleton"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('slot:not([name])')!.hasAttribute('hidden')).toBe(true)
    expect((el.shadowRoot!.querySelector('[part="ok"]') as HTMLButtonElement).disabled).toBe(true)
    expect(
      (el.shadowRoot!.querySelector('[part="cancel"]') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('ok-loading：确定按钮 spinner + disabled + aria-busy，点击被忽略', () => {
    const el = mount({ visible: '', 'ok-loading': '' })
    const ok = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="ok"]')!
    expect(ok.disabled).toBe(true)
    expect(ok.getAttribute('aria-busy')).toBe('true')
    expect(ok.querySelector('.spinner')!.hasAttribute('hidden')).toBe(false)
    let okCount = 0
    el.addEventListener('oas-ok', () => okCount++)
    ok.click()
    expect(okCount).toBe(0)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('loading 动态开关：移除后恢复内容与按钮', () => {
    const el = mount({ visible: '', loading: '' })
    el.removeAttribute('loading')
    expect(el.shadowRoot!.querySelector('[part="skeleton"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('slot:not([name])')!.hasAttribute('hidden')).toBe(false)
    expect((el.shadowRoot!.querySelector('[part="ok"]') as HTMLButtonElement).disabled).toBe(false)
  })

  // ===== P11 append-to 挂载节点 + z-index =====

  it('append-to=body：mask/panel 移入 portal 容器', () => {
    const el = mount({ visible: '', 'append-to': 'body' })
    const portal = document.querySelector('[data-oas-drawer-portal]')
    expect(portal).not.toBeNull()
    expect(portal!.shadowRoot!.querySelector('[part="panel"]')).not.toBeNull()
    expect(portal!.shadowRoot!.querySelector('.mask')).not.toBeNull()
    // 原 shadow 不再持有 panel
    expect(el.shadowRoot!.querySelector('[part="panel"]')).toBeNull()
  })

  it('移除 append-to：mask/panel 移回宿主 shadow', () => {
    const el = mount({ visible: '', 'append-to': 'body' })
    el.removeAttribute('append-to')
    expect(el.shadowRoot!.querySelector('[part="panel"]')).not.toBeNull()
    expect(document.querySelector('[data-oas-drawer-portal]')).toBeNull()
  })

  it('z-index 属性覆盖默认档位（mask/panel 走 CSS 变量链 + 偏移）', () => {
    const el = mount({ visible: '', 'z-index': '2000' })
    const mask = el.shadowRoot!.querySelector<HTMLElement>('.mask')!
    expect(mask.style.zIndex).toBe('calc(var(--oas-z-index-base, 0) + 2000 + 0)')
    expect(panel(el).style.zIndex).toBe('calc(var(--oas-z-index-base, 0) + 2000 + 1)')
  })

  // ===== P12 resizable 拖拽调宽（min/max + oas-resize） =====

  it('resizable：显示边缘拖拽条，pointer 拖拽改变 width 并派发 oas-resize', () => {
    const el = mount({ visible: '', resizable: '', width: '400px' })
    const rail = el.shadowRoot!.querySelector('[part="rail"]')!
    expect(rail.hasAttribute('hidden')).toBe(false)
    let resize: { size: number } | undefined
    el.addEventListener('oas-resize', (e) => {
      resize = (e as CustomEvent).detail
    })
    rail.dispatchEvent(new PointerEvent('pointerdown', { clientX: 500, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 300 }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 300 }))
    expect(el.getAttribute('width')).toBe('600px')
    expect(resize?.size).toBe(600)
  })

  it('resizable：min/max 钳制拖拽结果', () => {
    const el = mount({ visible: '', resizable: '', width: '400px', 'resize-min': '200', 'resize-max': '500' })
    const rail = el.shadowRoot!.querySelector('[part="rail"]')!
    // 向左猛拖 → 远超 max
    rail.dispatchEvent(new PointerEvent('pointerdown', { clientX: 1000, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 100 }))
    expect(el.getAttribute('width')).toBe('500px')
    // 反向猛拖 → 低于 min
    rail.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, button: 0, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 1000 }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 1000 }))
    expect(el.getAttribute('width')).toBe('200px')
  })

  it('resizable：方向键微调宽度并派发 oas-resize', () => {
    const el = mount({ visible: '', resizable: '', width: '400px' })
    const rail = el.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!
    rail.focus()
    let resize = 0
    el.addEventListener('oas-resize', () => resize++)
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('width')).toBe('392px')
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('width')).toBe('400px')
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(el.getAttribute('width')).toBe('1000px')
    expect(resize).toBe(3)
  })

  it('未设置 resizable：拖拽条隐藏', () => {
    const el = mount({ visible: '' })
    expect(el.shadowRoot!.querySelector('[part="rail"]')!.hasAttribute('hidden')).toBe(true)
  })

  // ===== P13 Esc 开关 / 关闭按钮隐藏 / 标题区隐藏 =====

  it('no-esc-close 禁用 Esc 关闭', () => {
    const el = mount({ visible: '', 'no-esc-close': '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('no-close-btn 隐藏关闭按钮', () => {
    const el = mount({ visible: '', 'no-close-btn': '' })
    expect(el.shadowRoot!.querySelector('[part="close"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('no-header 隐藏标题区并移除 aria-labelledby', () => {
    const el = mount({ visible: '', 'no-header': '' })
    expect(el.shadowRoot!.querySelector('[part="header"]')!.hasAttribute('hidden')).toBe(true)
    expect(panel(el).hasAttribute('aria-labelledby')).toBe(false)
    expect(panel(el).getAttribute('role')).toBe('dialog')
  })

  // ===== P14 嵌套抽屉层级 / 栈管理 =====

  it('后打开的抽屉 z-index 高于先打开者（栈深偏移）', () => {
    const a = mount({ visible: '' })
    const b = mount({ visible: '' })
    const pa = panel(a)
    const pb = panel(b)
    expect(pa.style.zIndex).toBe('calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040) + 1)')
    expect(pb.style.zIndex).toBe('calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040) + 2)')
  })

  it('Esc 只关闭栈顶抽屉（嵌套逐层关）', () => {
    const a = mount({ visible: '' })
    const b = mount({ visible: '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(b.hasAttribute('visible')).toBe(false)
    expect(a.hasAttribute('visible')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(a.hasAttribute('visible')).toBe(false)
  })

  it('栈顶抽屉关闭后，下层抽屉 z-index 回落并接管 Esc', () => {
    const a = mount({ visible: '' })
    const b = mount({ visible: '' })
    closeSync(b)
    expect(panel(a).style.zIndex).toBe(
      'calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040) + 1)',
    )
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(a.hasAttribute('visible')).toBe(false)
  })

  it('抽屉与模态共存：模态在上时 Esc 不穿透关闭抽屉', () => {
    const el = mount({ visible: '' })
    const modal = document.createElement('div')
    modal.setAttribute('is-modal-standin', '')
    document.body.appendChild(modal)
    // 模态探测走 oas-modal[visible] 选择器：注入一个真 oas-modal 占位
    const realModal = document.createElement('oas-modal')
    realModal.setAttribute('visible', '')
    document.body.appendChild(realModal)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(true)
    realModal.remove()
    modal.remove()
  })

  // ===== P18 初始焦点指定（initial-focus） =====

  it('initial-focus 选择器命中 light DOM 元素则聚焦', () => {
    const el = mount({ visible: '', 'initial-focus': '#first' }, '<input id="first"><p>内容</p>')
    expect(document.activeElement).toBe(el.querySelector('#first'))
  })

  it('initial-focus 无匹配时回退关闭按钮', () => {
    const el = mount({ visible: '', 'initial-focus': '#missing' })
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="close"]'))
  })

  // ===== title 吸收 / 双通道（基线保持） =====

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', () => {
      const el = mount({ visible: '', title: '筛选' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
    })

    it('吸收触发的二次 update 幂等（标题不丢失）', () => {
      const el = mount({ visible: '', title: '筛选' })
      el.setAttribute('placement', 'left')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ visible: '', title: '旧标题' })
      el.setAttribute('title', '新筛选')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新筛选')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ visible: '', title: '筛选' })
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASDrawer()
      ref.setAttribute('title', '水合标题')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASDrawer()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-drawer" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合标题')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })

  describe('title 双通道（slot 富内容覆盖属性文本）', () => {
    it('slot 有内容时覆盖属性文本', () => {
      const el = new OASDrawer()
      el.setAttribute('visible', '')
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span><p>抽屉内容</p>'
      document.body.appendChild(el)
      const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(slot.assignedNodes().length).toBeGreaterThan(0)
      expect(fallback.hidden).toBe(true)
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('动态移除 slot 内容后回落属性文本', async () => {
      const el = new OASDrawer()
      el.setAttribute('visible', '')
      el.setAttribute('title', '属性标题')
      el.innerHTML = '<span slot="title">插槽标题</span>'
      document.body.appendChild(el)
      const fallback = el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
      expect(fallback.hidden).toBe(true)
      const node = el.querySelector('span[slot="title"]')!
      el.removeChild(node)
      await new Promise((r) => setTimeout(r, 0))
      expect(fallback.hidden).toBe(false)
      expect(fallback.textContent).toBe('属性标题')
    })
  })
})
