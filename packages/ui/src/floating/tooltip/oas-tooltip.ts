import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
/* hidden 语义防御：UA 的 [hidden] display:none 是 UA 样式，:host 的 display:inline-block 会压过它——
   显式补 :host([hidden]) 规则保住 hidden 语义（label 等组件模板里 hidden 的 tooltip 包裹层不应占位） */
:host([hidden]) {
  display: none;
}
.tip {
  position: fixed;
  z-index: var(--oas-z-tooltip, 1080);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-text-primary);
  color: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  max-width: 240px;
  pointer-events: none;
}
.tip[aria-hidden='true'] {
  display: none;
}
/* 箭头：8px 正方形旋转 45°，底色与气泡同色，按 data-placement 落在面板对应边上，尖端指向锚点中心 */
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--oas-color-text-primary);
  transform: rotate(45deg);
  pointer-events: none;
}
.tip[data-placement='bottom'] .arrow {
  top: -4px;
  left: calc(50% - 4px);
}
.tip[data-placement='top'] .arrow {
  bottom: -4px;
  left: calc(50% - 4px);
}
.tip[data-placement='left'] .arrow {
  right: -4px;
  top: calc(50% - 4px);
}
.tip[data-placement='right'] .arrow {
  left: -4px;
  top: calc(50% - 4px);
}
`

export class OAStooltip extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'content',
      'placement',
      'virtual',
      'virtual-anchor',
      'virtual-x',
      'virtual-y',
      'arrow',
      'arrow-point-at-center',
      'auto-adjust-overflow',
    ]
  }

  private tipEl: HTMLElement | null = null
  private anchor: Element | null = null
  /** 上次 open 状态（null = 未初始化，首帧不派发事件） */
  private prevOpen: boolean | null = null
  /** virtual-anchor 元素跟随的监听是否已挂 */
  private followOpen = false
  private followRaf = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="tip" part="tip" role="tooltip" aria-hidden="true">
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
        <span class="tip-content" part="content"></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定 hover/focus 触发（render 与水合路径共用；定位只在触发时计算） */
  private bind(): void {
    this.tipEl = this.shadow.querySelector('.tip')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.anchor?.addEventListener('mouseenter', () => this.setOpen(true))
    this.anchor?.addEventListener('mouseleave', () => this.setOpen(false))
    this.anchor?.addEventListener('focusin', () => this.setOpen(true))
    this.anchor?.addEventListener('focusout', () => this.setOpen(false))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（气泡骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tip')) return false
    this.bind()
    return true
  }

  /**
   * hover/focus 触发入口。虚拟模式（virtual）不绑定宿主元素，open 完全受外部控制，
   * 因此任何宿主 hover/focus 都不得改 open。
   */
  private setOpen(open: boolean): void {
    if (this.hasAttr('virtual')) return
    if (open) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  protected override update(): void {
    if (!this.tipEl) return
    const open = this.hasAttr('open')
    this.tipEl.setAttribute('aria-hidden', String(!open))
    // 内容写入独立容器（不动箭头/骨架，避免 textContent 覆盖清掉箭头元素）
    this.tipEl.querySelector<HTMLElement>('.tip-content')!.textContent = this.getAttr('content', '')
    // 箭头显隐：arrow 布尔属性默认 true（显示），arrow="false" 隐藏；元素与 ::part(arrow) 保留
    const arrow = this.tipEl.querySelector<HTMLElement>('[data-popper-arrow]')
    if (arrow) arrow.hidden = !this.showArrow()
    // open 状态迁移（受控 setAttribute 与 hover/focus 触发都会走到这里）→ oas-open-change
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    this.syncFollow(open)
    if (!open) return
    this.position()
  }

  /** arrow 布尔属性：默认 true（显示箭头），仅 arrow="false" 隐藏 */
  private showArrow(): boolean {
    return this.getAttr('arrow', 'true') !== 'false'
  }

  /** 计算当前锚点矩形：虚拟坐标 > 虚拟锚点元素 > 默认宿主锚点 */
  private anchorRect(): DOMRect | null {
    if (this.hasAttr('virtual')) {
      const x = parseFloat(this.getAttr('virtual-x'))
      const y = parseFloat(this.getAttr('virtual-y'))
      if (Number.isFinite(x) && Number.isFinite(y)) {
        // 0 尺寸点位：按鼠标/指定坐标定位（视口坐标）
        return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 } as DOMRect
      }
      const sel = this.getAttr('virtual-anchor')
      if (sel) {
        const el = document.querySelector(sel)
        if (el) return el.getBoundingClientRect()
      }
      return null // 解析失败：不定位（open 仍保持语义，但无锚点）
    }
    return this.anchor?.getBoundingClientRect() ?? null
  }

  /** 定位写入：锚点矩形 + placement → computePosition → style/data-placement + 箭头指向 */
  private position(): void {
    if (!this.tipEl) return
    const anchorRect = this.anchorRect()
    if (!anchorRect) return
    const tipRect = this.tipEl.getBoundingClientRect()
    const placement = this.getAttr('placement', 'top') as Placement
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const {
      top,
      left,
      placement: actual,
    } = computePosition(
      anchorRect,
      tipRect,
      placement,
      { width: window.innerWidth, height: window.innerHeight },
      undefined,
      autoAdjust,
    )
    this.tipEl.style.top = `${top}px`
    this.tipEl.style.left = `${left}px`
    this.tipEl.setAttribute('data-placement', actual)
    this.positionArrow(anchorRect, actual)
  }

  /**
   * 箭头交叉轴指向：arrow-point-at-center 时箭头对齐锚点中心（面板被视口避让
   * 偏移后仍指向锚点），默认保持面板中心（CSS calc(50% - 4px) 的边缘对齐）。
   * 锚点中心与面板中心重合（未偏移 / virtual 0 尺寸锚点）时不留内联样式，
   * 两种模式视觉等价。
   */
  private positionArrow(anchorRect: DOMRect, actual: Placement): void {
    if (!this.tipEl) return
    const arrow = this.tipEl.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.left = ''
    arrow.style.top = ''
    if (!this.hasAttr('arrow-point-at-center')) return
    const vertical = actual === 'top' || actual === 'bottom'
    const rect = this.tipEl.getBoundingClientRect()
    const popupEdge = vertical
      ? parseFloat(this.tipEl.style.left)
      : parseFloat(this.tipEl.style.top)
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

  /**
   * virtual-anchor 元素跟随：锚点元素可能随滚动/缩放移动，打开期间监听
   * scroll（capture 捕获容器滚动）与 resize，rAF 节流重定位。坐标模式与
   * 普通锚点模式无需跟随（视口坐标不随滚动变化）。
   */
  private syncFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const track =
      open &&
      this.hasAttr('virtual') &&
      !this.hasVirtualPoint() &&
      this.getAttr('virtual-anchor') !== ''
    if (track && !this.followOpen) {
      this.followOpen = true
      window.addEventListener('scroll', this.onFollowScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onFollowScroll)
      this.onCleanup(() => {
        window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
        window.removeEventListener('resize', this.onFollowScroll)
      })
    } else if (!track && this.followOpen) {
      this.followOpen = false
      window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
      window.removeEventListener('resize', this.onFollowScroll)
    }
  }

  private hasVirtualPoint(): boolean {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    return Number.isFinite(x) && Number.isFinite(y)
  }

  private onFollowScroll = (): void => {
    cancelAnimationFrame(this.followRaf)
    this.followRaf = requestAnimationFrame(() => {
      if (!this.tipEl || !this.hasAttr('open')) return
      this.position()
    })
  }
}
