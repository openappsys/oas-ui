import { OASElement } from '@oas-ui/core'

type Base = 'top' | 'bottom' | 'left' | 'right'
type Align = '' | 'start' | 'end'

/** 解析 12 向 placement 为基向 + 对齐后缀；非法值回退 top（组件默认向） */
function parsePlacement(raw: string): { base: Base; align: Align } {
  const m = /^(top|bottom|left|right)(?:-(start|end))?$/.exec(raw.trim())
  if (!m) return { base: 'top', align: '' }
  return { base: m[1] as Base, align: (m[2] ?? '') as Align }
}

/** 碰撞边界 rect（默认视口，可换成自定义元素；原点系与页面坐标一致） */
interface BoundaryRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/** 主轴是否有足够空间容纳浮层（gap 即 offset 距离，padding 即边界内边距；判定基于边界 rect 原点） */
function fits(
  anchor: DOMRect,
  popup: DOMRect,
  base: Base,
  offset: number,
  boundary: BoundaryRect,
  padding: number,
): boolean {
  switch (base) {
    case 'top':
      return anchor.top - popup.height - offset >= boundary.top + padding
    case 'bottom':
      return anchor.bottom + popup.height + offset <= boundary.bottom - padding
    case 'left':
      return anchor.left - popup.width - offset >= boundary.left + padding
    case 'right':
      return anchor.right + popup.width + offset <= boundary.right - padding
  }
}

/**
 * 延迟组注册表：同 group 名的组件共享延迟——
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
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-tooltip, 1080));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
  /* portal（append-to）时 host 为 pointer-events:none（不吞页面指针），卡片显式 auto
     保持可悬停（跨间隙移动不闪关）；非 portal 下与默认值等价 */
  pointer-events: auto;
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
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  background: var(--oas-color-bg);
  transform: rotate(45deg);
  pointer-events: none;
}
/* placement 以 bottom 系：面板在锚点下方 → 箭头悬面板顶边、尖朝上 → 外露边=右上(border-top)+左上(border-left) */
.card[data-placement='bottom'] .arrow,
.card[data-placement='bottom-start'] .arrow,
.card[data-placement='bottom-end'] .arrow {
  top: -6px;
  left: calc(50% - 6px);
  border-top: 1px solid var(--oas-color-border);
  border-left: 1px solid var(--oas-color-border);
}
.card[data-placement='top'] .arrow,
.card[data-placement='top-start'] .arrow,
.card[data-placement='top-end'] .arrow {
  bottom: -6px;
  left: calc(50% - 6px);
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
.card[data-placement='left'] .arrow,
.card[data-placement='left-start'] .arrow,
.card[data-placement='left-end'] .arrow {
  right: -6px;
  top: calc(50% - 6px);
  border-top: 1px solid var(--oas-color-border);
  border-right: 1px solid var(--oas-color-border);
}
.card[data-placement='right'] .arrow,
.card[data-placement='right-start'] .arrow,
.card[data-placement='right-end'] .arrow {
  left: -6px;
  top: calc(50% - 6px);
  border-left: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
/* arrow-merge：直角三角与面板角共边融合（通用形态，仅 *-start/*-end 生效，
    center placement 不触发）。箭头为不旋转的 8px 方块整悬面板外、贴齐角两边，clip-path
    裁成直角三角——直角顶点贴面板角点，两条直角边与面板角两边共线，斜边 45° 朝面板内，
    尖端从角点正交外探 8px 指向锚点侧（视觉是「面板角本身伸出的直角尖」）。
    面板有 1px 描边：箭头盒贴角边让位 1px（主轴边外 -8px 压进面板描边带、起止侧边 -1px），
    两条直角边上的描边恰好与面板描边带共带续接；斜边（汇于尖端的主要外露边）用 45°/135°
     渐变带补 1px 法向线（斜边=盒对角线恰落渐变 50% 等值线，clip 保留内侧 1px；P3 同款修复）。
    逐向写死（不能用 ^前缀 + $='-start'/'-end' 后缀匹配——它对 12 向恒取顶角/恒写水平轴，
    top 系零错角、left-start 箭头会被拉到对侧边；且后缀规则与居中 calc 同设 left/top 时
    over-constrained，*-end 让位边被忽略、箭头留在居中位）：bottom 系悬顶边
    （start→左上角、end→右上角）、top 系悬底边（start→左下角、end→右下角）、left 系
    悬右边（start→右上角、end→右下角）、right 系悬左边（start→左上角、end→左下角）。
    -end 向显式 left/top: auto 解除与基础居中 calc 的 over-constrained，让位边才生效 */
.card.arrow-merge .arrow {
  width: 8px;
  height: 8px;
  /* 贴边（靠面板的那条边）是融合边——不留描边线，只在外露的两条边留描边，才能像 tooltip 那样干净地和面板角融合 */
}
.card.arrow-merge[data-placement='bottom-start'] .arrow {
  top: -8px;
  left: -1px;
  transform: none;
  border: none;
  border-left: 1px solid var(--oas-color-border);

  background: linear-gradient(45deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
}
.card.arrow-merge[data-placement='bottom-end'] .arrow {
  top: -8px;
  right: -1px;
  left: auto;
  transform: none;
  border: none;
  border-right: 1px solid var(--oas-color-border);

  background: linear-gradient(135deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
}
.card.arrow-merge[data-placement='top-start'] .arrow {
  bottom: -8px;
  left: -1px;
  transform: none;
  border: none;
  border-left: 1px solid var(--oas-color-border);

  background: linear-gradient(135deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
}
.card.arrow-merge[data-placement='top-end'] .arrow {
  bottom: -8px;
  right: -1px;
  left: auto;
  transform: none;
  border: none;
  border-right: 1px solid var(--oas-color-border);

  background: linear-gradient(45deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
}
.card.arrow-merge[data-placement='left-start'] .arrow {
  right: -8px;
  top: -1px;
  transform: none;
  border: none;
  border-top: 1px solid var(--oas-color-border);

  background: linear-gradient(135deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
}
.card.arrow-merge[data-placement='left-end'] .arrow {
  right: -8px;
  bottom: -1px;
  top: auto;
  transform: none;
  border: none;
  border-bottom: 1px solid var(--oas-color-border);

  background: linear-gradient(45deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
}
.card.arrow-merge[data-placement='right-start'] .arrow {
  left: -8px;
  top: -1px;
  transform: none;
  border: none;
  border-top: 1px solid var(--oas-color-border);

  background: linear-gradient(45deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
}
.card.arrow-merge[data-placement='right-end'] .arrow {
  left: -8px;
  bottom: -1px;
  top: auto;
  transform: none;
  border: none;
  border-bottom: 1px solid var(--oas-color-border);

  background: linear-gradient(135deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px));
   clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
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
      'sticky',
      'collision-boundary',
    ]
  }

  private card: HTMLElement | null = null
  private anchor: Element | null = null
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  /** 上次 open 状态（null = 未初始化，首帧不派发 oas-open-change） */
  private prevOpen: boolean | null = null
  /** 最近一次 open 状态变化时刻（延迟组判断「连续悬停」用） */
  private recentOpenAt = 0
  /** append-to：portal host 容器（目标容器内的 div + 独立 shadow，样式作用域保真） */
  private portalHost: HTMLElement | null = null
  /** collision-boundary property 通道持有的元素（优先于属性选择器） */
  private collisionBoundaryEl: Element | null = null
  /** 滚动/缩放重定位监听（默认挂载；sticky=off 或未打开时移除） */
  private scrollWatchOn = false
  private scrollRaf = 0
  /** 已注册的延迟组名（动态变更时先注销旧组） */
  private groupRegistered = ''

  /** collision-boundary property 通道（宿主直接传元素；与属性选择器并存，property 优先） */
  get collisionBoundary(): Element | null {
    return this.collisionBoundaryEl
  }
  set collisionBoundary(el: Element | null) {
    this.collisionBoundaryEl = el
    if (this.isConnected && this.hasAttr('open')) this.position()
  }

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
   * 悬停区域 = 触发器 + 浮层卡片：触发器 mouseenter/mouseleave 与卡片
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
      this.destroyPortal()
      this.stopScrollWatch()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（card 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.card')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
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

  // —— 延迟（open-delay / close-delay 分离；delay 为兼容别名）——

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

  // —— 延迟组注册——

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
    // 从 this.card 查（而非 this.shadow）：portal（append-to）期间卡片在 portal host 的
    // shadow 内，原 shadow 查询会落空
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    this.card.querySelector<HTMLElement>('[part="title"]')!.textContent = this.titleCache ?? ''
    this.card.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
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
      this.syncScrollWatch(true)
    } else {
      this.card.classList.remove('oas-detached')
      this.destroyPortal()
      this.syncScrollWatch(false)
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
    // 测量宽高用布局尺寸（offset*，不受进场动画 scale 污染——P5 扫描实锤：动画中间帧把
    // rect 宽缩小 ~5%，bottom-end 右缘对齐漂移十余 px、箭头脱离锚点）；0（无布局引擎的
    // 测试环境 / display:none）时回落 rect
    const rawRect = this.card.getBoundingClientRect()
    const cardRect = {
      left: rawRect.left,
      top: rawRect.top,
      right: rawRect.right,
      bottom: rawRect.bottom,
      width: this.card.offsetWidth || rawRect.width,
      height: this.card.offsetHeight || rawRect.height,
    } as DOMRect
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    // collision-boundary：碰撞/夹取边界可换成指定元素 rect（默认视口）
    const boundary = this.resolveBoundary()
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const sticky = this.getAttr('sticky', 'partial')

    // 锚点是否完全脱离视口（脱离隐藏与 always 吸附共用判定）
    const detached =
      anchorRect.bottom < 0 ||
      anchorRect.top > viewport.height ||
      anchorRect.right < 0 ||
      anchorRect.left > viewport.width

    // hide-when-detached：锚点完全脱离视口 → 隐藏卡片（保留 open 语义，滚动回来自动恢复）。
    // sticky=always 优先：锚点滚出后吸附视口边缘（贴边不消失），脱离隐藏不生效
    if (autoAdjust && this.hasAttr('hide-when-detached') && sticky !== 'always' && detached) {
      this.card.classList.add('oas-detached')
      return
    }
    this.card.classList.remove('oas-detached')

    const { base, align } = parsePlacement(this.getAttr('placement', 'top'))
    const offset = this.num(this.getAttr('offset'), 8)
    const skidding = this.num(this.getAttr('skidding'), 0)
    const padding = this.num(this.getAttr('collision-padding'), 4)

    // 主向选择：fallback-placements 自定义回退序列；缺省时默认翻转到对向。
    // sticky=always 且锚点已脱离：跳过翻转（按声明 placement 贴边保位，避免滚动时对向翻转跳动）
    let actualBase = base
    if (autoAdjust && !(sticky === 'always' && detached)) {
      const flips: Record<Base, Base> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      }
      const fallbacks = this.parseFallbacks()
      const candidates = fallbacks.length ? [base, ...fallbacks] : [base, flips[base]]
      for (const cand of candidates) {
        if (fits(anchorRect, cardRect, cand, offset, boundary, padding)) {
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

    // 碰撞边界夹取：collision-padding 定制边距（以边界 rect 原点计算，默认视口，可换成自定义元素 rect）
    if (autoAdjust) {
      left = Math.max(
        boundary.left + padding,
        Math.min(left, boundary.right - cardRect.width - padding),
      )
      top = Math.max(
        boundary.top + padding,
        Math.min(top, boundary.bottom - cardRect.height - padding),
      )
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
   * 解析碰撞边界：property 通道元素优先，否则属性选择器（querySelector 取第一个命中，
   * 即多祖先场景的最近命中），都无则回落视口。
   */
  private resolveBoundary(): BoundaryRect {
    const el = this.collisionBoundaryEl ?? this.resolveBoundaryFromAttr()
    if (el) {
      const r = el.getBoundingClientRect()
      // 保留完整 rect（含原点）：边界可能在页面任意位置，丢原点会让夹取/翻转折算回视口原点系
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      }
    }
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  private resolveBoundaryFromAttr(): Element | null {
    const sel = this.getAttr('collision-boundary', '').trim()
    if (!sel) return null
    try {
      return document.querySelector(sel)
    } catch {
      // 非法选择器：回落视口
      return null
    }
  }

  /**
   * 写定位 + append-to portal+ 动画原点（方向感知）+ 箭头指向。
   * append-to（与 popover/tooltip 统一架构）：卡片移入目标容器内的 portal
   * host（div + 独立 open shadow + STYLE 注入，样式作用域保真）。曾缺陷：只做
   * absolute + 坐标换算、卡片并未移进容器——absolute 相对页面无关 positioned 祖先，
   * 参照物全错 → 定位彻底错乱。portal 后卡片保持 fixed 视口坐标，无需换算。
   */
  private writePosition(top: number, left: number, placement: string, anchorRect: DOMRect): void {
    if (!this.card) return
    this.syncPortal()
    this.card.style.top = `${top}px`
    this.card.style.left = `${left}px`
    this.card.setAttribute('data-placement', placement)
    this.setAnimOrigin(placement)
    this.positionArrow(anchorRect, placement)
  }

  /** portal 挂载：打开且设置 append-to 时把卡片移入目标容器的 portal host（幂等复用） */
  private syncPortal(): void {
    const sel = this.getAttr('append-to', '').trim()
    if (!sel || !this.card || !this.hasAttr('open')) {
      this.destroyPortal()
      return
    }
    const target = sel === 'body' ? document.body : document.querySelector(sel)
    if (!target) {
      this.destroyPortal()
      return
    }
    if (this.portalHost && this.portalHost.parentElement === target) {
      this.bridgeSlotContent(this.portalHost)
      return
    }
    this.destroyPortal()
    const host = document.createElement('div')
    host.setAttribute('data-oas-hover-card-portal', '')
    host.style.cssText =
      'position: fixed; inset: 0; pointer-events: none; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-tooltip, 1080));'
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(this.card)
    this.portalHost = host
    this.bridgeSlotContent(host)
  }

  /** slot 桥接：宿主 light DOM 的 [slot=content] 节点移入 portal host light DOM（跨 host 分配不断供） */
  private bridgeSlotContent(host: HTMLElement): void {
    for (const n of this.querySelectorAll<HTMLElement>('[slot="content"]')) {
      host.appendChild(n)
    }
  }

  /** portal 拆除：卡片移回原 shadow，slot 节点移回宿主，host 移除无孤儿 */
  private destroyPortal(): void {
    const host = this.portalHost
    if (!host) return
    this.portalHost = null
    if (this.card && host.shadowRoot?.contains(this.card)) {
      this.shadow.appendChild(this.card)
    }
    for (const n of host.querySelectorAll<HTMLElement>('[slot="content"]')) {
      this.appendChild(n)
    }
    host.remove()
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
    const align: Align = placement.endsWith('-start')
      ? 'start'
      : placement.endsWith('-end')
        ? 'end'
        : ''
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
   * 箭头交叉轴指向（箭头指向锚点在面板指向边的中心投影，夹取在面板边内）：
   * - arrow-point-at-center 显式开启（面板被视口避让偏移后仍指向锚点中心）；
   * - -start/-end 对齐 placement：面板边贴合锚点边、居中箭头会脱离锚点投影区间——
   *   箭头贴向对齐端部并对准锚点中心投影（实测 P1 同款修复，与 popover 一致）。
   * 其余（center 对齐）保持面板中心（CSS calc(50% - 6px) 的边缘对齐兜底）。
   * 12 向 placement 按基向前缀判断主轴。
   */
  private positionArrow(anchorRect: DOMRect, placement: string): void {
    if (!this.card) return
    const arrow = this.card.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.left = ''
    arrow.style.top = ''
    const aligned = placement.endsWith('-start') || placement.endsWith('-end')
    if (!aligned && !this.hasAttr('arrow-point-at-center')) return
    // arrow-merge：箭头由 CSS 钉死面板角点（直角三角贴角共边），内联偏移会让三角盒
    // 脱离角点、破坏与面板角的共边衔接——跳过指向中心计算
    if (this.hasAttr('arrow-merge')) return
    const vertical = placement.startsWith('top') || placement.startsWith('bottom')
    const rect = this.card.getBoundingClientRect()
    const popupEdge = vertical ? parseFloat(this.card.style.left) : parseFloat(this.card.style.top)
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

  // —— 滚动/缩放重定位（默认开启；sticky=off 显式关闭；always 贴边） ——

  /**
   * 幂等挂载/切换滚动监听：打开且 sticky≠off 时挂 window scroll（capture 捕获任意滚动容器）
   * + resize，滚动/缩放后 rAF 节流重定位。hide-when-detached 的脱离隐藏判定在 position()
   * 内完成（保留原语义），监听本身与脱离模式解耦。
   */
  private syncScrollWatch(on: boolean): void {
    if (typeof window === 'undefined') return
    const track = on && this.getAttr('sticky', 'partial') !== 'off'
    if (track && !this.scrollWatchOn) {
      this.scrollWatchOn = true
      window.addEventListener('scroll', this.onViewportScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onViewportScroll)
    } else if (!track && this.scrollWatchOn) {
      this.stopScrollWatch()
    }
  }

  private stopScrollWatch(): void {
    if (!this.scrollWatchOn) return
    this.scrollWatchOn = false
    window.removeEventListener('scroll', this.onViewportScroll, { capture: true })
    window.removeEventListener('resize', this.onViewportScroll)
  }

  private onViewportScroll = (): void => {
    cancelAnimationFrame(this.scrollRaf)
    this.scrollRaf = requestAnimationFrame(() => {
      if (this.hasAttr('open')) this.position()
    })
  }
}
