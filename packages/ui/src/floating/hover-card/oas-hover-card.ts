import { OASElement } from '@oas-ui/core'

type Base = 'top' | 'bottom' | 'left' | 'right'
type Align = '' | 'start' | 'end'

/** 解析 12 向 placement 为基向 + 对齐后缀；非法值回退 top（组件默认向） */
function parsePlacement(raw: string): { base: Base; align: Align } {
  const m = /^(top|bottom|left|right)(?:-(start|end))?$/.exec(raw.trim())
  if (!m) return { base: 'top', align: '' }
  return { base: m[1] as Base, align: (m[2] ?? '') as Align }
}

/** 主轴是否有足够空间容纳浮层（gap 即 offset 距离，padding 即视口边距） */
function fits(
  anchor: DOMRect,
  popup: DOMRect,
  base: Base,
  offset: number,
  viewport: { width: number; height: number },
  padding: number,
): boolean {
  switch (base) {
    case 'top':
      return anchor.top - popup.height - offset >= padding
    case 'bottom':
      return anchor.bottom + popup.height + offset <= viewport.height - padding
    case 'left':
      return anchor.left - popup.width - offset >= padding
    case 'right':
      return anchor.right + popup.width + offset <= viewport.width - padding
  }
}

/**
 * 延迟组注册表（C11 / B2 语义）：同 group 名的组件共享延迟——
 * 指针从一个成员移到另一个成员时，后一个跳过 open-delay 立即打开、
 * 前一个立即关闭（不再等 close-delay）。
 */
const delayGroups = new Map<string, Set<OASHoverCard>>()

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
/* hidden 语义防御：UA 的 [hidden] display:none 是 UA 样式，:host 的 display:inline-block 会压过它——
   显式补 :host([hidden]) 规则保住 hidden 语义 */
:host([hidden]) {
  display: none;
}
.card {
  position: fixed;
  z-index: var(--oas-z-tooltip, 1080);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
  /* 入场动画：fade + scale，transform-origin 由 JS 按 placement 写入（方向感知） */
  animation: oas-hc-in 150ms var(--oas-ease-out);
}
.card[aria-hidden='true'] {
  display: none;
}
/* 锚点脱离视口（hide-when-detached）：保持定位但不可见不可交互 */
.card.oas-detached {
  visibility: hidden;
  pointer-events: none;
}
@keyframes oas-hc-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  margin-bottom: var(--oas-space-2);
}
.title:empty,
.content:empty {
  display: none;
}
.content {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
/* 富内容插槽：无内容时不占位 */
.rich {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
}
.rich:empty {
  display: none;
}
/* 箭头：8px 正方形旋转 45°（菱形），底色与面板同色，前缀匹配 12 向 placement。
   旋转后原 border-top/right/bottom/left 依次对应菱形的右上/右下/左下/左上边——
   取「汇于尖端」的两条外露边带边框色，与面板 1px 描边无缝衔接。 */
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  box-sizing: border-box;
  background: var(--oas-color-bg);
  transform: rotate(45deg);
  pointer-events: none;
}
/* placement 以 bottom 系：面板在锚点下方 → 箭头悬面板顶边、尖朝上 → 外露边=右上(border-top)+左上(border-left) */
.card[data-placement='bottom'] .arrow,
.card[data-placement='bottom-start'] .arrow,
.card[data-placement='bottom-end'] .arrow {
  top: -4px;
  left: calc(50% - 4px);
  border-top: 1px solid var(--oas-color-border);
  border-left: 1px solid var(--oas-color-border);
}
.card[data-placement='top'] .arrow,
.card[data-placement='top-start'] .arrow,
.card[data-placement='top-end'] .arrow {
  bottom: -4px;
  left: calc(50% - 4px);
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
.card[data-placement='left'] .arrow,
.card[data-placement='left-start'] .arrow,
.card[data-placement='left-end'] .arrow {
  right: -4px;
  top: calc(50% - 4px);
  border-top: 1px solid var(--oas-color-border);
  border-right: 1px solid var(--oas-color-border);
}
.card[data-placement='right'] .arrow,
.card[data-placement='right-start'] .arrow,
.card[data-placement='right-end'] .arrow {
  left: -4px;
  top: calc(50% - 4px);
  border-left: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
/* arrow-merge（C1 独家项）：*-start/*-end 位置箭头贴角与面板圆角融合成直角三角
   —— 交叉轴贴角 + 对应角圆角清零（arrow-merge 语义） */
.card.arrow-merge[data-placement^='bottom'][data-placement$='-start'] .arrow {
  left: -4px;
}
.card.arrow-merge[data-placement^='bottom'][data-placement$='-end'] .arrow {
  right: -4px;
}
.card.arrow-merge[data-placement^='top'][data-placement$='-start'] .arrow {
  left: -4px;
}
.card.arrow-merge[data-placement^='top'][data-placement$='-end'] .arrow {
  right: -4px;
}
.card.arrow-merge[data-placement^='left'][data-placement$='-start'] .arrow {
  top: -4px;
}
.card.arrow-merge[data-placement^='left'][data-placement$='-end'] .arrow {
  bottom: -4px;
}
.card.arrow-merge[data-placement^='right'][data-placement$='-start'] .arrow {
  top: -4px;
}
.card.arrow-merge[data-placement^='right'][data-placement$='-end'] .arrow {
  bottom: -4px;
}
.card.arrow-merge[data-placement='bottom-start'] {
  border-top-left-radius: 0;
}
.card.arrow-merge[data-placement='bottom-end'] {
  border-top-right-radius: 0;
}
.card.arrow-merge[data-placement='top-start'] {
  border-bottom-left-radius: 0;
}
.card.arrow-merge[data-placement='top-end'] {
  border-bottom-right-radius: 0;
}
.card.arrow-merge[data-placement='left-start'] {
  border-top-right-radius: 0;
}
.card.arrow-merge[data-placement='left-end'] {
  border-bottom-right-radius: 0;
}
.card.arrow-merge[data-placement='right-start'] {
  border-top-left-radius: 0;
}
.card.arrow-merge[data-placement='right-end'] {
  border-bottom-left-radius: 0;
}
`

export class OASHoverCard extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'title',
      'content',
      'placement',
      'delay',
      'open-delay',
      'close-delay',
      'disabled',
      'arrow',
      'arrow-point-at-center',
      'offset',
      'skidding',
      'width',
      'append-to',
      'collision-padding',
      'fallback-placements',
      'hide-when-detached',
      'auto-adjust-overflow',
      'group',
      'arrow-merge',
    ]
  }

  private card: HTMLElement | null = null
  private anchor: Element | null = null
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  /** 上次 open 状态（null = 未初始化，首帧不派发 oas-open-change） */
  private prevOpen: boolean | null = null
  /** 最近一次 open 状态变化时刻（延迟组判断「连续悬停」用） */
  private recentOpenAt = 0
  /** append-to 容器定位上下文（提升为相对定位，关闭时还原） */
  private appendContainer: Element | null = null
  private appendOrigPos: string | null = null
  /** hide-when-detached 滚动监听 */
  private detachWatchOn = false
  private detachRaf = 0
  /** 已注册的延迟组名（动态变更时先注销旧组） */
  private groupRegistered = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="card" part="card" aria-hidden="true">
        <div class="title" part="title"></div>
        <div class="content" part="content"></div>
        <div class="rich"><slot name="content"></slot></div>
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
      </div>
    `
  }

  /**
   * 缓存节点引用 + 绑定 hover/focus 触发 + 注册延迟组（render 与水合路径共用）。
   *
   * 悬停区域 = 触发器 + 浮层卡片（A9）：触发器 mouseenter/mouseleave 与卡片
   * mouseenter/mouseleave 各自独立监听——离开触发器排队关闭后，指针在 close-delay
   * 内进入卡片即取消关闭（跨间隙移动不闪关）；卡内 slotted 内容属于卡片子树，
   * 悬停其上保持打开。
   */
  private bind(): void {
    this.card = this.shadow.querySelector('.card')
    // 锚点 = 首个非插槽子元素（slot="content" 的富内容不应被当作触发器）
    this.anchor = this.querySelector(':scope > :not([slot="content"])') ?? this
    this.anchor?.addEventListener('mouseenter', () => this.onAnchorEnter())
    this.anchor?.addEventListener('mouseleave', () => this.onAnchorLeave())
    this.anchor?.addEventListener('focusin', () => this.onFocusEnter())
    this.anchor?.addEventListener('focusout', (e) => this.onFocusLeave(e as FocusEvent))
    this.card?.addEventListener('mouseenter', () => this.onCardEnter())
    this.card?.addEventListener('mouseleave', () => this.onCardLeave())
    this.syncGroup()
    this.onCleanup(() => {
      if (this.showTimer) clearTimeout(this.showTimer)
      if (this.hideTimer) clearTimeout(this.hideTimer)
      this.unregisterGroup()
      this.detachAppend()
      this.stopDetachedWatch()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（card 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.card')) return false
    this.bind()
    return true
  }

  // —— 触发 ——

  private onAnchorEnter(): void {
    if (this.hasAttr('disabled')) {
      this.cancelPending()
      return
    }
    this.cancelPending()
    if (this.hasAttr('open')) return
    const group = this.getAttr('group')
    if (group) {
      const members = delayGroups.get(group)
      if (members) {
        // 组内其他成员：取消延迟、立即关闭
        for (const other of members) {
          if (other === this) continue
          other.cancelPending()
          if (other.hasAttr('open')) other.removeAttribute('open')
        }
        // 组内连续悬停（有成员刚开/开着）→ 跳过 open-delay 立即打开
        const otherRecent = [...members].some(
          (o) => o !== this && (o.hasAttr('open') || Date.now() - o.recentOpenAt < 600),
        )
        if (otherRecent) {
          this.setAttribute('open', '')
          return
        }
      }
    }
    this.scheduleOpen()
  }

  private onAnchorLeave(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.hasAttr('open')) this.scheduleHide()
  }

  /** 指针进入卡片（含 slotted 内容）：取消排队的关闭 → 保持打开 */
  private onCardEnter(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  private onCardLeave(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.hasAttr('open')) this.scheduleHide()
  }

  private onFocusEnter(): void {
    if (this.hasAttr('disabled')) return
    this.cancelPending()
    if (this.hasAttr('open')) return
    this.scheduleOpen()
  }

  /**
   * 焦点移到卡内（slotted 内容在 light DOM、shadow 内）→ 保持打开；
   * 否则排队关闭。
   */
  private onFocusLeave(e: FocusEvent): void {
    const rt = e.relatedTarget
    if (rt instanceof Node && (this.contains(rt) || this.shadow.contains(rt))) {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer)
        this.hideTimer = null
      }
      return
    }
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.hasAttr('open')) this.scheduleHide()
  }

  private cancelPending(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  // —— 延迟（A11：open-delay / close-delay 分离；delay 为兼容别名）——

  private scheduleOpen(): void {
    if (this.showTimer) return
    this.showTimer = setTimeout(() => {
      this.showTimer = null
      if (!this.hasAttr('disabled')) this.setAttribute('open', '')
    }, this.openDelay())
  }

  private scheduleHide(): void {
    if (this.hideTimer) return
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null
      this.removeAttribute('open')
    }, this.closeDelay())
  }

  private openDelay(): number {
    const direct = this.getAttr('open-delay')
    if (direct !== '') return this.num(direct, 300)
    const legacy = this.getAttr('delay')
    if (legacy !== '') return this.num(legacy, 300)
    return 300
  }

  private closeDelay(): number {
    const direct = this.getAttr('close-delay')
    if (direct !== '') return this.num(direct, 150)
    const legacy = this.getAttr('delay')
    if (legacy !== '') return this.num(legacy, 150)
    return 150
  }

  private num(v: string, fb: number): number {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) && n >= 0 ? n : fb
  }

  // —— 延迟组注册（C11）——

  private syncGroup(): void {
    const g = this.getAttr('group')
    if (g === this.groupRegistered) return
    this.unregisterGroup()
    if (!g) return
    let set = delayGroups.get(g)
    if (!set) {
      set = new Set()
      delayGroups.set(g, set)
    }
    set.add(this)
    this.groupRegistered = g
  }

  private unregisterGroup(): void {
    if (!this.groupRegistered) return
    const set = delayGroups.get(this.groupRegistered)
    set?.delete(this)
    if (set && set.size === 0) delayGroups.delete(this.groupRegistered)
    this.groupRegistered = ''
  }

  // —— 增量同步 ——

  protected override update(): void {
    if (!this.card) return
    const open = this.hasAttr('open')
    // 显示与语义共用一个开关：关闭时 aria-hidden=true（隐藏 + 读屏忽略），
    // 打开时 aria-hidden=false（内容以普通内容暴露，无 dialog 误导语义）
    this.card.setAttribute('aria-hidden', String(!open))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    this.shadow.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
    const arrow = this.card.querySelector<HTMLElement>('[data-popper-arrow]')
    if (arrow) arrow.hidden = this.getAttr('arrow', 'true') === 'false'
    this.card.classList.toggle('arrow-merge', this.hasAttr('arrow-merge'))
    this.syncWidth()
    this.syncGroup()
    // open 状态迁移（受控 setAttribute 与 hover/focus 触发都会走到这里）→ oas-open-change
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.recentOpenAt = Date.now()
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    if (open) {
      this.position()
      this.syncDetachedWatch(true)
    } else {
      this.card.classList.remove('oas-detached')
      this.detachAppend()
      this.syncDetachedWatch(false)
    }
  }

  /** width 定制：数值 px / trigger（target）与触发器同宽；未设置清空走 CSS min-width */
  private syncWidth(): void {
    if (!this.card) return
    const w = this.getAttr('width')
    if (w === 'trigger' || w === 'target') {
      const el = this.anchor as HTMLElement | null
      this.card.style.width = el && el.offsetWidth > 0 ? `${el.offsetWidth}px` : ''
    } else if (w !== '' && Number.isFinite(Number.parseFloat(w))) {
      this.card.style.width = `${Number.parseFloat(w)}px`
    } else {
      this.card.style.width = ''
    }
  }

  // —— 定位（12 向 + 碰撞细调 + 双轴偏移 + 方向动画原点）——

  private position(): void {
    if (!this.card || !this.anchor) return
    const anchorRect = this.anchor.getBoundingClientRect()
    const cardRect = this.card.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'

    // B13 hide-when-detached：锚点完全脱离视口 → 隐藏卡片（保留 open 语义，滚动回来自动恢复）
    if (autoAdjust && this.hasAttr('hide-when-detached')) {
      const detached =
        anchorRect.bottom < 0 ||
        anchorRect.top > viewport.height ||
        anchorRect.right < 0 ||
        anchorRect.left > viewport.width
      if (detached) {
        this.card.classList.add('oas-detached')
        return
      }
      this.card.classList.remove('oas-detached')
    }

    const { base, align } = parsePlacement(this.getAttr('placement', 'top'))
    const offset = this.num(this.getAttr('offset'), 8)
    const skidding = this.num(this.getAttr('skidding'), 0)
    const padding = this.num(this.getAttr('collision-padding'), 4)

    // 主向选择：fallback-placements 自定义回退序列；缺省时默认翻转到对向
    let actualBase = base
    if (autoAdjust) {
      const flips: Record<Base, Base> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      }
      const fallbacks = this.parseFallbacks()
      const candidates = fallbacks.length ? [base, ...fallbacks] : [base, flips[base]]
      for (const cand of candidates) {
        if (fits(anchorRect, cardRect, cand, offset, viewport, padding)) {
          actualBase = cand
          break
        }
      }
    }

    const anchorCenterX = anchorRect.left + anchorRect.width / 2
    const anchorCenterY = anchorRect.top + anchorRect.height / 2
    let top: number
    let left: number
    switch (actualBase) {
      case 'top':
        top = anchorRect.top - cardRect.height - offset
        left = anchorCenterX - cardRect.width / 2
        break
      case 'bottom':
        top = anchorRect.bottom + offset
        left = anchorCenterX - cardRect.width / 2
        break
      case 'left':
        left = anchorRect.left - cardRect.width - offset
        top = anchorCenterY - cardRect.height / 2
        break
      default:
        left = anchorRect.right + offset
        top = anchorCenterY - cardRect.height / 2
        break
    }

    // 交叉轴对齐：-start/-end 让面板边贴合锚点边
    const vertical = actualBase === 'top' || actualBase === 'bottom'
    if (align === 'start') {
      if (vertical) left = anchorRect.left
      else top = anchorRect.top
    } else if (align === 'end') {
      if (vertical) left = anchorRect.right - cardRect.width
      else top = anchorRect.bottom - cardRect.height
    }

    // 双轴偏移：skidding 在交叉轴叠加
    if (vertical) left += skidding
    else top += skidding

    // 视口夹取：collision-padding 定制边距
    if (autoAdjust) {
      left = Math.max(padding, Math.min(left, viewport.width - cardRect.width - padding))
      top = Math.max(padding, Math.min(top, viewport.height - cardRect.height - padding))
    }

    const actual = actualBase + (align ? `-${align}` : '')
    this.writePosition(top, left, actual, anchorRect)
  }

  /** fallback-placements：逗号分隔的自定义主向回退序列 */
  private parseFallbacks(): Base[] {
    const raw = this.getAttr('fallback-placements')
    if (!raw) return []
    const out: Base[] = []
    for (const part of raw.split(',')) {
      const b = part.trim()
      if (b === 'top' || b === 'bottom' || b === 'left' || b === 'right') out.push(b)
    }
    return out
  }

  /**
   * 写定位 + append-to 定位容器（B6）+ 动画原点（B1 方向感知）+ 箭头指向。
   * append-to：卡片改为绝对定位在目标容器内（容器提升为相对定位上下文），
   * 坐标 = 视口坐标 - 容器左上角；未设置时走 position:fixed 视口坐标。
   */
  private writePosition(top: number, left: number, placement: string, anchorRect: DOMRect): void {
    if (!this.card) return
    const selector = this.getAttr('append-to')
    const container = selector ? document.querySelector(selector) : null
    if (container) {
      this.card.style.position = 'absolute'
      if (!this.appendContainer) {
        this.appendContainer = container
        this.appendOrigPos = (container as HTMLElement).style.position
        ;(container as HTMLElement).style.position = 'relative'
      }
      const cRect = container.getBoundingClientRect()
      this.card.style.top = `${top - cRect.top}px`
      this.card.style.left = `${left - cRect.left}px`
    } else {
      this.card.style.position = ''
      this.card.style.top = `${top}px`
      this.card.style.left = `${left}px`
    }
    this.card.setAttribute('data-placement', placement)
    this.setAnimOrigin(placement)
    this.positionArrow(anchorRect, placement)
  }

  /** append-to 容器还原（关闭/断开连接时） */
  private detachAppend(): void {
    if (!this.appendContainer) return
    ;(this.appendContainer as HTMLElement).style.position = this.appendOrigPos ?? ''
    this.appendContainer = null
    this.appendOrigPos = null
    if (this.card) this.card.style.position = ''
  }

  /**
   * 开合动画原点（transform-origin）随 placement 感知方向（同 dropdown 模式）：
   * 主轴方向决定「从哪条边向外展开」，-start/-end 把交叉轴原点贴到对齐边。
   */
  private setAnimOrigin(placement: string): void {
    if (!this.card) return
    const base = placement.startsWith('top')
      ? 'top'
      : placement.startsWith('bottom')
        ? 'bottom'
        : placement.startsWith('left')
          ? 'left'
          : 'right'
    const align: Align = placement.endsWith('-start') ? 'start' : placement.endsWith('-end') ? 'end' : ''
    const cross = (s: string, e: string): string =>
      align === 'start' ? s : align === 'end' ? e : 'center'
    const originX =
      base === 'top' || base === 'bottom'
        ? cross('left', 'right')
        : base === 'left'
          ? 'right'
          : 'left'
    const originY =
      base === 'left' || base === 'right'
        ? cross('top', 'bottom')
        : base === 'top'
          ? 'bottom'
          : 'top'
    this.card.style.transformOrigin = `${originX} ${originY}`
  }

  /**
   * 箭头交叉轴指向：arrow-point-at-center 时箭头对齐锚点中心（面板被视口避让
   * 偏移后仍指向锚点），默认保持面板中心（CSS calc(50% - 4px) 的边缘对齐）。
   * 12 向 placement 按基向前缀判断主轴。
   */
  private positionArrow(anchorRect: DOMRect, placement: string): void {
    if (!this.card) return
    const arrow = this.card.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.left = ''
    arrow.style.top = ''
    if (!this.hasAttr('arrow-point-at-center')) return
    const vertical = placement.startsWith('top') || placement.startsWith('bottom')
    const rect = this.card.getBoundingClientRect()
    const popupEdge = vertical
      ? parseFloat(this.card.style.left)
      : parseFloat(this.card.style.top)
    const anchorCrossCenter = vertical
      ? anchorRect.left + anchorRect.width / 2
      : anchorRect.top + anchorRect.height / 2
    const size = vertical ? rect.width : rect.height
    if (!Number.isFinite(size) || size <= 0) return
    // 锚点中心映射到面板局部坐标，夹取到面板内（4px 边距），避免箭头探出面板
    const local = anchorCrossCenter - popupEdge
    const clamped = Math.max(4, Math.min(local, size - 4))
    if (Math.abs(clamped - size / 2) <= 0.5) return // 与面板中心重合 → 走 CSS 居中
    if (vertical) arrow.style.left = `${clamped - 4}px`
    else arrow.style.top = `${clamped - 4}px`
  }

  // —— hide-when-detached 滚动重查 ——

  private syncDetachedWatch(on: boolean): void {
    if (typeof window === 'undefined') return
    const track = on && this.hasAttr('hide-when-detached')
    if (track && !this.detachWatchOn) {
      this.detachWatchOn = true
      window.addEventListener('scroll', this.onDetachedScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onDetachedScroll)
      this.onCleanup(() => this.stopDetachedWatch())
    } else if (!track && this.detachWatchOn) {
      this.stopDetachedWatch()
    }
  }

  private stopDetachedWatch(): void {
    if (!this.detachWatchOn) return
    this.detachWatchOn = false
    window.removeEventListener('scroll', this.onDetachedScroll, { capture: true })
    window.removeEventListener('resize', this.onDetachedScroll)
  }

  private onDetachedScroll = (): void => {
    cancelAnimationFrame(this.detachRaf)
    this.detachRaf = requestAnimationFrame(() => {
      if (this.hasAttr('open')) this.position()
    })
  }
}
