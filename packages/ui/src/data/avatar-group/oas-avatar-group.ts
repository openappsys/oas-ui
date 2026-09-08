import { OASElement } from '@oas-ui/core'
import { computePosition } from '../../overlay/floating/index.js'

/** 浮层与触发元素的默认间距（与 computePosition 的 GAP 一致） */
const GAP = 8
/** 视口边缘夹取默认边距（px，引擎 collisionPadding） */
const COLLISION_PAD = 4
/** hover 触发开/合防抖延时缺省值（ms）：无延时 hover 会闪开闪关 */
const HOVER_DELAY = 100

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.group {
  display: inline-flex;
  align-items: center;
}
/* 叠距变量化：默认 -8px 重叠陈列；spacing 属性 / 宿主 CSS 均可覆盖
   （自定义属性沿 light DOM 继承进 oas-avatar，::slotted 规则内 var() 按 slotted 元素解析） */
.group ::slotted(oas-avatar) {
  margin-inline-start: var(--oas-avatar-group-overlap, -8px);
  /* 成员描边防透叠：页面背景色 token ring（含 dark 变体），--oas-avatar-group-ring 可覆盖 */
  box-shadow: 0 0 0 2px var(--oas-avatar-group-ring, var(--oas-color-bg));
}
.group ::slotted(oas-avatar:first-child) {
  margin-inline-start: 0;
}
.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-inline-start: var(--oas-avatar-group-overlap, -8px);
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: 50%;
  background: var(--oas-color-bg-elevated);
  box-shadow: 0 0 0 2px var(--oas-avatar-group-ring, var(--oas-color-bg));
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  flex-shrink: 0;
  user-select: none;
  cursor: pointer;
}
.count:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--oas-avatar-group-ring, var(--oas-color-bg)),
    var(--oas-focus-ring);
}
[hidden] {
  display: none !important;
}
/* +N 折叠弹层：复用共享定位引擎（fixed + computePosition），视觉对齐 popconfirm 面板 */
.overflow {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  box-sizing: border-box;
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  padding: var(--oas-space-2);
  pointer-events: auto;
}
.overflow[aria-hidden='true'] {
  display: none;
}
/* 入场动画：fade + scale，动画放内层 .overflow-inner、面板自身不参与 transform，
   保证定位计算读到的面板矩形不受缩放影响；transform-origin 由 data-placement 感知方向 */
.overflow-inner {
  transform-origin: center center;
  animation: oas-avg-in 120ms var(--oas-ease-out);
}
.overflow[data-placement^='top'] .overflow-inner {
  transform-origin: bottom center;
}
.overflow[data-placement^='bottom'] .overflow-inner {
  transform-origin: top center;
}
@keyframes oas-avg-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .overflow-inner {
    animation: none;
  }
}
.overflow-list {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.overflow-list oas-avatar {
  flex-shrink: 0;
}
`

/** 面板实例计数：全局唯一 id（aria-controls 关联用） */
let uid = 0

// 模块级 Esc 栈：所有打开中的折叠弹层按打开先后排序（后开者在上），
// 共享一个 document keydown 处理器——一次 Esc 只关闭最顶层。栈空时自动移除监听，无孤儿。
const openLayers: OASAvatarGroup[] = []

function registerLayer(p: OASAvatarGroup): void {
  if (openLayers.includes(p)) return
  openLayers.push(p)
  if (openLayers.length === 1) document.addEventListener('keydown', onDocumentKey)
}

function unregisterLayer(p: OASAvatarGroup): void {
  const i = openLayers.indexOf(p)
  if (i === -1) return
  openLayers.splice(i, 1)
  if (openLayers.length === 0) document.removeEventListener('keydown', onDocumentKey)
}

function onDocumentKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  const top = openLayers[openLayers.length - 1]
  if (!top) return
  top.closeOverflow(true)
}

/**
 * oas-avatar-group —— 头像组（增强：间距控制 + 折叠弹层）。
 *
 * 间距：叠距变量化 `--oas-avatar-group-overlap`（默认 -8px，CSS 开口宿主可覆盖）+
 * `spacing` 属性（数字 px，正数并排 / 负数重叠）；成员带页面背景色 token ring 防透叠（含 dark）。
 * 布局用逻辑属性 `margin-inline-start`，RTL 下自动正确。
 *
 * 折叠：`max` 超限隐藏多余头像并显示 `+N` 计数按钮；hover / 聚焦 / 点击按钮弹出浮层，
 * 克隆展示全部被折叠成员头像（克隆清掉折叠期的 display:none）；Escape / 外部点击 / 焦点移出关闭，
 * 焦点关闭后回到计数按钮。定位复用共享 floating 引擎（主轴翻转 + 视口避让），滚动/resize 跟随。
 * 浮层生命周期全部经 onCleanup 注册，断开连接无孤儿监听。
 */
export class OASAvatarGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['max', 'size', 'spacing']
  }

  private countEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  /** 被折叠（display:none）的成员快照，弹层开启时克隆展示 */
  private folded: HTMLElement[] = []
  /** 弹层开态（内部状态，非公开 API，不映射 open 属性） */
  private overflowOpen = false
  /** hover 触发开/合防抖计时器 */
  private openTimer: ReturnType<typeof setTimeout> | null = null
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  /** 回焦豁免标志：closeOverflow(refocus) 的程序性回焦触发的 focusin 不触发 focus 开层 */
  private refocusing = false
  /** 滚动/尺寸变化重定位监听是否已挂 */
  private scrollFollow = false
  private scrollRaf = 0
  /** 面板 id（aria-controls 关联） */
  private readonly panelId = `oas-avatar-group-overflow-${++uid}`

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group">
        <slot></slot>
        <button class="count" part="count" type="button" aria-expanded="false" hidden></button>
      </div>
      <div class="overflow" part="overflow" id="${this.panelId}" role="dialog" aria-label="${this.t('avatar.foldedMembers')}" aria-hidden="true">
        <div class="overflow-inner">
          <div class="overflow-list" part="overflow-list"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.countEl = this.shadow.querySelector<HTMLElement>('[part="count"]')
    this.panelEl = this.shadow.querySelector<HTMLElement>('[part="overflow"]')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    // 成员动态增删（slotchange 异步）时刷新折叠计数与弹层列表
    this.slotEl?.addEventListener('slotchange', () => this.update())

    // 点击 +N：toggle 弹层（focus 已开的态下再点 = 收起，键盘/SR 激活语义一致）
    this.countEl?.addEventListener('click', () => {
      if (this.countEl?.hidden) return
      if (this.overflowOpen) this.closeOverflow()
      else this.openOverflow()
    })
    // hover 触发：按钮与浮层互跳不闪关
    this.countEl?.addEventListener('mouseenter', this.onCountEnter)
    this.countEl?.addEventListener('mouseleave', this.onCountLeave)
    this.panelEl?.addEventListener('mouseenter', this.onPanelEnter)
    this.panelEl?.addEventListener('mouseleave', this.onPanelLeave)
    // focus 触发：聚焦开、失焦（焦点移出按钮/面板）关
    this.countEl?.addEventListener('focusin', () => {
      if (this.countEl?.hidden) return
      // 回焦豁免：Escape 关闭后的程序性回焦不再开层（否则关闭→回焦→重开，弹层永远关不掉）
      if (this.refocusing) return
      this.clearTimers()
      this.openOverflow()
    })
    this.countEl?.addEventListener('focusout', (e: Event) => {
      const rel = (e as FocusEvent).relatedTarget
      if (rel && this.panelEl?.contains(rel as Node)) return
      this.closeOverflow()
    })

    // 清理：Esc 栈 / 外点监听 / 计时器 / 滚动跟随（断开连接无孤儿）
    this.onCleanup(() => unregisterLayer(this))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside, true))
    this.onCleanup(() => {
      this.clearTimers()
      this.syncScrollFollow(false)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="group"]')) return false
    this.bind()
    return true
  }

  // —— hover 触发（防抖）——

  private onCountEnter = (): void => {
    if (this.countEl?.hidden) return
    this.clearCloseTimer()
    if (!this.overflowOpen) {
      this.clearOpenTimer()
      this.openTimer = setTimeout(() => this.openOverflow(), HOVER_DELAY)
    }
  }

  private onCountLeave = (e: MouseEvent): void => {
    if (e.relatedTarget && this.panelEl?.contains(e.relatedTarget as Node)) return
    this.clearOpenTimer()
    if (this.overflowOpen && this.panelEl?.getAttribute('aria-hidden') === 'false') {
      this.clearCloseTimer()
      this.closeTimer = setTimeout(() => this.closeOverflow(), HOVER_DELAY)
    }
  }

  private onPanelEnter = (): void => {
    this.clearCloseTimer()
  }

  private onPanelLeave = (e: MouseEvent): void => {
    if (e.relatedTarget && this.countEl?.contains(e.relatedTarget as Node)) return
    this.clearOpenTimer()
    this.closeTimer = setTimeout(() => this.closeOverflow(), HOVER_DELAY)
  }

  private clearTimers(): void {
    this.clearOpenTimer()
    this.clearCloseTimer()
  }

  private clearOpenTimer(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
  }

  // —— 外部点击关闭 ——

  private handleOutside = (e: MouseEvent): void => {
    if (!this.overflowOpen) return
    const path = e.composedPath()
    if (path.includes(this) || (this.panelEl && path.includes(this.panelEl))) return
    if (path.some((n) => n instanceof Node && this.shadow.contains(n))) return
    this.closeOverflow()
  }

  // —— 弹层开关 ——

  /** 打开折叠弹层：克隆全部被折叠成员头像进列表 + 定位（供模块级 Esc 栈/内部调用） */
  openOverflow(): void {
    if (!this.countEl || this.countEl.hidden || this.overflowOpen) return
    this.overflowOpen = true
    this.syncOverflowList()
    this.panelEl?.setAttribute('aria-hidden', 'false')
    this.syncCountAria()
    registerLayer(this)
    document.addEventListener('click', this.handleOutside, true)
    this.syncScrollFollow(true)
    this.positionOverflow()
  }

  /** 关闭折叠弹层；refocus=true 时焦点回到计数按钮（Escape 路径，带回焦豁免防重开） */
  closeOverflow(refocus = false): void {
    if (!this.overflowOpen) return
    this.overflowOpen = false
    this.clearTimers()
    this.panelEl?.setAttribute('aria-hidden', 'true')
    this.syncCountAria()
    unregisterLayer(this)
    document.removeEventListener('click', this.handleOutside, true)
    this.syncScrollFollow(false)
    if (refocus && this.countEl) {
      this.refocusing = true
      this.countEl.focus()
      // 计数按钮不可聚焦等异常路径下 focus() 不产生 focusin，立即收回豁免避免误吞后续真实聚焦
      queueMicrotask(() => (this.refocusing = false))
    }
  }

  /** 克隆折叠成员头像进弹层列表（克隆带折叠期 display:none 内联样式，需复位） */
  private syncOverflowList(): void {
    const list = this.panelEl?.querySelector<HTMLElement>('[part="overflow-list"]')
    if (!list) return
    list.textContent = ''
    for (const a of this.folded) {
      const clone = a.cloneNode(true) as HTMLElement
      clone.style.display = ''
      list.appendChild(clone)
    }
  }

  private syncCountAria(): void {
    this.countEl?.setAttribute('aria-expanded', String(this.overflowOpen))
    if (this.panelEl) this.countEl?.setAttribute('aria-controls', this.panelId)
  }

  // —— 定位（共享 floating 引擎：主轴翻转 + 视口避让）——

  private positionOverflow(): void {
    if (!this.countEl || !this.panelEl || !this.overflowOpen) return
    const anchorRect = this.countEl.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const panelRect = this.panelEl.getBoundingClientRect()
    const r = computePosition(anchorRect, panelRect, 'top', viewport, GAP, true, {
      collisionPadding: COLLISION_PAD,
    })
    this.panelEl.style.top = `${r.top}px`
    this.panelEl.style.left = `${r.left}px`
    this.panelEl.setAttribute('data-placement', r.placement)
  }

  /** 打开期间监听 scroll（capture 捕获嵌套容器）与 resize，rAF 节流重定位 */
  private syncScrollFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    if (open && !this.scrollFollow) {
      this.scrollFollow = true
      window.addEventListener('scroll', this.onScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onScroll)
    } else if (!open && this.scrollFollow) {
      this.scrollFollow = false
      window.removeEventListener('scroll', this.onScroll, { capture: true })
      window.removeEventListener('resize', this.onScroll)
    }
  }

  private onScroll = (): void => {
    cancelAnimationFrame(this.scrollRaf)
    this.scrollRaf = requestAnimationFrame(() => {
      if (!this.panelEl || !this.overflowOpen) return
      this.positionOverflow()
    })
  }

  protected override update(): void {
    const avatars = Array.from(this.querySelectorAll('oas-avatar')) as HTMLElement[]
    const size = this.getAttr('size', '')
    avatars.forEach((a) => {
      a.style.display = ''
      if (size) a.setAttribute('size', size)
    })

    const countEl = this.countEl
    if (!countEl) return

    const max = Number(this.getAttr('max', ''))
    if (max > 0 && avatars.length > max) {
      this.folded = avatars.slice(max)
      this.folded.forEach((a) => {
        a.style.display = 'none'
      })
      countEl.hidden = false
      countEl.textContent = `+${avatars.length - max}`
      if (size) {
        countEl.style.width = `${size}px`
        countEl.style.height = `${size}px`
        countEl.style.fontSize = `${Math.max(12, Number(size) * 0.4)}px`
      }
    } else {
      this.folded = []
      countEl.hidden = true
      countEl.textContent = ''
      // 打开期间折叠条件消失（如移除 max）：立即收起，不留孤儿浮层
      if (this.overflowOpen) this.closeOverflow()
    }

    // spacing 属性（数字 px）注入叠距变量；非法/缺席回落 CSS 默认
    const spacingRaw = this.getAttr('spacing', '').trim()
    const spacing = Number(spacingRaw)
    if (spacingRaw !== '' && Number.isFinite(spacing)) {
      this.style.setProperty('--oas-avatar-group-overlap', `${spacing}px`)
    } else {
      this.style.removeProperty('--oas-avatar-group-overlap')
    }

    // 打开期间成员/尺寸变化：重刷弹层列表与定位
    if (this.overflowOpen) {
      this.syncOverflowList()
      this.positionOverflow()
    }
    this.syncCountAria()
  }
}
