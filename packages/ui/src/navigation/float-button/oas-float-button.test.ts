import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASFloatButton } from './index.js'

function mount(attrs: Record<string, string> = {}, inner = ''): OASFloatButton {
  const el = new OASFloatButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner || `<span slot="icon">+</span>`
  document.body.appendChild(el)
  return el
}

function btn(el: OASFloatButton): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="btn"]')!
}

describe('OASFloatButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('渲染悬浮按钮', () => {
    const el = mount()
    expect(btn(el)).not.toBeNull()
  })

  it('点击派发 oas-click，detail 携带 originalEvent（文档契约）', () => {
    const el = mount()
    let detail: { originalEvent?: Event } | undefined
    el.addEventListener('oas-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    btn(el).click()
    expect(detail).toBeTruthy()
    expect(detail!.originalEvent).toBeInstanceOf(MouseEvent)
  })

  it('badge 属性渲染角标', () => {
    const el = mount({ badge: '5' })
    expect(el.shadowRoot!.querySelector('[part="badge"]')!.textContent).toContain('5')
  })

  it('shape：默认 circle，square 同步到 host data-shape', () => {
    const el = mount()
    expect(el.getAttribute('data-shape')).toBe('circle')
    el.setAttribute('shape', 'square')
    expect(el.getAttribute('data-shape')).toBe('square')
  })

  it('type：默认 primary，default 切换 btn 类名', () => {
    const el = mount()
    expect(btn(el).classList.contains('primary')).toBe(true)
    el.setAttribute('type', 'default')
    expect(btn(el).classList.contains('default')).toBe(true)
    expect(btn(el).classList.contains('primary')).toBe(false)
  })

  it('扩展文字：默认插槽有文字时自动 extended 胶囊形态（label 可见）', () => {
    const el = mount({}, '新建')
    expect(btn(el).classList.contains('extended')).toBe(true)
    const label = el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
    expect(label.hidden).toBe(false)
  })

  it('仅图标（无默认插槽文字）不进入 extended，label 隐藏', () => {
    const el = mount()
    expect(btn(el).classList.contains('extended')).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.hidden).toBe(true)
  })

  it('动态增删文字：slotchange 后 extended 与 label 同步', async () => {
    const el = mount()
    expect(btn(el).classList.contains('extended')).toBe(false)
    const text = document.createTextNode('新建')
    el.appendChild(text)
    await new Promise((r) => setTimeout(r, 0))
    expect(btn(el).classList.contains('extended')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.hidden).toBe(false)
    el.removeChild(text)
    await new Promise((r) => setTimeout(r, 0))
    expect(btn(el).classList.contains('extended')).toBe(false)
  })

  it('size：五档全称 xs/small/medium/large/xl，默认 large（data-size 同步；sm/md/lg 为等价别名）', () => {
    const el = mount()
    expect(el.getAttribute('data-size')).toBe('large')
    const aliasToFull: Record<string, string> = { xs: 'xs', sm: 'small', md: 'medium', xl: 'xl' }
    for (const [input, out] of Object.entries(aliasToFull)) {
      el.setAttribute('size', input)
      expect(el.getAttribute('data-size')).toBe(out)
    }
  })

  it('size 全称归一：medium/small 输入恒输出全称 data-size（shared/size）', () => {
    const el = mount()
    el.setAttribute('size', 'medium')
    expect(el.getAttribute('data-size')).toBe('medium')
    el.setAttribute('size', 'small')
    expect(el.getAttribute('data-size')).toBe('small')
  })

  it('size：非法值回落 large 并 console.warn 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(el.getAttribute('data-size')).toBe('large')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('非法 size'))
  })

  it('disabled：原生 disabled + aria-disabled，点击不派发 oas-click', () => {
    const el = mount({ disabled: '' })
    const b = btn(el) as HTMLButtonElement
    expect(b.disabled).toBe(true)
    expect(b.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    b.click()
    expect(fired).toBe(0)
  })

  it('非 disabled 时无原生禁用与 aria-disabled', () => {
    const el = mount()
    const b = btn(el) as HTMLButtonElement
    expect(b.disabled).toBe(false)
    expect(b.hasAttribute('aria-disabled')).toBe(false)
  })

  it('href 渲染 a 元素并透传 target（原生链接语义）', () => {
    const el = mount({ href: 'https://example.com', target: '_blank' })
    const a = el.shadowRoot!.querySelector<HTMLAnchorElement>('a[part="btn"]')
    expect(a).not.toBeNull()
    expect(a!.getAttribute('href')).toBe('https://example.com')
    expect(a!.getAttribute('target')).toBe('_blank')
    expect(el.shadowRoot!.querySelector('button[part="btn"]')).toBeNull()
  })

  it('href + disabled 降级为 span（不可点击、aria-disabled）', () => {
    const el = mount({ href: 'https://example.com', disabled: '' })
    expect(el.shadowRoot!.querySelector('a[part="btn"]')).toBeNull()
    const span = el.shadowRoot!.querySelector<HTMLElement>('span[part="btn"]')
    expect(span).not.toBeNull()
    expect(span!.getAttribute('aria-disabled')).toBe('true')
  })

  it('href 增删触发 shadow 重建（button ↔ a 切换）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('button[part="btn"]')).not.toBeNull()
    el.setAttribute('href', '#x')
    expect(el.shadowRoot!.querySelector('a[part="btn"]')).not.toBeNull()
    el.removeAttribute('href')
    expect(el.shadowRoot!.querySelector('button[part="btn"]')).not.toBeNull()
  })

  it('定位 CSS 变量开口：--oas-float-button-bottom/right 默认 space-6', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('var(--oas-float-button-bottom, var(--oas-space-6))')
    expect(style).toContain('var(--oas-float-button-right, var(--oas-space-6))')
  })

  it('aria-label：纯图标用 locale 文案；有可见文字时让位（不覆盖）', () => {
    const el = mount()
    expect(btn(el).getAttribute('aria-label')).toBe('悬浮操作')
    const el2 = mount({}, '新建')
    expect(btn(el2).hasAttribute('aria-label')).toBe(false)
  })

  it('宿主显式 aria-label 优先', () => {
    const el = mount({}, '新建')
    el.setAttribute('aria-label', '自定义标签')
    expect(btn(el).getAttribute('aria-label')).toBe('自定义标签')
  })
})

// ===== draggable 拖拽 + magnetic 磁吸 =====

/** 拖拽/点击判定阈值：位移 >4px 视为拖拽（与组件常量一致） */
const DRAG_THRESHOLD = 4

/** 向 shadow 内 .btn 派发 pointer 事件（与组件监听目标一致） */
function pointer(target: HTMLElement, type: string, x: number, y: number): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      clientX: x,
      clientY: y,
      button: 0,
    }),
  )
}

describe('OASFloatButton draggable + magnetic', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('observedAttributes 声明 draggable / magnetic', () => {
    expect(OASFloatButton.observedAttributes).toContain('draggable')
    expect(OASFloatButton.observedAttributes).toContain('magnetic')
  })

  it('draggable：pointer 拖拽把位置写入 host 内联 left/top（fixed 定位系），清空 bottom/right', () => {
    const el = mount({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 150)
    expect(el.style.left).toBe('200px')
    expect(el.style.top).toBe('150px')
    expect(el.style.bottom).toBe('')
    expect(el.style.right).toBe('')
    pointer(btn(el), 'pointerup', 200, 150)
  })

  it('拖拽位移超阈值（>4px）：pointerup 后合成 click 被抑制，不派发 oas-click；下次真实点击恢复', () => {
    const el = mount({ draggable: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 200, 100) // dx=100 > 4
    pointer(btn(el), 'pointerup', 200, 100)
    // 浏览器在捕获目标上合成的 click → 被抑制
    btn(el).click()
    expect(fired).toBe(0)
    // 下一次真实点击恢复正常
    btn(el).click()
    expect(fired).toBe(1)
  })

  it('拖拽位移在阈值内（≤4px）视为点击：仍派发 oas-click', () => {
    const el = mount({ draggable: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 102, 101) // dx=2, dy=1 ≤ 4
    pointer(btn(el), 'pointerup', 102, 101)
    btn(el).click()
    expect(fired).toBe(1)
  })

  it('边界夹取：拖出视口回夹到边缘（left/top 不超视口）', () => {
    const el = mount({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 900,
      top: 700,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 900, 700)
    pointer(btn(el), 'pointermove', 900 + 2000, 700 + 2000)
    expect(el.style.left).toBe(`${window.innerWidth}px`)
    expect(el.style.top).toBe(`${window.innerHeight}px`)
    pointer(btn(el), 'pointerup', 900 + 2000, 700 + 2000)
  })

  it('无 magnetic：松手保持拖拽位置（不吸附）', () => {
    const el = mount({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 120)
    pointer(btn(el), 'pointerup', 200, 120)
    expect(el.style.left).toBe('200px')
    expect(el.style.top).toBe('120px')
  })

  it('magnetic="x"：松手吸附到最近的左右边缘（左近贴左、右近贴右）', () => {
    // 右近：left=900 距右 124 < 距左 900 → 贴右
    const el = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 900,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 900, 80)
    pointer(btn(el), 'pointermove', 1000, 120)
    pointer(btn(el), 'pointerup', 1000, 120)
    expect(el.style.left).toBe(`${window.innerWidth}px`)
    // 左近：left=100 距左 100 < 距右 924 → 贴左
    const el2 = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el2, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el2), 'pointerdown', 100, 80)
    pointer(btn(el2), 'pointermove', 200, 120)
    pointer(btn(el2), 'pointerup', 200, 120)
    expect(el2.style.left).toBe('0px')
  })

  it('magnetic="y"：松手吸附到最近的上下边缘', () => {
    // 下近：top=730 距下 38 < 距上 730 → 贴下
    const el = mount({ draggable: '', magnetic: 'y' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 700,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 700)
    pointer(btn(el), 'pointermove', 150, 730)
    pointer(btn(el), 'pointerup', 150, 730)
    expect(el.style.top).toBe(`${window.innerHeight}px`)
  })

  it('magnetic 吸附带过渡：拖拽中 transition 置 none（跟手），吸附时恢复 left/top 过渡', () => {
    const el = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    expect(el.style.transition).toBe('none') // 拖拽中禁止过渡（跟手）
    pointer(btn(el), 'pointermove', 200, 120)
    pointer(btn(el), 'pointerup', 200, 120) // 吸附：恢复过渡
    expect(el.style.transition).toContain('left')
    expect(el.style.transition).toContain('var(--oas-transition-base)')
  })

  it('reduced-motion：磁吸位置直切（无过渡）', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true }) as MediaQueryList)
    const el = mount({ draggable: '', magnetic: 'x' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 80,
      width: 48,
      height: 48,
    } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 120)
    pointer(btn(el), 'pointerup', 200, 120)
    expect(el.style.left).toBe('0px') // 吸附到位
    expect(el.style.transition).toBe('none') // 直切无过渡
  })

  it('非 draggable：pointer 拖拽零行为变化（不写位置、点击照常派发）', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 300, 300)
    pointer(btn(el), 'pointerup', 300, 300)
    expect(el.style.left).toBe('')
    expect(el.style.top).toBe('')
    expect(el.style.bottom).toBe('')
    btn(el).click()
    expect(fired).toBe(1)
  })

  it('禁用态不可拖：pointer 拖拽不移动位置', () => {
    const el = mount({ draggable: '', disabled: '' })
    pointer(btn(el), 'pointerdown', 100, 100)
    pointer(btn(el), 'pointermove', 300, 300)
    pointer(btn(el), 'pointerup', 300, 300)
    expect(el.style.left).toBe('')
    expect(el.style.top).toBe('')
  })

  it('draggable 时 touch-action:none（拖拽不触发手势滚动）；非 draggable 时为空（零回归）', () => {
    const el = mount({ draggable: '' })
    expect(el.style.touchAction).toBe('none')
    el.removeAttribute('draggable')
    expect(el.style.touchAction).toBe('')
  })

  // ===== RTL（右到左）逻辑方向化 =====

  describe('RTL 逻辑方向化', () => {
    it('dir=rtl 时宿主打 data-rtl 钩子，移除 dir 后回退', () => {
      const el = mount()
      expect(el.hasAttribute('data-rtl')).toBe(false)
      el.setAttribute('dir', 'rtl')
      expect(el.hasAttribute('data-rtl')).toBe(true)
      el.removeAttribute('dir')
      expect(el.hasAttribute('data-rtl')).toBe(false)
    })

    it('RTL：badge 走逻辑 inset；悬浮定位开口保留物理（--oas-float-button-right 显式物理 API）', () => {
      const el = mount({ badge: '5' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.badge\s*\{[^}]*inset-inline-end:/)
      // 位置 API 保留物理：宿主覆盖变量仍作用于 right
      expect(css).toContain('--oas-float-button-right')
    })
  })
})

// ===== 家族扩展：mode（single/group/menu）+ 受控展开 + 链接化 + 徽标封顶 =====

/** group 容器（shadow 内展开层根） */
function groupEl(el: OASFloatButton): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="group"]')!
}

/** group 子钮容器 */
function actionsLayer(el: OASFloatButton): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="actions"]')!
}

/** menu 面板 */
function menuEl(el: OASFloatButton): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="menu"]')!
}

/** mirror 层（气泡 + 徽标锚点层）各项 */
function mirrors(el: OASFloatButton): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.mirror')]
}

/** menu 菜单项 */
function menuItems(el: OASFloatButton): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
}

/** light DOM 子钮（slot="action"） */
function slotted(el: OASFloatButton): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('[slot="action"]')]
}

/** group 模式挂载：默认 3 个子钮（可覆盖） */
function mountGroup(attrs: Record<string, string> = {}, count = 3): OASFloatButton {
  const labels = ['编辑', '复制', '删除']
  const inner =
    `<span slot="icon">＋</span>` +
    Array.from(
      { length: count },
      (_, i) => `<button slot="action" type="button" label="${labels[i] ?? `项${i}`}">✎</button>`,
    ).join('')
  return mount({ mode: 'group', ...attrs }, inner)
}

describe('OASFloatButton 家族扩展：mode 结构', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('mode 默认 single：data-mode="single"，无展开容器，主钮无 aria-expanded/haspopup', () => {
    const el = mount()
    expect(el.getAttribute('data-mode')).toBe('single')
    expect(el.shadowRoot!.querySelector('[part="group"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="menu"]')).toBeNull()
    expect(btn(el).hasAttribute('aria-expanded')).toBe(false)
    expect(btn(el).hasAttribute('aria-haspopup')).toBe(false)
  })

  it('mode=group：渲染 group 容器 + actions 层 + mirror 层，主钮 aria-haspopup="true"', () => {
    const el = mountGroup()
    expect(groupEl(el)).not.toBeNull()
    expect(actionsLayer(el)).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot[name="action"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="menu"]')).toBeNull()
    expect(btn(el).getAttribute('aria-haspopup')).toBe('true')
    expect(btn(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('mode=menu：渲染 role="menu" 面板，主钮 aria-haspopup="menu"', () => {
    const el = mount({
      mode: 'menu',
      actions: JSON.stringify([{ label: '编辑' }]),
    })
    const menu = menuEl(el)
    expect(menu).not.toBeNull()
    expect(menu.getAttribute('role')).toBe('menu')
    expect(btn(el).getAttribute('aria-haspopup')).toBe('menu')
  })

  it('mode 非法值回落 single 并 console.warn 告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ mode: 'stacked' })
    expect(el.getAttribute('data-mode')).toBe('single')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('非法 mode'))
    el.setAttribute('mode', 'stacked')
    expect(warn).toHaveBeenCalledTimes(1) // 同值去重
  })

  it('mode 运行时切换重建 shadow（single ↔ group）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="group"]')).toBeNull()
    el.setAttribute('mode', 'group')
    expect(groupEl(el)).not.toBeNull()
    el.setAttribute('mode', 'single')
    expect(el.shadowRoot!.querySelector('[part="group"]')).toBeNull()
    expect(btn(el)).not.toBeNull() // 主钮始终在
  })

  it('observedAttributes 声明 mode/expanded/trigger/expand-direction/actions', () => {
    for (const name of ['mode', 'expanded', 'trigger', 'expand-direction', 'actions']) {
      expect(OASFloatButton.observedAttributes).toContain(name)
    }
  })
})

describe('OASFloatButton group 展开/受控/触发', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('trigger 默认 click：点击主钮展开（expanded 属性 + open 类 + aria-expanded），再点收起', () => {
    const el = mountGroup()
    btn(el).click()
    expect(el.hasAttribute('expanded')).toBe(true)
    expect(groupEl(el).classList.contains('open')).toBe(true)
    expect(btn(el).getAttribute('aria-expanded')).toBe('true')
    btn(el).click()
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(groupEl(el).classList.contains('open')).toBe(false)
    expect(btn(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('展开/收起派发 oas-expand-change，detail 精确为 { expanded: true/false }', () => {
    const el = mountGroup()
    const events: unknown[] = []
    el.addEventListener('oas-expand-change', (e) => events.push((e as CustomEvent).detail))
    btn(el).click()
    btn(el).click()
    expect(events).toEqual([{ expanded: true }, { expanded: false }])
  })

  it('expanded 受控初值：挂载即展开；宿主移除属性即收起（宿主操作不派发事件）', () => {
    const events: unknown[] = []
    const el = mountGroup({ expanded: '' })
    el.addEventListener('oas-expand-change', (e) => events.push((e as CustomEvent).detail))
    expect(groupEl(el).classList.contains('open')).toBe(true)
    el.removeAttribute('expanded')
    expect(groupEl(el).classList.contains('open')).toBe(false)
    expect(events).toEqual([])
  })

  it('trigger=manual：点击主钮不切换；宿主设置 expanded 属性即展开', () => {
    const el = mountGroup({ trigger: 'manual' })
    btn(el).click()
    expect(el.hasAttribute('expanded')).toBe(false)
    el.setAttribute('expanded', '')
    expect(groupEl(el).classList.contains('open')).toBe(true)
  })

  it('trigger=hover：mouseenter 展开、mouseleave 120ms 宽限后收起；宽限期内移入面板不收起', () => {
    vi.useFakeTimers()
    const el = mountGroup({ trigger: 'hover' })
    const events: unknown[] = []
    el.addEventListener('oas-expand-change', (e) => events.push((e as CustomEvent).detail))
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('expanded')).toBe(true)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    expect(el.hasAttribute('expanded')).toBe(true) // 宽限期内
    vi.advanceTimersByTime(119)
    expect(el.hasAttribute('expanded')).toBe(true)
    vi.advanceTimersByTime(2)
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(events).toEqual([{ expanded: true }, { expanded: false }])
    // 移入面板：不触发收起
    el.dispatchEvent(new MouseEvent('mouseenter'))
    el.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: actionsLayer(el) }))
    vi.advanceTimersByTime(300)
    expect(el.hasAttribute('expanded')).toBe(true)
    vi.useRealTimers()
  })

  it('hover 触发在 coarse pointer 下回落 click（mouseenter 不展开）', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true }) as MediaQueryList)
    const el = mountGroup({ trigger: 'hover' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('expanded')).toBe(false)
  })

  it('外点收起：展开后点击组件外部元素收起', () => {
    const el = mountGroup({ expanded: '' })
    const outside = document.createElement('button')
    outside.textContent = '外部'
    document.body.appendChild(outside)
    outside.click()
    expect(el.hasAttribute('expanded')).toBe(false)
  })

  it('Esc 收起并回焦主钮（menu/group 通用）', () => {
    const el = mountGroup({ expanded: '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(btn(el))
  })

  it('disabled：点击主钮不展开也不派发 expand-change', () => {
    const el = mountGroup({ disabled: '' })
    const events: unknown[] = []
    el.addEventListener('oas-expand-change', (e) => events.push((e as CustomEvent).detail))
    btn(el).click()
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(events).toEqual([])
  })

  it('draggable 拖拽超阈值：合成 click 被抑制，不误切换展开', () => {
    const el = mountGroup({ draggable: '' })
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 80, width: 48, height: 48 } as DOMRect)
    pointer(btn(el), 'pointerdown', 100, 80)
    pointer(btn(el), 'pointermove', 200, 120) // dx=100 > 4
    pointer(btn(el), 'pointerup', 200, 120)
    btn(el).click() // 拖拽后合成 click
    expect(el.hasAttribute('expanded')).toBe(false)
  })
})

describe('OASFloatButton group 子钮（slot=action）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('mirror 层与子钮数量对齐（3 个子钮 → 3 个 mirror 锚点）', () => {
    const el = mountGroup()
    expect(slotted(el)).toHaveLength(3)
    expect(mirrors(el)).toHaveLength(3)
  })

  it('子钮 label 属性 → mirror 气泡文本同步；无 label 属性的气泡为空', () => {
    const el = mountGroup()
    const texts = mirrors(el).map((m) => m.querySelector('.bubble')!.textContent)
    expect(texts).toEqual(['编辑', '复制', '删除'])
  })

  it('hover 子钮 → 对应 mirror 气泡显示（bubble-on），移出清除', () => {
    const el = mountGroup()
    const kids = slotted(el)
    kids[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    const states = mirrors(el).map((m) => m.classList.contains('bubble-on'))
    expect(states).toEqual([false, true, false])
    kids[1]!.dispatchEvent(new MouseEvent('mouseleave'))
    expect(mirrors(el).every((m) => !m.classList.contains('bubble-on'))).toBe(true)
  })

  it('键盘 focusin 子钮同样点亮气泡（键盘可达）', () => {
    const el = mountGroup()
    slotted(el)[0]!.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(mirrors(el)[0]!.classList.contains('bubble-on')).toBe(true)
    slotted(el)[0]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect(mirrors(el)[0]!.classList.contains('bubble-on')).toBe(false)
  })

  it('子钮 badge 属性 → mirror 徽标：数字 / dot 状态点 / 99+ 封顶', () => {
    const el = mount(
      { mode: 'group' },
      `<span slot="icon">＋</span>` +
        `<button slot="action" type="button" badge="3">a</button>` +
        `<button slot="action" type="button" badge="dot">b</button>` +
        `<button slot="action" type="button" badge="120">c</button>`,
    )
    const badges = mirrors(el).map((m) => m.querySelector('.mini-badge')!)
    expect(badges[0]!.textContent).toBe('3')
    expect(badges[0]!.classList.contains('dot')).toBe(false)
    expect(badges[1]!.classList.contains('dot')).toBe(true)
    expect(badges[2]!.textContent).toBe('99+')
  })

  it('slotchange 动态增删子钮 → mirror 层同步', async () => {
    const el = mountGroup({}, 2)
    expect(mirrors(el)).toHaveLength(2)
    const added = document.createElement('button')
    added.setAttribute('slot', 'action')
    added.setAttribute('label', '新项')
    el.appendChild(added)
    await new Promise((r) => setTimeout(r, 0))
    expect(mirrors(el)).toHaveLength(3)
    el.removeChild(added)
    await new Promise((r) => setTimeout(r, 0))
    expect(mirrors(el)).toHaveLength(2)
  })

  it('点击子钮 → 组收起并派发 expand-change（组语义：选择即收起）', () => {
    const el = mountGroup({ expanded: '' })
    const events: unknown[] = []
    el.addEventListener('oas-expand-change', (e) => events.push((e as CustomEvent).detail))
    slotted(el)[0]!.click()
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(events).toEqual([{ expanded: false }])
  })

  it('expand-direction：data-dir 同步，非法值回落 up；RTL 下 left↔right 镜像', () => {
    const el = mountGroup({ 'expand-direction': 'left' })
    expect(groupEl(el).getAttribute('data-dir')).toBe('left')
    el.setAttribute('expand-direction', 'bogus')
    expect(groupEl(el).getAttribute('data-dir')).toBe('up')
    el.setAttribute('expand-direction', 'left')
    el.setAttribute('dir', 'rtl')
    expect(groupEl(el).getAttribute('data-dir')).toBe('right') // 书写方向镜像
    el.setAttribute('expand-direction', 'right')
    expect(groupEl(el).getAttribute('data-dir')).toBe('left')
  })

  it('group 方向键导航：纵向 ArrowDown/ArrowUp 在子钮间循环，Home/End 跳首尾', () => {
    const el = mountGroup({ expanded: '' })
    const kids = slotted(el)
    kids[0]!.focus()
    const key = (target: Element, key: string) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    key(kids[0]!, 'ArrowDown')
    expect(document.activeElement).toBe(kids[1])
    key(kids[1]!, 'ArrowDown')
    expect(document.activeElement).toBe(kids[2])
    key(kids[2]!, 'ArrowDown')
    expect(document.activeElement).toBe(kids[0]) // 循环
    key(kids[0]!, 'End')
    expect(document.activeElement).toBe(kids[2])
    key(kids[2]!, 'Home')
    expect(document.activeElement).toBe(kids[0])
  })
})

describe('OASFloatButton menu 模式', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function mountMenu(actions: unknown, attrs: Record<string, string> = {}): OASFloatButton {
    return mount({ mode: 'menu', actions: JSON.stringify(actions), ...attrs }, `<span slot="icon">＋</span>`)
  }

  it('actions JSON 渲染菜单项：无 href 为 button[role=menuitem]，含 icon 与 label', () => {
    const el = mountMenu([
      { label: '编辑', icon: 'edit' },
      { label: '复制', icon: 'copy' },
    ])
    const items = menuItems(el)
    expect(items).toHaveLength(2)
    expect(items[0]!.tagName).toBe('BUTTON')
    expect(items[0]!.getAttribute('role')).toBe('menuitem')
    expect(items[0]!.textContent).toContain('编辑')
    expect(items[0]!.querySelector('svg')).not.toBeNull() // icon 渲染
  })

  it('href action 渲染为链接菜单项 a[role=menuitem]，target 透传（与可点动作互斥）', () => {
    const el = mountMenu([{ label: '文档', href: 'https://example.com', target: '_blank' }, { label: '普通' }])
    const items = menuItems(el)
    expect(items[0]!.tagName).toBe('A')
    expect(items[0]!.getAttribute('href')).toBe('https://example.com')
    expect(items[0]!.getAttribute('target')).toBe('_blank')
    expect(items[0]!.getAttribute('role')).toBe('menuitem')
    expect(items[1]!.tagName).toBe('BUTTON')
  })

  it('菜单项 badge：数字与 99+ 封顶与 dot', () => {
    const el = mountMenu([
      { label: 'a', badge: '5' },
      { label: 'b', badge: 'dot' },
      { label: 'c', badge: '100' },
    ])
    const badges = menuItems(el).map((i) => i.querySelector('.mini-badge')!)
    expect(badges[0]!.textContent).toBe('5')
    expect(badges[1]!.classList.contains('dot')).toBe(true)
    expect(badges[2]!.textContent).toBe('99+')
  })

  it('点击菜单项 → 派发 oas-select { index, label }（链接项附 href）并收起', () => {
    const el = mountMenu([{ label: '编辑' }, { label: '文档', href: 'https://example.com' }])
    const selects: unknown[] = []
    el.addEventListener('oas-select', (e) => selects.push((e as CustomEvent).detail))
    el.setAttribute('expanded', '')
    menuItems(el)[0]!.click()
    expect(selects[0]).toEqual({ index: 0, label: '编辑' })
    expect(el.hasAttribute('expanded')).toBe(false)
    el.setAttribute('expanded', '')
    menuItems(el)[1]!.click()
    expect(selects[1]).toEqual({ index: 1, label: '文档', href: 'https://example.com' })
  })

  it('actions 非法 JSON → 空菜单不抛异常', () => {
    const el = mount({ mode: 'menu', actions: '{oops' })
    expect(menuItems(el)).toHaveLength(0)
    expect(btn(el)).not.toBeNull()
  })

  it('menu 展开方向只支持纵向：down 生效，left/非法值回落 up', () => {
    const el = mountMenu([{ label: 'a' }], { 'expand-direction': 'down' })
    expect(menuEl(el).getAttribute('data-dir')).toBe('down')
    el.setAttribute('expand-direction', 'left')
    expect(menuEl(el).getAttribute('data-dir')).toBe('up')
  })

  it('manual 展开态：外点与 Esc 均不自动收起（完全受控，收起由宿主驱动）', () => {
    const el = mountMenu([{ label: 'a' }], { mode: 'group', trigger: 'manual', expanded: '' })
    expect(el.hasAttribute('expanded')).toBe(true)
    document.body.click()
    expect(el.hasAttribute('expanded'), 'manual 模式外点不收起').toBe(true)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.hasAttribute('expanded'), 'manual 模式 Esc 不收起').toBe(true)
    el.removeAttribute('expanded') // 宿主驱动收起
    expect(el.hasAttribute('expanded')).toBe(false)
  })

  it('展开态下属性变化不重复抢焦（焦点保持不变）', () => {
    const el = mountMenu([{ label: 'a' }, { label: 'b' }], { expanded: '' })
    const items = menuItems(el)
    expect(el.shadowRoot!.activeElement).toBe(items[0]) // 展开过渡聚焦首项
    // 聚焦第 2 项后，宿主改无关属性（badge）→ update 重建菜单项 → 焦点应保持同位（第 2 项），
    // 不得被拉回首项（旧实现每次 update 无条件聚焦首项）
    menuItems(el)[1]!.focus()
    el.setAttribute('badge', '5')
    const after = menuItems(el)
    expect(el.shadowRoot!.activeElement, '更新后焦点应保持同位（第 2 项）').toBe(after[1])
  })

  it('menu 选择后焦点归还主钮（APG menu 惯例）', () => {
    const el = mountMenu([{ label: 'a' }, { label: 'b' }], { expanded: '' })
    const items = menuItems(el)
    el.shadowRoot!.activeElement === items[0]
    items[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(el.shadowRoot!.activeElement, '选择后焦点应归还主钮').toBe(btn(el))
  })

  it('键盘：展开自动聚焦首项，ArrowDown/Up 循环，Home/End 跳首尾', () => {
    const el = mountMenu([{ label: 'a' }, { label: 'b' }, { label: 'c' }], { expanded: '' })
    const items = menuItems(el)
    expect(el.shadowRoot!.activeElement).toBe(items[0]) // 展开自动聚焦首项
    const key = (target: Element, key: string) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    key(menuEl(el), 'ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(items[1])
    key(menuEl(el), 'ArrowDown')
    key(menuEl(el), 'ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(items[0]) // 循环
    key(menuEl(el), 'ArrowUp')
    expect(el.shadowRoot!.activeElement).toBe(items[2])
    key(menuEl(el), 'Home')
    expect(el.shadowRoot!.activeElement).toBe(items[0])
    key(menuEl(el), 'End')
    expect(el.shadowRoot!.activeElement).toBe(items[2])
  })
})

describe('OASFloatButton 徽标封顶 + 触控目标', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('主钮徽标数字封顶：badge="120" → 99+；普通数字原样；dot → 状态点（空文本 + dot 类）', () => {
    const el = mount({ badge: '120' })
    const badge = el.shadowRoot!.querySelector<HTMLElement>('[part="badge"]')!
    expect(badge.textContent).toBe('99+')
    el.setAttribute('badge', '7')
    expect(badge.textContent).toBe('7')
    el.setAttribute('badge', 'dot')
    expect(badge.textContent).toBe('')
    expect(badge.classList.contains('dot')).toBe(true)
    el.setAttribute('badge', 'hot')
    expect(badge.textContent).toBe('hot')
    expect(badge.classList.contains('dot')).toBe(false)
  })

  it('coarse pointer 媒体查询进样式表：子钮与菜单项触控目标走 --oas-touch-target-min（默认 44px）', () => {
    const el = mountGroup()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@media (pointer: coarse)')
    expect(css).toContain('var(--oas-touch-target-min, 44px)')
  })

  it('展开过渡进样式表，reduced-motion 下降级（transition none）', () => {
    const el = mountGroup()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.group\.open\s+\.actions|\.group\.open \.actions/)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('断开连接后重新连接仍可用且无孤儿监听', () => {
    const el = mountGroup({ expanded: '' })
    el.remove()
    document.body.appendChild(el)
    expect(groupEl(el).classList.contains('open')).toBe(true)
    btn(el).click()
    expect(el.hasAttribute('expanded')).toBe(false)
  })
})

// ===== DSD 真水合（SSR 双路径） =====

type AnyElement = OASFloatButton

/** 渲染一个参照实例并返回其 shadow 快照（SSR 场景等价物） */
function captureFbSnapshot(setup?: (el: AnyElement) => void): string {
  const el = new OASFloatButton()
  setup?.(el)
  document.body.appendChild(el)
  const html = el.shadowRoot!.innerHTML
  el.remove()
  return html
}

/** 注入快照 + 指纹后升级（模拟浏览器 DSD upgrade） */
function upgradeFromFbSnapshot(
  shadowHtml: string,
  setup?: (el: AnyElement) => void,
): { el: AnyElement; styleRef: Element | null } {
  const el = new OASFloatButton()
  const tag = el.tagName.toLowerCase()
  el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1">${shadowHtml}`
  setup?.(el)
  const styleRef = el.shadowRoot!.querySelector('style')
  document.body.appendChild(el)
  return { el, styleRef }
}

describe('OASFloatButton DSD 真水合', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('single 分支：hydrate 接管（style 引用保持、指纹移除、主钮/徽标结构保持）', () => {
    const setup = (e: OASFloatButton): void => {
      e.setAttribute('badge', '3')
      e.innerHTML = '<span slot="icon">+</span>'
    }
    const snap = captureFbSnapshot(setup)
    const { el, styleRef } = upgradeFromFbSnapshot(snap, setup)
    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="btn"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="badge"]')).not.toBeNull()
    expect(snap).toContain('<style>')
  })

  it('group 分支：水合后子钮点击收起组（交互可用、焦点归还主钮）', () => {
    const setup = (e: OASFloatButton): void => {
      e.setAttribute('mode', 'group')
      e.setAttribute('expanded', '')
      e.innerHTML = '<button slot="action">一</button>'
    }
    const snap = captureFbSnapshot(setup)
    const { el } = upgradeFromFbSnapshot(snap, setup)
    expect(el.shadowRoot!.querySelector('[part="group"]')).not.toBeNull()
    ;(el.querySelector('[slot="action"]') as HTMLElement).click()
    expect(el.hasAttribute('expanded'), '水合后子钮点击应收起组').toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="btn"]'))
  })

  it('menu 分支：水合后 actions 重建菜单项、选择派发 oas-select', () => {
    const setup = (e: OASFloatButton): void => {
      e.setAttribute('mode', 'menu')
      e.setAttribute('expanded', '')
      e.setAttribute('actions', JSON.stringify([{ label: '编辑' }, { label: '删除' }]))
    }
    const snap = captureFbSnapshot(setup)
    const { el } = upgradeFromFbSnapshot(snap, setup)
    expect(el.shadowRoot!.querySelector('[part="menu"]')).not.toBeNull()
    const items = el.shadowRoot!.querySelectorAll('[role="menuitem"]')
    expect(items.length).toBe(2) // 水合后 update 重建菜单项（监听器随重建重挂）
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    ;(items[1] as HTMLElement).click()
    expect(detail).toEqual({ index: 1, label: '删除' })
  })

  it('坏快照（缺 .btn）→ hydrate 返回 false → render 全量重建兜底', () => {
    const el = new OASFloatButton()
    el.shadowRoot!.innerHTML = '<div>残缺</div>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="btn"]')).not.toBeNull()
  })
})
