import { OASElement } from '@oas-ui/core'
import { iconRegistry } from '@oas-ui/icons'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import '../menu/index.js' // 副作用：确保 oas-menu 已注册
import type { OASMenu } from '../menu/index.js'
import type { MenuItem } from '../menu/index.js'

/** 浮层与触发元素的默认间隙（offset 属性缺省值，与 computePosition 的 GAP 一致） */
const GAP = 8
/** 箭头尺寸（8px 菱形）与箭头中心到面板圆角边的最短距离 */
const ARROW_SIZE = 12
const ARROW_PAD = 8
/** 开合动画时长（ms）：入场/退场 keyframes 与 JS 退场隐藏延时共用，改这里需同步下方 CSS 的 `animation` 时长 */
const ANIM_MS = 150
/** hover 触发开/合防抖延时缺省值（ms）：无延时 hover 会闪开闪关 */
const HOVER_DELAY = 150
const HOVER_HIDE_DELAY = 100

/** 12 向 placement 的主轴基向（跨轴对齐后缀 -start/-end 由 position() 另行应用） */
type PlacementBase = 'top' | 'bottom' | 'left' | 'right'
/** 交叉轴对齐后缀：''=居中，start/end=面板边贴合锚点边 */
type Align = '' | 'start' | 'end'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
/* 整体禁用：视觉降饱和（ui-spec §2.3 disabled 状态约定）+ 交互由 JS 全部拦截 */
:host([disabled]) {
  opacity: 0.6;
  cursor: not-allowed;
}
:host([disabled]) .arrow-btn {
  cursor: not-allowed;
}
/* 拆分按钮组合：主按钮（默认 slot）+ 箭头按钮并排；非 split 时容器塌陷、箭头隐藏 */
.split-group {
  display: inline-flex;
  align-items: stretch;
}
:host(:not([split])) .split-group {
  display: contents;
}
:host(:not([split])) .arrow-btn {
  display: none;
}
.arrow-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--oas-color-border);
  border-left: none;
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) 0;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  margin-left: -1px; /* 覆盖主按钮右边框，接缝成一条线 */
  padding: 0 var(--oas-space-2);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.arrow-btn:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.arrow-btn:active:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.arrow-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.arrow-btn svg {
  display: block;
  width: 1em;
  height: 1em;
}
.menu-anchor {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
}
.menu-anchor[hidden] {
  display: none;
}
/* 开合动画：入场/退场 fade+scale。动画放在内层 oas-menu 上、且 menu-anchor 自身不参与 transform，
   保证定位计算读到的面板矩形不受缩放动画影响；transform-origin 由 JS 按 placement 写入
   --oas-origin-x/y（自定义属性继承到内层 oas-menu），决定「从哪条边向外展开」。 */
.menu-anchor oas-menu {
  transform-origin: var(--oas-origin-x, center) var(--oas-origin-y, center);
}
.menu-anchor:not([hidden]) oas-menu {
  animation: oas-drop-in ${ANIM_MS}ms var(--oas-ease-out);
}
.menu-anchor.oas-closing oas-menu {
  animation: oas-drop-out ${ANIM_MS}ms var(--oas-ease-in-out);
}
/* 箭头与面板同节奏开合（仅透明度）：动画只挂 oas-menu 时，箭头是兄弟节点无动画——
   打开瞬间箭头先显（描边线先亮后融）、关闭时箭头原地留守慢一拍消失。
   补与面板同时长的 fade，只动 opacity 不碰 rotate(45deg)，两端时序对齐 */
.menu-anchor:not([hidden]) .arrow {
  animation: oas-drop-arrow-in ${ANIM_MS}ms var(--oas-ease-out);
}
.menu-anchor.oas-closing .arrow {
  animation: oas-drop-arrow-out ${ANIM_MS}ms var(--oas-ease-in-out);
}
@keyframes oas-drop-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes oas-drop-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.96);
  }
}
/* 箭头开合（仅透明度，与面板 fade 同步；不掺 transform 防覆盖 rotate(45deg)） */
@keyframes oas-drop-arrow-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes oas-drop-arrow-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
/* 减少动效偏好：禁用开合动画（退场时 JS 检测到 reduce 直接隐藏，不等动画时长） */
@media (prefers-reduced-motion: reduce) {
  .menu-anchor oas-menu,
  .menu-anchor .arrow {
    animation: none;
  }
}
/* 箭头：8px 菱形旋转 45°，底色与菜单面板同色；按 data-placement 基向落在面板对应边上，尖端指向触发元素。
   旋转后原 border-top/right/bottom/left 依次对应菱形右上/右下/左下/左上边，
   取「汇于尖端」的两条外露边带边框色，与 oas-menu 的 1px 描边无缝衔接。
   十字轴默认居中（var(--arrow-x/y) 兜底 calc(50% - 4px)）；point-at-center=false 时由 JS
   写内联偏移，面板被视口避让偏移时箭头仍指向触发元素。
   12 向 placement 使 data-placement 带 -start/-end 后缀，落边规则用属性前缀匹配（^=）。 */
.arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  background: var(--oas-color-bg);
  transform: rotate(45deg);
  pointer-events: none;
}
/* placement 基向=bottom：面板在触发元素下方 → 箭头悬面板顶边、尖朝上 → 外露边=右上(border-top)+左上(border-left) */
.menu-anchor[data-placement^='bottom'] .arrow {
  top: -6px;
  left: var(--arrow-x, calc(50% - 6px));
  border-top: 1px solid var(--oas-color-border);
  border-left: 1px solid var(--oas-color-border);
}
/* placement 基向=top：面板在触发元素上方 → 箭头悬面板底边、尖朝下 → 外露边=右下(border-right)+左下(border-bottom) */
.menu-anchor[data-placement^='top'] .arrow {
  bottom: -6px;
  left: var(--arrow-x, calc(50% - 6px));
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
/* placement 基向=left：面板在触发元素左侧 → 箭头悬面板右边、尖朝右 → 外露边=右上(border-top)+右下(border-right) */
.menu-anchor[data-placement^='left'] .arrow {
  right: -6px;
  top: var(--arrow-y, calc(50% - 6px));
  border-top: 1px solid var(--oas-color-border);
  border-right: 1px solid var(--oas-color-border);
}
/* placement 基向=right：面板在触发元素右侧 → 箭头悬面板左边、尖朝左 → 外露边=左上(border-left)+左下(border-bottom) */
.menu-anchor[data-placement^='right'] .arrow {
  left: -6px;
  top: var(--arrow-y, calc(50% - 6px));
  border-left: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
`

export class OASDropdown extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'items',
      'value',
      'placement',
      'split',
      'arrow',
      'arrow-point-at-center',
      'auto-adjust-overflow',
      'trigger',
      'hover-delay',
      'hover-hide-delay',
      'disabled',
      'hide-on-click',
      'close-on-scroll',
      'offset',
    ]
  }

  private itemsList: MenuItem[] = []
  private menuEl: OASMenu | null = null
  private anchorEl: HTMLElement | null = null
  private anchor: Element | null = null
  private arrowBtn: HTMLButtonElement | null = null
  private arrowEl: HTMLElement | null = null
  /** 上一次 update() 的 open 状态：区分「打开瞬间」与关闭后的属性微调（决定退场动画是否播放） */
  private wasOpen = false
  /** 上次 open 状态（null = 未初始化，首帧不派发 oas-open-change，同 tooltip/popover） */
  private prevOpen: boolean | null = null
  /** hover 开/合防抖计时器 */
  private hoverShowTimer: ReturnType<typeof setTimeout> | null = null
  private hoverHideTimer: ReturnType<typeof setTimeout> | null = null
  /** 退场动画结束后的隐藏延时计时器 */
  private closeAnimTimer: ReturnType<typeof setTimeout> | null = null
  /** 滚动/尺寸变化重定位监听是否已挂 */
  private scrollFollow = false
  private scrollRaf = 0
  /** 鼠标按下标记：click+focus 共存时区分「鼠标点击聚焦」与「键盘/程序化聚焦」 */
  private mouseDown = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const chevron = iconRegistry['chevron-down'] ?? ''
    return `
      <style>${STYLE}</style>
      <div class="split-group" part="split-group">
        <slot></slot>
        <button class="arrow-btn" part="split-arrow" type="button" aria-haspopup="menu" aria-expanded="false">
          <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${chevron}</svg>
        </button>
      </div>
      <div class="menu-anchor" part="menu" hidden>
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
        <oas-menu tabindex="-1"></oas-menu>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.anchorEl = this.shadow.querySelector('.menu-anchor')
    this.menuEl = this.shadow.querySelector('oas-menu')
    this.anchor = this.querySelector(':scope > *') ?? this
    this.arrowBtn = this.shadow.querySelector<HTMLButtonElement>('.arrow-btn')
    this.arrowEl = this.shadow.querySelector('.arrow')

    // 点击触发：trigger 含 click 时生效（运行时改 trigger 走同一监听，处理内按当前属性 gate）
    this.anchor?.addEventListener('click', (e: Event) => {
      if (!this.hasTrigger('click') || this.hasAttr('disabled')) return
      if (this.hasAttr('split')) {
        // 下拉按钮模式：主按钮只派发动作事件，不开菜单；箭头按钮负责开合
        this.emit('action', { originalEvent: e })
      } else {
        this.toggle()
      }
    })
    this.arrowBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      if (!this.hasTrigger('click') || this.hasAttr('disabled')) return
      this.toggle()
    })
    // hover 触发：悬停宿主（含触发元素）开、移出宿主/浮层面板关；面板入/出也监听，
    // 使悬停区域 = 宿主 + 面板（跨 8px 间隙移动不闪关）
    this.addEventListener('mouseenter', this.onHoverEnter)
    this.addEventListener('mouseleave', this.onHoverLeave)
    this.anchorEl?.addEventListener('mouseenter', this.onPanelEnter)
    this.anchorEl?.addEventListener('mouseleave', this.onPanelLeave)
    // focus 触发：聚焦开、失焦（焦点移出宿主/面板）关
    this.addEventListener('mousedown', () => {
      this.mouseDown = true
    })
    this.addEventListener('mouseup', () => {
      this.mouseDown = false
    })
    this.addEventListener('focusin', this.onFocusIn)
    this.addEventListener('focusout', this.onFocusOut)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    // 滚动/尺寸变化重定位监听（scroll 用 capture 捕获嵌套容器滚动，同 tooltip 的 virtual 跟随）
    this.onCleanup(() => {
      window.removeEventListener('scroll', this.onScroll, { capture: true })
      window.removeEventListener('resize', this.onScroll)
    })
    // 计时器统一清理（hover 防抖 + 退场隐藏延时），断开连接无孤儿
    this.onCleanup(() => {
      if (this.hoverShowTimer) clearTimeout(this.hoverShowTimer)
      if (this.hoverHideTimer) clearTimeout(this.hoverHideTimer)
      if (this.closeAnimTimer) clearTimeout(this.closeAnimTimer)
    })
    // 内层 oas-menu 的选中事件转发为 dropdown 的 oas-select 并关闭（多级子菜单叶子项同样走这里）
    this.menuEl?.addEventListener('oas-select', (e: Event) => {
      const detail = (e as CustomEvent).detail as { value?: string }
      if (typeof detail?.value !== 'string') return
      this.setAttribute('value', detail.value)
      this.emit('select', { value: detail.value })
      // hide-on-click=false 时不关闭（多选/勾选场景）；默认选中即关
      if (this.getAttr('hide-on-click', 'true') !== 'false') this.removeAttribute('open')
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（menu-anchor 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.menu-anchor')) return false
    this.bind()
    return true
  }

  /** 断开连接时复位滚动跟随标记（监听已由 onCleanup 移除，重连后重新挂载） */
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.scrollFollow = false
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.removeAttribute('open')
    }
  }

  // —— trigger 触发方式 ——

  /** trigger 触发方式列表：'click'/'hover'/'focus' 空格分隔多选（如 "click hover"），默认 click */
  private triggerList(): string[] {
    return this.getAttr('trigger', 'click').split(/\s+/).filter(Boolean)
  }

  private hasTrigger(t: 'click' | 'hover' | 'focus'): boolean {
    return this.triggerList().includes(t)
  }

  private onHoverEnter = (): void => {
    if (!this.hasTrigger('hover') || this.hasAttr('disabled')) return
    this.clearHoverHide()
    this.hoverShowTimer = setTimeout(
      () => this.setOpen(true),
      this.hoverDelay('hover-delay', HOVER_DELAY),
    )
  }

  private onHoverLeave = (e: MouseEvent): void => {
    // 指针离开宿主即清除鼠标按下标记（mousedown 后拖拽到组件外释放不会残留，避免误判后续键盘聚焦）
    this.mouseDown = false
    if (!this.hasTrigger('hover') || this.hasAttr('disabled')) return
    // 指针移到浮层面板（shadow 内）或宿主 light DOM 内不关：悬停区域 = 宿主 + 面板
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearHoverShow()
    this.hoverHideTimer = setTimeout(
      () => this.setOpen(false),
      this.hoverDelay('hover-hide-delay', HOVER_HIDE_DELAY),
    )
  }

  private onPanelEnter = (): void => {
    if (!this.hasTrigger('hover')) return
    this.clearHoverHide()
  }

  private onPanelLeave = (e: MouseEvent): void => {
    if (!this.hasTrigger('hover')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.hoverHideTimer = setTimeout(
      () => this.setOpen(false),
      this.hoverDelay('hover-hide-delay', HOVER_HIDE_DELAY),
    )
  }

  /** 指针/焦点移到的目标是否仍在「宿主 + 浮层面板」区域内（跨 shadow 时 relatedTarget 已 retarget 到 shadow host） */
  private hoverTargetInside(rel: EventTarget | null): boolean {
    return !!rel && rel instanceof Node && (this.contains(rel) || this.shadow.contains(rel))
  }

  private onFocusIn = (): void => {
    if (!this.hasTrigger('focus') || this.hasAttr('disabled')) return
    // click+focus 共存：鼠标点击聚焦已由 click 触发接管（随后会 toggle），focusin 只响应键盘/程序化聚焦
    if (this.hasTrigger('click') && this.mouseDown) {
      this.mouseDown = false
      return
    }
    this.setOpen(true)
  }

  private onFocusOut = (e: FocusEvent): void => {
    this.mouseDown = false
    if (!this.hasTrigger('focus') || this.hasAttr('disabled')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.setOpen(false)
  }

  /** hover 防抖延时：属性缺省用内置默认（hover-delay 150 / hover-hide-delay 100） */
  private hoverDelay(attr: 'hover-delay' | 'hover-hide-delay', fallback: number): number {
    const n = Number.parseInt(this.getAttr(attr, ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }

  private clearHoverShow(): void {
    if (this.hoverShowTimer) {
      clearTimeout(this.hoverShowTimer)
      this.hoverShowTimer = null
    }
  }

  private clearHoverHide(): void {
    if (this.hoverHideTimer) {
      clearTimeout(this.hoverHideTimer)
      this.hoverHideTimer = null
    }
  }

  /** open 状态写入（hover/focus 触发入口；click/Esc/外部点击/选中直接改属性，更新统一派发事件） */
  private setOpen(open: boolean): void {
    if (open) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  protected override update(): void {
    this.parseItems()
    const open = this.hasAttr('open')
    if (!this.menuEl || !this.anchorEl) return
    // 拆分箭头按钮的可访问性：haspopup=menu + expanded 随 open 同步 + locale 可访问名称 + disabled 跟随
    if (this.arrowBtn) {
      this.arrowBtn.setAttribute('aria-expanded', String(open))
      this.arrowBtn.setAttribute('aria-label', this.t('dropdown.openMenu'))
      this.arrowBtn.disabled = this.hasAttr('disabled')
    }
    // 整体禁用：宿主 aria-disabled 同步（视觉降饱和走 CSS :host([disabled])）
    this.setAttribute('aria-disabled', String(this.hasAttr('disabled')))
    // 箭头显隐（arrow 默认显示，arrow="false" 隐藏）；骨架保留保证 DSD 快照/水合结构一致
    if (this.arrowEl) {
      this.arrowEl.toggleAttribute('hidden', this.getAttr('arrow', 'true') === 'false')
    }
    // open 状态迁移 → oas-open-change（受控 setAttribute 与 click/hover/focus 触发都会走到这里，同 tooltip/popover）
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    if (open) {
      this.menuEl.setAttribute('items', JSON.stringify(this.itemsList))
      this.menuEl.setAttribute('value', this.getAttr('value', ''))
      this.anchorEl.hidden = false
      this.anchorEl.classList.remove('oas-closing')
      document.addEventListener('click', this.handleOutside)
      this.position()
      this.syncScrollFollow(true)
    } else {
      if (this.wasOpen) {
        this.playClose()
      } else {
        this.anchorEl.hidden = true
      }
      document.removeEventListener('click', this.handleOutside)
      this.syncScrollFollow(false)
      // 收起内层菜单残留的级联展开态，避免重开时子菜单直接可见；
      // SSR/Node 渲染环境无 MouseEvent，跳过（SSR 快照本就是关闭态）
      if (typeof MouseEvent !== 'undefined') {
        this.menuEl.shadowRoot
          ?.querySelector('.menu')
          ?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      }
    }
    this.wasOpen = open
  }

  /**
   * 退场动画：挂 oas-closing 类播放反向 fade/scale，动画时长后落 hidden。
   * 期间若被重开（open 属性回来），open 分支已移除 oas-closing，到点定时器检查后放弃隐藏。
   * 用户偏好减少动效（prefers-reduced-motion）时直接隐藏，不等动画时长。
   */
  private playClose(): void {
    const panel = this.anchorEl
    if (!panel) return
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      panel.hidden = true
      return
    }
    panel.classList.add('oas-closing')
    if (this.closeAnimTimer) clearTimeout(this.closeAnimTimer)
    this.closeAnimTimer = setTimeout(() => {
      this.closeAnimTimer = null
      // 退场期间被重开：open 分支已移除 oas-closing 并取消隐藏，这里只兜底
      if (this.hasAttr('open')) return
      panel.classList.remove('oas-closing')
      panel.hidden = true
    }, ANIM_MS)
  }

  /**
   * 面板定位：默认 computePosition（空间不足沿主轴翻转 + 视口边缘避让）；
   * auto-adjust-overflow=false 时严格按请求 placement 计算，不翻转不避让（面板可越出视口，
   * autoAdjustOverflow 同语义）。12 向 placement 拆为「基向 + 交叉轴对齐后缀」：
   * 基向（top/bottom/left/right）走定位引擎（含翻转），-start/-end 在交叉轴贴合锚点边
   * （bottom-start 即面板左缘对齐触发器左缘），翻转后对齐后缀保留（bottom-start→top-start）。
   * data-placement 写完整 12 向值，箭头/动画按基向消费（CSS 前缀匹配）。
   */
  private position(): void {
    if (!this.anchorEl || !this.anchor) return
    const anchorRect = this.anchor.getBoundingClientRect()
    const panelRect = this.anchorEl.getBoundingClientRect()
    const { base, align } = this.parsePlacement(this.getAttr('placement', 'bottom'))
    const offset = this.parseOffset()
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const viewport = { width: window.innerWidth, height: window.innerHeight }

    let top: number
    let left: number
    let baseActual: PlacementBase
    if (autoAdjust) {
      const r = computePosition(anchorRect, panelRect, base, viewport, offset)
      top = r.top
      left = r.left
      // 入参为 4 向基向（center 对齐），引擎返回 placement 必为 4 向基向（含翻转），类型上收窄
      baseActual = r.placement as PlacementBase
    } else {
      const anchorCenterX = anchorRect.left + anchorRect.width / 2
      const anchorCenterY = anchorRect.top + anchorRect.height / 2
      const raw: Record<PlacementBase, { top: number; left: number }> = {
        top: {
          top: anchorRect.top - panelRect.height - offset,
          left: anchorCenterX - panelRect.width / 2,
        },
        bottom: { top: anchorRect.bottom + offset, left: anchorCenterX - panelRect.width / 2 },
        left: {
          left: anchorRect.left - panelRect.width - offset,
          top: anchorCenterY - panelRect.height / 2,
        },
        right: { left: anchorRect.right + offset, top: anchorCenterY - panelRect.height / 2 },
      }
      const p = raw[base]
      top = p.top
      left = p.left
      baseActual = base
    }

    // 交叉轴对齐：-start/-end 让面板边贴合锚点边；对齐后仍需视口夹取（与 computePosition 避让语义一致）
    if (align === 'start' || align === 'end') {
      if (baseActual === 'top' || baseActual === 'bottom') {
        left = align === 'start' ? anchorRect.left : anchorRect.right - panelRect.width
      } else {
        top = align === 'start' ? anchorRect.top : anchorRect.bottom - panelRect.height
      }
      if (autoAdjust) {
        left = Math.max(4, Math.min(left, viewport.width - panelRect.width - 4))
        top = Math.max(4, Math.min(top, viewport.height - panelRect.height - 4))
      }
    }

    const actual = baseActual + (align ? `-${align}` : '')
    this.anchorEl.style.top = `${top}px`
    this.anchorEl.style.left = `${left}px`
    this.anchorEl.setAttribute('data-placement', actual)
    this.setAnimOrigin(actual)
    this.positionArrow()
  }

  /** 解析 12 向 placement 为基向 + 对齐后缀；非法值回退 bottom */
  private parsePlacement(raw: string): { base: PlacementBase; align: Align } {
    const m = /^(top|bottom|left|right)(?:-(start|end))?$/.exec(raw.trim())
    if (!m) return { base: 'bottom', align: '' }
    return { base: m[1] as PlacementBase, align: (m[2] ?? '') as Align }
  }

  /** offset 偏移（px）：面板与触发器的间距，缺省 8（与 computePosition 的 GAP 一致） */
  private parseOffset(): number {
    const n = Number.parseInt(this.getAttr('offset', String(GAP)), 10)
    return Number.isFinite(n) && n >= 0 ? n : GAP
  }

  /**
   * 开合动画原点（transform-origin）随 placement 感知方向：
   * 主轴方向决定「从哪条边向外展开」（bottom 系列从顶边、top 系列从底边、left 系列从右边、right 系列从左边），
   * -start/-end 把交叉轴原点贴到对齐边，未对齐时居中。写入 --oas-origin-x/y，内层 oas-menu 通过继承消费。
   */
  private setAnimOrigin(placement: string): void {
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
    this.anchorEl?.style.setProperty('--oas-origin-x', originX)
    this.anchorEl?.style.setProperty('--oas-origin-y', originY)
  }

  /**
   * 箭头定位：arrow-point-at-center=true 时箭头精确指向锚点中心（投影到面板边 + 边缘夹取，箭头尖端不越出面板圆角）；
   * 面板被视口避让偏移后箭头仍指向触发元素。默认（无该属性）箭头保持面板居中（CSS calc）。
   * 12 向 placement 下按基向判断主轴（data-placement 前缀匹配）。
   */
  private positionArrow(): void {
    if (!this.arrowEl || !this.anchorEl || !this.anchor) return
    const show = this.getAttr('arrow', 'true') !== 'false'
    // 默认箭头面板居中；arrow-point-at-center 时箭头精确指向锚点中心（与 tooltip/popover 及 pointAtCenter 语义一致）
    if (!show || !this.hasAttr('arrow-point-at-center')) {
      this.arrowEl.style.removeProperty('--arrow-x')
      this.arrowEl.style.removeProperty('--arrow-y')
      return
    }
    const anchorRect = this.anchor.getBoundingClientRect()
    const panelRect = this.anchorEl.getBoundingClientRect()
    const placement = this.anchorEl.getAttribute('data-placement') ?? ''
    const clamp = (v: number, max: number): number => Math.max(ARROW_PAD, Math.min(v, max))
    if (placement.startsWith('top') || placement.startsWith('bottom')) {
      const center = anchorRect.left + anchorRect.width / 2
      const x = clamp(
        center - panelRect.left - ARROW_SIZE / 2,
        panelRect.width - ARROW_PAD - ARROW_SIZE,
      )
      this.arrowEl.style.setProperty('--arrow-x', `${x}px`)
      this.arrowEl.style.removeProperty('--arrow-y')
    } else {
      const center = anchorRect.top + anchorRect.height / 2
      const y = clamp(
        center - panelRect.top - ARROW_SIZE / 2,
        panelRect.height - ARROW_PAD - ARROW_SIZE,
      )
      this.arrowEl.style.setProperty('--arrow-y', `${y}px`)
      this.arrowEl.style.removeProperty('--arrow-x')
    }
  }

  /**
   * 滚动/窗口尺寸变化时重定位：打开期间监听 scroll（capture 捕获嵌套容器滚动）与 resize，
   * rAF 节流；close-on-scroll 属性存在时改为滚动即关闭（fixed 定位与页面脱节时的兜底）。
   * 监听随 open 增减，断开连接由 onCleanup 移除 + disconnectedCallback 复位标记。
   */
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
    if (typeof requestAnimationFrame === 'function') {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = requestAnimationFrame(() => this.onScrollTick())
    } else {
      this.onScrollTick()
    }
  }

  private onScrollTick(): void {
    if (!this.anchorEl || !this.hasAttr('open')) return
    if (this.hasAttr('close-on-scroll')) {
      this.removeAttribute('open')
    } else {
      this.position()
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenuItem => i && typeof i.value === 'string')
        : []
    } catch {
      this.itemsList = []
    }
  }
}
