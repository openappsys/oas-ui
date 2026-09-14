import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASAppBar } from './index.js'

/**
 * oas-app-bar（应用栏）单元测试。
 *
 * happy-dom 限制：CSS 类样式不进 element.style、getComputedStyle 不解析 var()——
 * 涉及样式的断言一律走「属性/类名 + shadow 内 style 文本」双重路径；
 * 滚动相关用 defineProperty 覆写 window.scrollY + 派发 scroll 事件模拟。
 */

type MountOptions = {
  attrs?: Record<string, string>
  html?: string
}

function mount(opts: MountOptions = {}): OASAppBar {
  const el = new OASAppBar()
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  if (opts.html) el.innerHTML = opts.html
  document.body.appendChild(el)
  return el
}

const barEl = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
const rowEl = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!
const leadingWrap = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="leading"]')!
const menuBtn = (el: OASAppBar): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="menu-button"]')!
const titlePart = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
const actionsWrap = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="actions"]')!
const trailingWrap = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="trailing"]')!
const extendedWrap = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="extended"]')!
const moreBtn = (el: OASAppBar): HTMLButtonElement => el.shadowRoot!.querySelector<HTMLButtonElement>('[part="more"]')!
const morePanel = (el: OASAppBar): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!
const actionsSlot = (el: OASAppBar): HTMLSlotElement =>
  el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="actions"]')!

/** actions 具名插槽当前分配的元素（宿主放的操作按钮） */
function assignedActions(el: OASAppBar): HTMLElement[] {
  return actionsSlot(el).assignedElements() as HTMLElement[]
}

function styleText(el: OASAppBar): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

/** actions 溢出测量 mock：容器可用宽 avail + 各项固有宽 widths + 「···」宽 24 */
function mockOverflow(el: OASAppBar, widths: number[], avail: number): void {
  const wrap = actionsWrap(el)
  Object.defineProperty(wrap, 'clientWidth', { value: avail, configurable: true })
  const total = widths.reduce((a, b) => a + b, 0) + 4 * Math.max(0, widths.length - 1)
  Object.defineProperty(wrap, 'scrollWidth', { value: total, configurable: true })
  assignedActions(el).forEach((k, i) => {
    Object.defineProperty(k, 'offsetWidth', { value: widths[i], configurable: true })
  })
  Object.defineProperty(moreBtn(el), 'offsetWidth', { value: 24, configurable: true })
}

/** happy-dom 中 window.scrollY 是只读 getter（恒 0），用 defineProperty 覆写模拟滚动位置 */
function mockScrollY(y: number): void {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
}

/** 模拟 window 滚动：改写 scrollY 并派发 scroll 事件 */
function scrollWindow(y: number): void {
  mockScrollY(y)
  window.dispatchEvent(new Event('scroll'))
}

beforeEach(() => {
  document.body.innerHTML = ''
  mockScrollY(0)
})

afterEach(() => {
  document.body.innerHTML = ''
  mockScrollY(0)
})

// ===== 结构与语义 =====

describe('OASAppBar 结构与语义', () => {
  it('role=banner + aria-label（内置文案走 t()）', () => {
    const el = mount()
    expect(barEl(el).getAttribute('role')).toBe('banner')
    expect(barEl(el).getAttribute('aria-label')).toBe('应用栏')
  })

  it('aria-label 随 locale 切换（zh-CN ↔ en）', () => {
    const el = mount()
    setLocale(en)
    expect(barEl(el).getAttribute('aria-label')).toBe('App bar')
    setLocale('zh-CN')
    expect(barEl(el).getAttribute('aria-label')).toBe('应用栏')
  })

  it('observedAttributes 完整（含 dir）', () => {
    expect(OASAppBar.observedAttributes).toEqual(
      expect.arrayContaining([
        'heading',
        'menu-button',
        'menu-open',
        'menu-controls',
        'position',
        'hide-on-scroll',
        'extended-collapse-on-scroll',
        'elevated',
        'dir',
      ]),
    )
  })

  it('heading 属性渲染进 title part，运行时变化跟随', () => {
    const el = mount({ attrs: { heading: '工作台' } })
    expect(titlePart(el).textContent).toBe('工作台')
    el.setAttribute('heading', '控制台')
    expect(titlePart(el).textContent).toBe('控制台')
  })

  it('slot="title" 富标题覆盖 heading 属性（title part 隐藏）', () => {
    const el = mount({ attrs: { heading: '属性标题' }, html: '<span slot="title">富标题</span>' })
    expect(titlePart(el).hidden).toBe(true)
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
    expect(slot.assignedNodes().some((n) => (n.textContent ?? '').includes('富标题'))).toBe(true)
  })

  it('slot="actions" / slot="trailing" 分发；有内容才渲染容器（空态无占位）', () => {
    const el = mount({ html: '<button slot="actions">一</button><span slot="trailing">尾</span>' })
    expect(actionsWrap(el).hidden).toBe(false)
    expect(trailingWrap(el).hidden).toBe(false)
    expect(assignedActions(el).length).toBe(1)
    const el2 = mount()
    expect(actionsWrap(el2).hidden).toBe(true)
    expect(trailingWrap(el2).hidden).toBe(true)
  })

  it('slot="leading" 分发；无 leading 内容且无 menu-button 时容器 hidden', () => {
    const el = mount({ html: '<span slot="leading">L</span>' })
    expect(leadingWrap(el).hidden).toBe(false)
    const el2 = mount()
    expect(leadingWrap(el2).hidden).toBe(true)
  })

  it('slot="extended" 分发；无内容时扩展区 hidden（不空占位）', () => {
    const el = mount({ html: '<div slot="extended">搜索框</div>' })
    expect(extendedWrap(el).hidden).toBe(false)
    const el2 = mount()
    expect(extendedWrap(el2).hidden).toBe(true)
  })
})

// ===== menu-button 汉堡钮 =====

describe('OASAppBar menu-button', () => {
  it('缺省无汉堡钮；menu-button 属性渲染（原生 button 可聚焦）', () => {
    const el = mount()
    expect(menuBtn(el).hidden).toBe(true)
    el.setAttribute('menu-button', '')
    expect(menuBtn(el).hidden).toBe(false)
  })

  it('汉堡钮 aria-label 走 i18n（locale 切换跟随）', () => {
    const el = mount({ attrs: { 'menu-button': '' } })
    expect(menuBtn(el).getAttribute('aria-label')).toBe('主菜单')
    setLocale(en)
    expect(menuBtn(el).getAttribute('aria-label')).toBe('Main menu')
    setLocale('zh-CN')
    expect(menuBtn(el).getAttribute('aria-label')).toBe('主菜单')
  })

  it('aria-expanded 跟随 menu-open 属性（增删同步）', () => {
    const el = mount({ attrs: { 'menu-button': '' } })
    expect(menuBtn(el).getAttribute('aria-expanded')).toBe('false')
    el.setAttribute('menu-open', '')
    expect(menuBtn(el).getAttribute('aria-expanded')).toBe('true')
    el.removeAttribute('menu-open')
    expect(menuBtn(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('aria-controls 跟随 menu-controls 属性（指向宿主抽屉 id，缺省移除）', () => {
    const el = mount({ attrs: { 'menu-button': '' } })
    expect(menuBtn(el).hasAttribute('aria-controls')).toBe(false)
    el.setAttribute('menu-controls', 'drawer-id')
    expect(menuBtn(el).getAttribute('aria-controls')).toBe('drawer-id')
    el.removeAttribute('menu-controls')
    expect(menuBtn(el).hasAttribute('aria-controls')).toBe(false)
  })

  it('点击派发 oas-menu-toggle（bubbles + composed）', () => {
    const el = mount({ attrs: { 'menu-button': '' } })
    let fired = 0
    let bubbles = false
    let composed = false
    el.addEventListener('oas-menu-toggle', (e: Event) => {
      fired++
      bubbles = e.bubbles
      composed = e.composed
    })
    menuBtn(el).click()
    expect(fired).toBe(1)
    expect(bubbles).toBe(true)
    expect(composed).toBe(true)
  })
})

// ===== position 定位形态 =====

describe('OASAppBar position 定位形态', () => {
  it('缺省与显式 static：data-position=static', () => {
    expect(mount().getAttribute('data-position')).toBe('static')
    expect(mount({ attrs: { position: 'static' } }).getAttribute('data-position')).toBe('static')
  })

  it('合法值 absolute/fixed/floating 映射 data-position（增删跟随）', () => {
    const el = mount()
    for (const p of ['absolute', 'fixed', 'floating']) {
      el.setAttribute('position', p)
      expect(el.getAttribute('data-position')).toBe(p)
    }
    el.removeAttribute('position')
    expect(el.getAttribute('data-position')).toBe('static')
  })

  it('非法值回落 static 并 console.warn 一次（同值去重）', () => {
    const warns: unknown[][] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      const el = mount({ attrs: { position: 'sticky' } })
      expect(el.getAttribute('data-position')).toBe('static')
      expect(warns.length).toBe(1)
      expect(String(warns[0]?.[0])).toContain('[oas-app-bar]')
      mount({ attrs: { position: 'sticky' } })
      expect(warns.length).toBe(1)
    } finally {
      console.warn = orig
    }
  })

  it('CSS：fixed/absolute 顶部定位走 --oas-app-bar-top 开口、z-index 走 z-index token', () => {
    const stl = styleText(mount())
    expect(stl).toMatch(/:host\(\[data-position='fixed'\]\)\s*\{[^}]*top:\s*var\(--oas-app-bar-top,\s*0px\)/)
    expect(stl).toMatch(
      /:host\(\[data-position='fixed'\]\)\s*\{[^}]*z-index:\s*calc\(var\(--oas-z-index-base,\s*0\)\s*\+\s*var\(--oas-z-fixed,\s*1030\)\)/,
    )
    expect(stl).toMatch(/:host\(\[data-position='absolute'\]\)\s*\{[^}]*position:\s*absolute/)
  })

  it('CSS：floating 圆角悬浮 + 投影 + 留边（--oas-app-bar-inset 开口、圆角走 token）', () => {
    const stl = styleText(mount())
    const rule = stl.split(":host([data-position='floating']) {")[1]?.split('}')[0] ?? ''
    expect(rule).toContain('position: fixed')
    expect(rule).toContain('border-radius: var(--oas-radius-lg)')
    expect(rule).toContain('var(--oas-app-bar-inset')
    expect(rule).toContain('box-shadow: var(--oas-app-bar-shadow')
    expect(rule).toContain('border: 1px solid var(--oas-color-border)')
  })
})

// ===== elevated 滚动投影 =====

describe('OASAppBar elevated 滚动投影', () => {
  it('滚动 scrollY>0 加 data-scrolled，回 0 移除（任意形态默认行为）', () => {
    const el = mount()
    expect(el.hasAttribute('data-scrolled')).toBe(false)
    scrollWindow(1)
    expect(el.hasAttribute('data-scrolled')).toBe(true)
    scrollWindow(0)
    expect(el.hasAttribute('data-scrolled')).toBe(false)
  })

  it('elevated 属性常显投影（CSS 规则存在，投影走 --oas-app-bar-shadow 开口）', () => {
    const stl = styleText(mount({ attrs: { elevated: '' } }))
    expect(stl).toMatch(/:host\(\[elevated\]\)[^{]*\{[^}]*box-shadow:\s*var\(--oas-app-bar-shadow/)
    expect(stl).toMatch(/:host\(\[data-scrolled\]\)[^{]*\{[^}]*box-shadow:\s*var\(--oas-app-bar-shadow/)
  })
})

// ===== overflow 溢出收纳 =====

describe('OASAppBar overflow 溢出收纳', () => {
  it('窄容器溢出项收进「···」（data-collapsed），镜像项点击回派原控件并关闭弹层', () => {
    const el = mount({
      html: '<button slot="actions">一</button><button slot="actions">二</button><button slot="actions">三</button>',
    })
    const btns = assignedActions(el)
    let clicked = 0
    btns[1]!.addEventListener('click', () => clicked++)
    mockOverflow(el, [60, 60, 60], 130)
    el.syncOverflow()
    expect(moreBtn(el).hidden).toBe(false)
    expect(btns[0]!.hasAttribute('data-collapsed')).toBe(false)
    expect(btns[1]!.hasAttribute('data-collapsed')).toBe(true)
    expect(btns[2]!.hasAttribute('data-collapsed')).toBe(true)
    // 打开弹层：镜像项数量与回派
    moreBtn(el).click()
    expect(morePanel(el).hidden).toBe(false)
    const mirrors = morePanel(el).querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    expect(mirrors.length).toBe(2)
    expect(mirrors[0]!.textContent).toBe('二')
    mirrors[0]!.click()
    expect(clicked).toBe(1)
    expect(morePanel(el).hidden).toBe(true)
  })

  it('无溢出时「···」隐藏、无 data-collapsed；再收窄后恢复收纳', () => {
    const el = mount({
      html: '<button slot="actions">一</button><button slot="actions">二</button>',
    })
    mockOverflow(el, [60, 60], 400)
    el.syncOverflow()
    expect(moreBtn(el).hidden).toBe(true)
    expect(assignedActions(el).every((b) => !b.hasAttribute('data-collapsed'))).toBe(true)
    mockOverflow(el, [60, 60], 70)
    el.syncOverflow()
    expect(moreBtn(el).hidden).toBe(false)
    expect(assignedActions(el)[1]!.hasAttribute('data-collapsed')).toBe(true)
  })

  it('clientWidth=0（SSR/未布局）不判定溢出——「···」不出现', () => {
    const el = mount({
      html: '<button slot="actions">一</button><button slot="actions">二</button>',
    })
    mockOverflow(el, [60, 60], 0)
    el.syncOverflow()
    expect(moreBtn(el).hidden).toBe(true)
  })

  it('「···」aria-haspopup="menu" + aria-expanded 同步 + aria-label（i18n）', () => {
    const el = mount({ html: '<button slot="actions">一</button>' })
    const more = moreBtn(el)
    expect(more.getAttribute('aria-haspopup')).toBe('menu')
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(more.getAttribute('aria-label')).toBe('更多操作')
    mockOverflow(el, [60, 60, 60], 100)
    el.syncOverflow()
    more.click()
    expect(more.getAttribute('aria-expanded')).toBe('true')
    more.click()
    expect(more.getAttribute('aria-expanded')).toBe('false')
  })

  it('弹层 role=menu + aria-label；镜像项文本取 aria-label > 文本 > 兜底 i18n', () => {
    const el = mount({
      html: '<button slot="actions" aria-label="明确标签">一</button><button slot="actions">按钮文本</button><span slot="actions"></span>',
    })
    mockOverflow(el, [60, 60, 60], 80)
    el.syncOverflow()
    const panel = morePanel(el)
    expect(panel.getAttribute('role')).toBe('menu')
    expect(panel.getAttribute('aria-label')).toBe('更多操作')
    moreBtn(el).click()
    const mirrors = panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    expect(mirrors.length).toBe(3)
    expect(mirrors[0]!.textContent).toBe('明确标签')
    expect(mirrors[1]!.textContent).toBe('按钮文本')
    expect(mirrors[2]!.textContent).toBe('操作项')
  })

  it('点「···」再点一次收起；Esc 关闭回焦「···」', () => {
    const el = mount({ html: '<button slot="actions">一</button>' })
    mockOverflow(el, [60, 60, 60], 100)
    el.syncOverflow()
    const more = moreBtn(el)
    const panel = morePanel(el)
    more.click()
    expect(panel.hidden).toBe(false)
    more.click()
    expect(panel.hidden).toBe(true)
    more.click()
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(panel.hidden).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(more)
  })

  it('弹层键盘：打开自动聚焦首个镜像项，方向键循环移动、Home/End 首尾', () => {
    const el = mount({
      html: '<button slot="actions">一</button><button slot="actions">二</button><button slot="actions">三</button>',
    })
    mockOverflow(el, [60, 60, 60], 100)
    el.syncOverflow()
    const more = moreBtn(el)
    const panel = morePanel(el)
    more.click()
    const mirrors = [...panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    expect(el.shadowRoot!.activeElement).toBe(mirrors[0])
    const key = (k: string): void => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    }
    key('ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(mirrors[1])
    key('ArrowUp')
    expect(el.shadowRoot!.activeElement).toBe(mirrors[0])
    key('ArrowUp')
    expect(el.shadowRoot!.activeElement).toBe(mirrors[mirrors.length - 1])
    key('Home')
    expect(el.shadowRoot!.activeElement).toBe(mirrors[0])
    key('End')
    expect(el.shadowRoot!.activeElement).toBe(mirrors[mirrors.length - 1])
  })

  it('document 外点关闭弹层（composing path 不含本组件时）', () => {
    const el = mount({ html: '<button slot="actions">一</button>' })
    mockOverflow(el, [60, 60, 60], 100)
    el.syncOverflow()
    moreBtn(el).click()
    expect(morePanel(el).hidden).toBe(false)
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(morePanel(el).hidden).toBe(true)
  })

  it('actions slotchange 后重算收纳（增删操作项跟随）', async () => {
    const el = mount({ html: '<button slot="actions">一</button>' })
    mockOverflow(el, [60], 400)
    el.syncOverflow()
    expect(moreBtn(el).hidden).toBe(true)
    const b2 = document.createElement('button')
    b2.setAttribute('slot', 'actions')
    b2.textContent = '二'
    el.appendChild(b2)
    await new Promise((r) => setTimeout(r, 0))
    mockOverflow(el, [60, 60], 70)
    el.syncOverflow()
    expect(moreBtn(el).hidden).toBe(false)
  })

  it('断开→重连后 document 外点关闭与 ResizeObserver 重算仍生效（监听不随断连丢失）', () => {
    let lastRO: { cb: () => void; observed: Element[] } | null = null
    class FakeRO {
      cb: () => void
      observed: Element[] = []
      constructor(cb: () => void) {
        this.cb = cb
        lastRO = this
      }
      observe(el: Element) {
        this.observed.push(el)
      }
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    try {
      const el = mount({
        html: '<button slot="actions">一</button><button slot="actions">二</button><button slot="actions">三</button>',
      })
      expect(lastRO).not.toBeNull()
      // 断开 → 重连：重连后 ResizeObserver 重新 observe
      el.remove()
      document.body.appendChild(el)
      expect(lastRO!.observed).toContain(el)
      // 外点关闭弹层恢复
      mockOverflow(el, [60, 60, 60], 100)
      el.syncOverflow()
      moreBtn(el).click()
      expect(morePanel(el).hidden).toBe(false)
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      expect(morePanel(el).hidden).toBe(true)
      // 宽度变化重算收纳恢复
      mockOverflow(el, [60, 60, 60], 70)
      lastRO!.cb()
      expect(assignedActions(el)[1]!.hasAttribute('data-collapsed')).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('CSS：收纳机制——::slotted([data-collapsed]) 隐藏、actions 溢出裁剪（clip 横轴放行纵轴）、弹层逻辑 inset', () => {
    const stl = styleText(mount())
    expect(stl).toMatch(/slot\[name="actions"\]::slotted\(\*\)\s*\{[^}]*flex-shrink:\s*0/)
    expect(stl).toMatch(/::slotted\(\[data-collapsed\]\)\s*\{[^}]*display:\s*none\s*!important/)
    expect(stl).toMatch(/\.actions\s*\{[^}]*overflow-x:\s*clip/)
    expect(stl).toMatch(/\.actions\s*\{[^}]*overflow-y:\s*visible/)
    // 弹层逻辑 inset：RTL 自动镜像，不允许物理 right/left
    expect(stl).toMatch(/\.more-panel\s*\{[^}]*inset-inline-end:\s*0/)
    expect(stl).not.toMatch(/\.more-panel\s*\{[^}]*\bright:/)
    expect(stl).not.toMatch(/\.more-panel\s*\{[^}]*\bleft:/)
  })

  it('CSS：coarse pointer 触控目标抬升（「···」/汉堡钮/镜像行 ≥ --oas-touch-target-min 默认 44px）', () => {
    const css = styleText(mount())
    const coarse = css.split('@media (pointer: coarse)')[1] ?? ''
    expect(coarse).toContain('--oas-touch-target-min')
    expect(coarse).toContain('.menu-btn')
    expect(coarse).toContain('.more')
    expect(coarse).toContain('.mirror')
    expect(coarse).toMatch(/min-height:\s*var\(--oas-touch-target-min,\s*44px\)/)
  })
})

// ===== hide-on-scroll 滚动折叠 =====

describe('OASAppBar hide-on-scroll 滚动折叠', () => {
  it('fixed + hide-on-scroll：下滚收起（data-hidden）、上滚恢复', () => {
    const el = mount({ attrs: { position: 'fixed', 'hide-on-scroll': '' } })
    scrollWindow(60)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    scrollWindow(20)
    expect(el.hasAttribute('data-hidden')).toBe(false)
  })

  it('floating / absolute 下同样生效（悬浮形态）', () => {
    const f = mount({ attrs: { position: 'floating', 'hide-on-scroll': '' } })
    scrollWindow(60)
    expect(f.hasAttribute('data-hidden')).toBe(true)
    const a = mount({ attrs: { position: 'absolute', 'hide-on-scroll': '' } })
    scrollWindow(120)
    expect(a.hasAttribute('data-hidden')).toBe(true)
  })

  it('static 下 hide-on-scroll 无效果（非悬浮形态）', () => {
    const el = mount({ attrs: { 'hide-on-scroll': '' } })
    scrollWindow(100)
    scrollWindow(400)
    expect(el.hasAttribute('data-hidden')).toBe(false)
  })

  it('滚动差 ≤4px 不判方向（防轻微抖动误触发）', () => {
    const el = mount({ attrs: { position: 'fixed', 'hide-on-scroll': '' } })
    scrollWindow(100)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    scrollWindow(103)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    scrollWindow(108)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    scrollWindow(100)
    expect(el.hasAttribute('data-hidden')).toBe(false)
  })

  it('移除属性恢复显示；重新启用后以新基线继续工作', () => {
    const el = mount({ attrs: { position: 'fixed', 'hide-on-scroll': '' } })
    scrollWindow(100)
    scrollWindow(400)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    el.removeAttribute('hide-on-scroll')
    expect(el.hasAttribute('data-hidden')).toBe(false)
    el.setAttribute('hide-on-scroll', '')
    scrollWindow(500)
    scrollWindow(560)
    expect(el.hasAttribute('data-hidden')).toBe(true)
  })

  it('onCleanup：断开连接移除 scroll 监听（无泄漏），重连自动重绑', () => {
    const el = mount({ attrs: { position: 'fixed', 'hide-on-scroll': '' } })
    scrollWindow(100)
    scrollWindow(400)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    el.remove()
    scrollWindow(900)
    expect(el.hasAttribute('data-hidden')).toBe(true)
    document.body.appendChild(el)
    scrollWindow(950)
    scrollWindow(990)
    expect(el.hasAttribute('data-hidden')).toBe(true)
  })

  it('CSS：收起态 translateY 隐藏（扣除 top 开口）、transition 只动 transform 走 token、reduced-motion 停用', () => {
    const stl = styleText(mount({ attrs: { position: 'fixed', 'hide-on-scroll': '' } }))
    expect(stl).toMatch(/:host\(\[data-position='fixed'\]\[data-hidden\]\)[^{]*\{[^}]*translateY\(calc\(-100%/)
    expect(stl).toMatch(/:host\(\[data-position='floating'\]\[data-hidden\]\)[^{]*\{[^}]*translateY\(calc\(-100%/)
    expect(stl).toMatch(/:host\s*\{[^}]*transition:\s*transform\s+var\(--oas-transition-base\)/)
    expect(stl).toContain('prefers-reduced-motion')
  })
})

// ===== extended 扩展区滚动收起 =====

describe('OASAppBar extended 扩展区', () => {
  it('extended-collapse-on-scroll：滚动 >8px 收起（data-ext-collapsed），回到顶部展开', () => {
    const el = mount({
      attrs: { 'extended-collapse-on-scroll': '' },
      html: '<div slot="extended">大标题</div>',
    })
    scrollWindow(20)
    expect(el.hasAttribute('data-ext-collapsed')).toBe(true)
    scrollWindow(5)
    expect(el.hasAttribute('data-ext-collapsed')).toBe(false)
  })

  it('未启用 extended-collapse-on-scroll 时滚动不收起', () => {
    const el = mount({ html: '<div slot="extended">大标题</div>' })
    scrollWindow(100)
    expect(el.hasAttribute('data-ext-collapsed')).toBe(false)
  })

  it('无 extended 内容时启用折叠无副作用（扩展区保持 hidden）', () => {
    const el = mount({ attrs: { 'extended-collapse-on-scroll': '' } })
    scrollWindow(100)
    expect(el.hasAttribute('data-ext-collapsed')).toBe(true)
    expect(extendedWrap(el).hidden).toBe(true)
  })

  it('CSS：extended 折叠走 grid-template-rows 1fr→0fr 过渡（只动网格行不碰文档流宽度）', () => {
    const stl = styleText(mount())
    expect(stl).toMatch(/\.extended-wrap\s*\{[^}]*grid-template-rows:\s*1fr/)
    expect(stl).toMatch(/:host\(\[data-ext-collapsed\]\)\s+\.extended-wrap\s*\{[^}]*grid-template-rows:\s*0fr/)
    expect(stl).toMatch(/\.extended-wrap\s*\{[^}]*transition:\s*grid-template-rows\s+var\(--oas-transition-base\)/)
    expect(stl).toMatch(/\.extended-wrap\[hidden\]\s*\{[^}]*display:\s*none/)
  })
})

// ===== RTL 逻辑方向化 =====

describe('OASAppBar RTL', () => {
  it('dir=rtl → 宿主 data-rtl 镜像钩子；移除后消失', () => {
    const el = mount()
    expect(el.hasAttribute('data-rtl')).toBe(false)
    el.setAttribute('dir', 'rtl')
    expect(el.hasAttribute('data-rtl')).toBe(true)
    el.removeAttribute('dir')
    expect(el.hasAttribute('data-rtl')).toBe(false)
  })

  it('CSS：布局全走逻辑属性——row 内边距 padding-inline、无物理 left/right 布局', () => {
    const stl = styleText(mount())
    expect(stl).toMatch(/\.row\s*\{[^}]*padding:\s*var\(--oas-space-2\)\s+var\(--oas-space-4\)/)
    expect(stl).not.toMatch(/padding-left:/)
    expect(stl).not.toMatch(/padding-right:/)
    expect(stl).toMatch(/inset-inline:/)
  })
})

// ===== DSD 真水合（SSR 双路径） =====

type AnyElement = OASAppBar

/** 渲染一个参照实例并返回其 shadow 快照（SSR 场景等价物） */
function captureSnapshot(setup?: (el: AnyElement) => void): string {
  const el = new OASAppBar()
  setup?.(el)
  document.body.appendChild(el)
  const html = el.shadowRoot!.innerHTML
  el.remove()
  return html
}

/** 注入快照 + 指纹后升级（模拟浏览器 DSD upgrade） */
function upgradeFromSnapshot(
  shadowHtml: string,
  setup?: (el: AnyElement) => void,
): { el: AnyElement; styleRef: Element | null } {
  const el = new OASAppBar()
  const tag = el.tagName.toLowerCase()
  el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1">${shadowHtml}`
  setup?.(el)
  const styleRef = el.shadowRoot!.querySelector('style')
  document.body.appendChild(el)
  return { el, styleRef }
}

describe('OASAppBar DSD 真水合', () => {
  it('真水合接管：hydrate 成功、shadow 不重建（style 引用保持）、指纹移除、关键结构保持', () => {
    const setup = (e: OASAppBar): void => {
      e.setAttribute('heading', '工作台')
      e.setAttribute('menu-button', '')
      e.innerHTML = '<button slot="actions">一</button><div slot="extended">扩展</div>'
    }
    const snap = captureSnapshot(setup)
    const { el, styleRef } = upgradeFromSnapshot(snap, setup)
    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="bar"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="menu-button"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="extended"]')).not.toBeNull()
    expect(snap).toContain('<style>')
    expect(snap).not.toContain('data-oas-ssr')
  })

  it('水合后交互可触发：点汉堡钮派发 oas-menu-toggle、overflow 收纳可用', () => {
    const setup = (e: OASAppBar): void => {
      e.setAttribute('menu-button', '')
      e.innerHTML = '<button slot="actions">一</button>'
    }
    const snap = captureSnapshot(setup)
    const { el } = upgradeFromSnapshot(snap, setup)
    let fired = 0
    el.addEventListener('oas-menu-toggle', () => fired++)
    menuBtn(el).click()
    expect(fired).toBe(1)
    mockOverflow(el, [60, 60, 60], 100)
    el.syncOverflow()
    moreBtn(el).click()
    expect(morePanel(el).hidden).toBe(false)
  })

  it('回退：快照缺关键结构时 hydrate 返回 false → render 全量重建', () => {
    const el = new OASAppBar()
    const tag = el.tagName.toLowerCase()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1"><span>broken</span>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="bar"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
  })

  it('SSR 快照不判溢出（clientWidth=0 防御）：快照里「···」为 hidden 初始态', () => {
    const snap = captureSnapshot((e) => {
      e.innerHTML = '<button slot="actions">一</button><button slot="actions">二</button>'
    })
    expect(snap).toContain('part="more"')
    // 快照模板里 more 初始 hidden（运行时才按测量结果显隐）
    expect(snap).toMatch(/part="more"[^>]*hidden/)
  })
})
