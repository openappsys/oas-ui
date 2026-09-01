import { OASElement } from '@oas-ui/core'

/** 滑出方向（横向管宽、纵向管高） */
export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'

/** 关闭来源：before-close 拦截与 oas-close 事件 detail.source */
export type DrawerCloseSource =
  | 'ok'
  | 'cancel'
  | 'close'
  | 'mask'
  | 'esc'
  | 'swipe'
  | 'resize'
  | 'api'
  | 'external'

/**
 * 打开中的抽屉栈（模块级 registry，跨实例共享）：
 * - 入栈序即层级序：z-index 随栈深递增（嵌套抽屉后开者置顶）
 * - Esc / 焦点陷阱只由栈顶抽屉接管（逐层关闭）
 * - 焦点归还只在「自己是最后打开的浮层」时执行（不抢下层抽屉/模态焦点）
 */
const drawerStack: OASDrawer[] = []

function pushStack(el: OASDrawer): void {
  if (!drawerStack.includes(el)) drawerStack.push(el)
}

function popStack(el: OASDrawer): void {
  const idx = drawerStack.indexOf(el)
  if (idx >= 0) drawerStack.splice(idx, 1)
}

/** 栈顶抽屉（无则 null） */
function topDrawer(): OASDrawer | null {
  return drawerStack[drawerStack.length - 1] ?? null
}

/** 栈内是否有可见模态浮层（跨组件协作：Esc 不穿透到下层抽屉） */
function hasVisibleModal(): boolean {
  return document.querySelectorAll('oas-modal[visible]').length > 0
}

/** 同步全部打开抽屉的 z-index（层级变化时全栈重算） */
function syncStackZ(): void {
  for (const d of drawerStack) d.applyZ()
}

/** body 滚动锁（跨抽屉深度计数：最后一个解锁才恢复原值） */
let scrollLockDepth = 0
let scrollLockOriginal = ''
function lockBodyScroll(): void {
  if (scrollLockDepth === 0) {
    scrollLockOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockDepth++
}
function unlockBodyScroll(): void {
  if (scrollLockDepth <= 0) return
  scrollLockDepth--
  if (scrollLockDepth === 0) document.body.style.overflow = scrollLockOriginal
}

const STYLE = `
:host {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s linear var(--oas-transition-base, 180ms);
}
.mask[data-open] {
  opacity: 1;
  visibility: visible;
  transition:
    opacity var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s;
}
.panel {
  position: fixed;
  display: flex;
  flex-direction: column;
  background: var(--oas-color-bg);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  visibility: hidden;
  /* transform/opacity 驱动动画（性能纪律）；height 参与 snap 吸附过渡 */
  transition:
    transform var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    height var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s linear var(--oas-transition-base, 180ms);
}
.panel[data-open] {
  visibility: visible;
  transition:
    transform var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    height var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    visibility 0s;
}
.panel[data-open] {
  transform: none;
}
/* 四向定位：物理方向（placement 即物理语义，RTL 不翻转）；初始位移在关闭方向的相反侧 */
.panel[data-placement='left'] {
  inset-block: 0;
  left: 0;
  width: 320px;
  max-width: 90vw;
  transform: translateX(-100%);
  box-shadow: 4px 0 16px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
}
.panel[data-placement='right'] {
  inset-block: 0;
  right: 0;
  width: 320px;
  max-width: 90vw;
  transform: translateX(100%);
  box-shadow: -4px 0 16px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
}
.panel[data-placement='top'] {
  inset-inline: 0;
  top: 0;
  height: 320px;
  max-height: 90vh;
  transform: translateY(-100%);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
}
.panel[data-placement='bottom'] {
  inset-inline: 0;
  bottom: 0;
  height: 320px;
  max-height: 90vh;
  transform: translateY(100%);
  box-shadow: 0 -4px 16px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2, 8px);
  padding: var(--oas-space-4, 16px);
  border-bottom: 1px solid var(--oas-color-border);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg, 16px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2, 8px);
}
.header-actions[hidden] {
  display: none;
}
.close-btn {
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md, 14px);
  line-height: 1;
  padding: var(--oas-space-1, 4px);
  border-radius: var(--oas-radius-sm, 4px);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
}
.close-btn:hover {
  color: var(--oas-color-text-primary);
}
.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--oas-space-4, 16px);
  font-size: var(--oas-font-size-md, 14px);
  line-height: 1.6;
}
.footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--oas-space-2, 8px);
  padding: var(--oas-space-4, 16px);
  border-top: 1px solid var(--oas-color-border);
}
.footer-actions {
  display: inline-flex;
  gap: var(--oas-space-2, 8px);
}
.footer-actions[hidden] {
  display: none;
}
.btn {
  min-width: 64px;
  height: var(--oas-control-height-md, 32px);
  padding: 0 var(--oas-space-3, 12px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md, 6px);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-md, 14px);
  cursor: pointer;
  font-family: inherit;
}
.btn[part='ok'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.btn[disabled] {
  opacity: 0.6;
  cursor: default;
}
/* 确定按钮 loading：内置 spinner（keyframes 作用域隔离于本 shadow） */
.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-drawer-spin 0.8s linear infinite;
  vertical-align: -0.125em;
  margin-inline-end: var(--oas-space-1, 4px);
}
.spinner[hidden] {
  display: none;
}
/* 内容加载态：骨架占位 + 内容隐藏 */
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3, 12px);
  padding: var(--oas-space-2, 8px);
}
.skeleton[hidden] {
  display: none;
}
.skeleton-row {
  height: var(--oas-control-height-md, 32px);
  border-radius: var(--oas-radius-sm, 4px);
  background: color-mix(in srgb, var(--oas-color-text-primary) 9%, transparent);
  animation: oas-drawer-pulse 1.2s var(--oas-ease-out, ease-in-out) infinite;
}
/* 拖拽把手（swipe 关闭 / snap 吸附）：贴关闭方向的对侧边缘 */
.handle {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  color: var(--oas-color-text-secondary);
}
.handle[hidden] {
  display: none;
}
.handle::after {
  content: '';
  display: block;
  background: var(--oas-color-border-strong);
}
.panel[data-placement='bottom'] .handle {
  top: var(--oas-space-2, 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 16px;
}
.panel[data-placement='bottom'] .handle::after {
  width: 36px;
  height: 4px;
  border-radius: 2px;
}
.panel[data-placement='top'] .handle {
  bottom: var(--oas-space-2, 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 16px;
}
.panel[data-placement='top'] .handle::after {
  width: 36px;
  height: 4px;
  border-radius: 2px;
}
.panel[data-placement='left'] .handle,
.panel[data-placement='right'] .handle {
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 48px;
}
.panel[data-placement='left'] .handle {
  right: var(--oas-space-2, 8px);
}
.panel[data-placement='left'] .handle::after {
  width: 4px;
  height: 36px;
  border-radius: 2px;
}
.panel[data-placement='right'] .handle {
  left: var(--oas-space-2, 8px);
}
.panel[data-placement='right'] .handle::after {
  width: 4px;
  height: 36px;
  border-radius: 2px;
}
/* 边缘拖拽条（resizable）：贴自由边；悬停/聚焦/拖拽中亮主色 */
.rail {
  position: absolute;
  z-index: 3;
  touch-action: none;
}
.rail[hidden] {
  display: none;
}
.rail::after {
  content: '';
  position: absolute;
  background: transparent;
  transition: background var(--oas-transition-fast, 120ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
.rail:hover::after,
.rail:focus-visible::after,
.panel[data-resizing] .rail::after {
  background: var(--oas-color-primary);
}
.panel[data-placement='left'] .rail,
.panel[data-placement='right'] .rail {
  inset-block: 0;
  width: 6px;
  cursor: col-resize;
}
.panel[data-placement='left'] .rail {
  right: 0;
}
.panel[data-placement='right'] .rail {
  left: 0;
}
.panel[data-placement='top'] .rail,
.panel[data-placement='bottom'] .rail {
  inset-inline: 0;
  height: 6px;
  cursor: row-resize;
}
.panel[data-placement='top'] .rail {
  bottom: 0;
}
.panel[data-placement='bottom'] .rail {
  top: 0;
}
.panel[data-placement='left'] .rail::after,
.panel[data-placement='right'] .rail::after {
  inset-block: 0;
  width: 2px;
  border-radius: 2px;
}
.panel[data-placement='left'] .rail::after {
  right: 2px;
}
.panel[data-placement='right'] .rail::after {
  left: 2px;
}
.panel[data-placement='top'] .rail::after,
.panel[data-placement='bottom'] .rail::after {
  inset-inline: 0;
  height: 2px;
  border-radius: 2px;
}
.panel[data-placement='top'] .rail::after {
  bottom: 2px;
}
.panel[data-placement='bottom'] .rail::after {
  top: 2px;
}
/* 拖拽/吸附中：禁用文本选中 + 关过渡（transform/height 由 JS 直驱） */
.panel[data-swiping],
.panel[data-resizing] {
  user-select: none;
  transition: none;
}
@keyframes oas-drawer-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes oas-drawer-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mask,
  .panel {
    transition: none;
  }
}
`

/** size 预设档位宽度（对齐主流抽屉尺寸；纵向 placement 时映射为高度） */
const SIZE_PRESETS: Record<string, string> = {
  small: '256px',
  medium: '378px',
  large: '736px',
}

/** 关闭阈值：拖拽位移超过面板尺寸的该比例即关闭（移动端抽屉通行惯例） */
const SWIPE_CLOSE_RATIO = 0.35
/** 快速滑动判定：位移/时长（px/ms），超过且位移足够即视为意图关闭 */
const SWIPE_VELOCITY = 0.8
const SWIPE_VELOCITY_MIN_DIST = 30

export class OASDrawer extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'visible',
      'title',
      'placement',
      'no-footer',
      'no-mask-close',
      'width',
      'size',
      'no-scroll-lock',
      'no-focus-trap',
      'ok-text',
      'cancel-text',
      'loading',
      'ok-loading',
      'destroy-on-close',
      'append-to',
      'z-index',
      'resizable',
      'resize-min',
      'resize-max',
      'no-esc-close',
      'no-close-btn',
      'no-header',
      'swipeable',
      'snap-points',
      'initial-focus',
    ]
  }

  /**
   * 确定按钮点击时不自动关闭、只派发 oas-ok，由宿主决定关闭时机。
   * 仅命令式 drawer API（异步 onOk）内部使用，避免异步流程中抽屉先关后 loading。
   */
  deferOkClose = false

  // 节点引用（panel/mask 可能被移入 append-to portal shadow，引用随 DOM 移动保持有效）
  private mask: HTMLElement | null = null
  private panel: HTMLElement | null = null
  private header: HTMLElement | null = null
  private titleSlot: HTMLSlotElement | null = null
  private titleFallback: HTMLElement | null = null
  private headerActions: HTMLElement | null = null
  private closeBtn: HTMLButtonElement | null = null
  private bodySlot: HTMLSlotElement | null = null
  private skeleton: HTMLElement | null = null
  private footerActions: HTMLElement | null = null
  private footerEl: HTMLElement | null = null
  private footerSlot: HTMLSlotElement | null = null
  private headerActionsSlot: HTMLSlotElement | null = null
  private okBtn: HTMLButtonElement | null = null
  private cancelBtn: HTMLButtonElement | null = null
  private rail: HTMLElement | null = null
  private handle: HTMLElement | null = null
  private portalHost: HTMLElement | null = null

  // 状态
  private isOpen = false
  private wasOpen = false
  private previousFocus: HTMLElement | null = null
  private pendingCloseSource: DrawerCloseSource = 'external'
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null
  /** 动画序号：每次开/关启动自增，旧的动画结束回调据此失效（快速切换防串扰） */
  private animSeq = 0

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="oas-drawer-title" data-placement="right">
        <div class="header" part="header">
          <span class="title" id="oas-drawer-title" part="title"><slot name="title"><span class="title-text"></span></slot></span>
          <span class="header-actions" part="header-actions" hidden><slot name="header-actions"></slot></span>
          <button class="close-btn" part="close" aria-label="">✕</button>
        </div>
        <div class="handle" part="handle" aria-hidden="true" hidden></div>
        <div class="body" part="body">
          <div class="skeleton" part="skeleton" aria-hidden="true" hidden>
            <div class="skeleton-row"></div>
            <div class="skeleton-row"></div>
            <div class="skeleton-row"></div>
          </div>
          <slot></slot>
        </div>
        <div class="rail" part="rail" role="separator" tabindex="0" hidden></div>
        <div class="footer" part="footer">
          <slot name="footer"></slot>
          <span class="footer-actions" part="footer-actions">
            <button class="btn" part="cancel" type="button"></button>
            <button class="btn" part="ok" type="button"><span class="spinner" part="spinner" hidden></span><span class="ok-label"></span></button>
          </span>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定交互事件（render 与水合路径共用） */
  private bind(): void {
    this.mask = this.shadow.querySelector('.mask')
    this.panel = this.shadow.querySelector('.panel')
    this.header = this.shadow.querySelector('.header')
    this.titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    this.titleFallback = this.shadow.querySelector('.title-text')
    this.headerActions = this.shadow.querySelector('.header-actions')
    this.closeBtn = this.shadow.querySelector('.close-btn')
    this.bodySlot = this.shadow.querySelector('slot:not([name])')
    this.skeleton = this.shadow.querySelector('.skeleton')
    this.footerActions = this.shadow.querySelector('.footer-actions')
    this.footerEl = this.shadow.querySelector('.footer')
    this.footerSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="footer"]')
    this.headerActionsSlot = this.shadow.querySelector<HTMLSlotElement>(
      'slot[name="header-actions"]',
    )
    this.okBtn = this.shadow.querySelector('[part="ok"]')
    this.cancelBtn = this.shadow.querySelector('[part="cancel"]')
    this.rail = this.shadow.querySelector('.rail')
    this.handle = this.shadow.querySelector('.handle')

    // 面板内部点击不透传到遮罩
    this.panel?.addEventListener('click', (e) => e.stopPropagation())
    this.mask?.addEventListener('click', () => {
      if (this.hasAttr('no-mask-close')) return
      this.requestClose('mask')
    })
    this.cancelBtn?.addEventListener('click', () => this.requestClose('cancel'))
    this.closeBtn?.addEventListener('click', () => this.requestClose('close'))
    this.okBtn?.addEventListener('click', () => this.handleOkClick())

    // 拖拽关闭 / snap 吸附：从把手或标题栏起手（body 排除防滚动冲突）
    this.handle?.addEventListener('pointerdown', (e) => this.startSwipe(e as PointerEvent))
    this.header?.addEventListener('pointerdown', (e) => this.startSwipe(e as PointerEvent))

    // resizable：边缘拖拽条 pointer 拖拽 + 方向键微调
    this.rail?.addEventListener('pointerdown', (e) => this.startRailDrag(e as PointerEvent))
    this.rail?.addEventListener('keydown', (e) => this.onRailKey(e as KeyboardEvent))

    // 命名插槽内容增减（slot 覆盖属性文案）时重刷
    this.titleSlot?.addEventListener('slotchange', () => this.update())
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="footer"]')
      ?.addEventListener('slotchange', () => this.update())
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="header-actions"]')
      ?.addEventListener('slotchange', () => this.update())

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // 栈顶且无模态在上才响应（嵌套抽屉逐层关；模态置顶时 Esc 归模态）
        if (topDrawer() !== this) return
        if (hasVisibleModal()) return
        if (this.hasAttr('no-esc-close')) return
        this.requestClose('esc')
        return
      }
      if (e.key === 'Tab') this.trapFocus(e)
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))

    // 拖拽中的全局 move/up 兜底清理（start 时按需注册，断开时保险移除）
    this.onCleanup(() => {
      document.removeEventListener('pointermove', this.onSwipeMove)
      document.removeEventListener('pointerup', this.endSwipe)
      document.removeEventListener('pointermove', this.onRailDrag)
      document.removeEventListener('pointerup', this.endRailDrag)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 断开连接：出栈 + 解锁滚动（防抽屉未 closed 就被移除时残留栈/锁） */
  override disconnectedCallback(): void {
    popStack(this)
    if (this.wasOpen && !this.hasAttr('no-scroll-lock')) unlockBodyScroll()
    super.disconnectedCallback()
  }

  /** 真水合：校验 SSR 快照结构（mask 与 panel 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    if (!this.shadow.querySelector('.panel')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  /** 编程关闭（命令式 API handle / 宿主主动）：绕过 before-close 拦截，立即开始关闭动画 */
  close(): void {
    if (!this.isOpen) return
    this.pendingCloseSource = 'api'
    this.removeAttribute('visible')
  }

  /** 公开：当前是否可见（同步查询） */
  get opened(): boolean {
    return this.isOpen
  }

  /** 公开：是否处于关闭动画中（命令式 API 据此判定是否需等待 oas-closed 后销毁） */
  get closing(): boolean {
    return !this.isOpen && this.wasOpen
  }

  /** 确定点击：ok-loading 中忽略；deferOkClose（命令式异步 onOk）只派发事件；否则走关闭流程 */
  private handleOkClick(): void {
    if (this.hasAttr('ok-loading')) return
    if (this.deferOkClose) {
      this.emit('ok')
      return
    }
    if (!this.isOpen) return
    if (!this.emit('before-close', { source: 'ok' }, { cancelable: true })) return
    this.pendingCloseSource = 'ok'
    this.emit('ok')
    this.removeAttribute('visible')
  }

  /** 关闭请求（✕/取消/遮罩/Esc/手势）：cancelable before-close 拦截，放行后移除 visible */
  private requestClose(source: DrawerCloseSource): void {
    if (!this.isOpen) return
    if (!this.emit('before-close', { source }, { cancelable: true })) return
    this.pendingCloseSource = source
    this.removeAttribute('visible')
  }

  /**
   * 宽度解析：显式 width 优先于 size；size 支持预设档位（small/medium/large）
   * 或具体值（纯数字视为 px，或直接是长度/百分比），无法解析时回退空串（用 CSS 默认）。
   */
  private resolveDimension(): string {
    const explicit = this.getAttr('width')
    if (explicit) return explicit
    const size = this.getAttr('size')
    if (!size) return ''
    const preset = SIZE_PRESETS[size]
    if (preset) return preset
    if (/^\d+(\.\d+)?$/.test(size)) return `${size}px`
    if (/^\d+(\.\d+)?(px|rem|em|vw|vh|%)$/.test(size)) return size
    return ''
  }

  private isHorizontal(): boolean {
    const p = this.getAttr('placement', 'right')
    return p === 'left' || p === 'right'
  }

  /** 横向管宽、纵向管高：placement 决定 width/size 落在哪个维度；
   *  bottom/top 配 snap-points 时吸附到最高吸附点（覆盖常规尺寸解析；拖拽/吸附过程中不覆盖） */
  private applyDimension(): void {
    const panel = this.panel
    if (!panel) return
    const p = this.getAttr('placement', 'right')
    if (
      this.hasAttr('snap-points') &&
      (p === 'bottom' || p === 'top') &&
      !this.railDragging &&
      !this.swiping
    ) {
      const pts = this.snapPointsPx()
      if (pts.length > 0) {
        panel.style.height = `${pts[pts.length - 1]!}px`
        panel.style.width = ''
        return
      }
    }
    const dim = this.resolveDimension()
    if (this.isHorizontal()) {
      panel.style.width = dim
      panel.style.height = ''
    } else {
      panel.style.height = dim
      panel.style.width = ''
    }
  }

  /** z-index 计算：显式 z-index 属性覆盖默认 overlay 档位；嵌套层级叠加栈深偏移 */
  applyZ(): void {
    const level = Math.max(0, drawerStack.indexOf(this))
    const explicit = this.getAttr('z-index')
    const base =
      explicit !== '' && Number.isFinite(Number(explicit))
        ? `var(--oas-z-index-base, 0) + ${Number(explicit)}`
        : `var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040)`
    const maskZ = `calc(${base} + ${level})`
    if (this.mask) this.mask.style.zIndex = maskZ
    if (this.panel) this.panel.style.zIndex = `calc(${base} + ${level + 1})`
  }

  /** 打开动画：入栈、锁滚动、记录来源焦点、移入初始焦点、data-open 驱动 CSS 过渡 */
  private onOpenStart(): void {
    this.isOpen = true
    this.wasOpen = true
    pushStack(this)
    if (!this.hasAttr('no-scroll-lock')) lockBodyScroll()
    this.previousFocus = document.activeElement as HTMLElement
    this.emit('open')
    syncStackZ()
    this.mask?.setAttribute('data-open', '')
    this.panel?.setAttribute('data-open', '')
    this.panel?.removeAttribute('data-swiping')
    this.panel?.style.removeProperty('transform')
    this.focusInitial()
    this.emitOnAnimEnd(() => this.emit('opened'), () => this.isOpen)
  }

  /** 关闭动画：派发 oas-close（含来源）、出栈（立即让位下层抽屉）、移除 data-open、动画结束后收尾 */
  private onCloseStart(): void {
    this.isOpen = false
    const source = this.pendingCloseSource
    this.pendingCloseSource = 'external'
    this.emit('close', { source })
    // 关闭即出栈：Esc 逐层关与焦点陷阱立即让位下层抽屉（动画结束后不再重复出栈）
    popStack(this)
    syncStackZ()
    this.mask?.removeAttribute('data-open')
    this.panel?.removeAttribute('data-open')
    this.panel?.removeAttribute('data-swiping')
    this.panel?.style.removeProperty('transform')
    this.emitOnAnimEnd(() => this.onClosed(), () => !this.isOpen)
  }

  /** 关闭动画完成：closed 事件 + 滚动解锁 + 焦点归还 + destroy-on-close */
  private onClosed(): void {
    this.emit('closed')
    if (!this.hasAttr('no-scroll-lock')) unlockBodyScroll()
    // 焦点归还：仅当自己是最后打开的浮层（栈空且无模态）——不抢下层抽屉焦点
    if (topDrawer() === null && !hasVisibleModal()) {
      this.previousFocus?.focus()
    }
    this.previousFocus = null
    this.wasOpen = false
    if (this.hasAttr('destroy-on-close')) this.replaceChildren()
  }

  /** 动画结束监听：transitionend 或兜底计时（reduced-motion / 环境无过渡）二选一 */
  private emitOnAnimEnd(cb: () => void, guard: () => boolean): void {
    const panel = this.panel
    const seq = ++this.animSeq
    if (!panel) {
      if (guard()) cb()
      return
    }
    let done = false
    const cleanup = (): void => {
      clearTimeout(timer)
      panel.removeEventListener('transitionend', onEnd)
    }
    const finish = (): void => {
      if (done || seq !== this.animSeq) return
      done = true
      cleanup()
      if (guard()) cb()
    }
    const onEnd = (e: Event): void => {
      // 只认面板自身的过渡（子元素过渡不早触发 opened/closed）
      if (e.target !== panel) return
      finish()
    }
    const timer = setTimeout(finish, this.animMs() + 60)
    panel.addEventListener('transitionend', onEnd)
    this.onCleanup(cleanup)
  }

  /** 动画时长（reduced-motion 降级为 0） */
  private animMs(): number {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 200
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200
  }

  /** 初始焦点：initial-focus 选择器（面板内优先，其次 light DOM）命中则聚焦，否则回退 ✕/首个可聚焦 */
  private focusInitial(): void {
    const panel = this.panel
    const sel = this.getAttr('initial-focus')
    let target: HTMLElement | null = null
    if (sel) {
      const inPanel = panel?.querySelector<HTMLElement>(sel)
      target = inPanel ?? this.querySelector<HTMLElement>(sel)
    }
    if (!target && this.closeBtn && !this.closeBtn.hidden) target = this.closeBtn
    if (!target) target = this.getFocusables()[0] ?? null
    target?.focus()
  }

  // ===== 焦点陷阱（P3，复用 modal 同构） =====

  /** 抽屉内可聚焦元素（按 DOM 顺序；hidden/disabled 的元素排除在陷阱外） */
  private getFocusables(): HTMLElement[] {
    const panel = this.panel
    if (!panel) return []
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([hidden]), [href]:not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])',
      ),
    )
  }

  /** 解析当前真实聚焦元素（happy-dom 把 shadow 焦点重定向为宿主，需回退 shadowRoot.activeElement） */
  private resolveActive(): HTMLElement | null {
    const ae = document.activeElement
    if (!ae) return null
    if (this.panel?.contains(ae)) return ae as HTMLElement
    if (ae === this) return this.shadow.activeElement as HTMLElement | null
    return null
  }

  /** 焦点是否落在抽屉可达区域（shadow 内，或 slot 分配的 light DOM 树，穿透嵌套 shadow） */
  private isWithinDrawerTree(node: Node | null): boolean {
    while (node) {
      if (node === this || node === this.shadow) return true
      if (node instanceof ShadowRoot) node = node.host
      else node = node.parentNode
    }
    return false
  }

  /** Tab/Shift+Tab 圈内循环；仅栈顶抽屉接管；无聚焦元素时不拦截 */
  private trapFocus(e: KeyboardEvent): void {
    if (!this.isOpen) return
    if (topDrawer() !== this) return
    if (this.hasAttr('no-focus-trap')) return
    const focusables = this.getFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = this.resolveActive()
    if (active == null && !this.isWithinDrawerTree(document.activeElement)) {
      e.preventDefault()
      first.focus()
      return
    }
    if (active && e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (active && !e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // ===== resizable（P12，参照 sidebar resizable 同构：rail 拖拽 + 方向键） =====

  private railDragging = false
  private railStart = 0
  private railStartDim = 0

  private resizeMin(): number {
    return Number(this.getAttr('resize-min', '160')) || 160
  }
  private resizeMax(): number {
    return Number(this.getAttr('resize-max', '1000')) || 1000
  }

  private startRailDrag(e: PointerEvent): void {
    if (!this.hasAttr('resizable') || !this.isOpen) return
    if (e.button !== 0 && e.pointerType !== 'touch') return
    e.preventDefault()
    this.railDragging = true
    this.railStart = this.isHorizontal() ? e.clientX : e.clientY
    this.railStartDim = this.currentDimensionPx()
    this.panel?.setAttribute('data-resizing', '')
    document.addEventListener('pointermove', this.onRailDrag)
    document.addEventListener('pointerup', this.endRailDrag, { once: true })
  }

  private onRailDrag = (e: PointerEvent): void => {
    if (!this.railDragging) return
    // 自由边朝向：left→右拖变宽(+)、right→左拖变宽(-)、top→下拖变高(+)、bottom→上拖变高(-)
    let delta: number
    const p = this.getAttr('placement', 'right')
    if (p === 'left') delta = e.clientX - this.railStart
    else if (p === 'right') delta = this.railStart - e.clientX
    else if (p === 'top') delta = e.clientY - this.railStart
    else delta = this.railStart - e.clientY
    this.setDimensionPx(this.railStartDim + delta)
  }

  private endRailDrag = (): void => {
    if (!this.railDragging) return
    this.railDragging = false
    this.panel?.removeAttribute('data-resizing')
    document.removeEventListener('pointermove', this.onRailDrag)
    this.emit('resize', { size: this.currentDimensionPx() })
  }

  /** 当前主轴尺寸（px）：横向取宽、纵向取高；width 属性优先，回落实际盒尺寸 */
  private currentDimensionPx(): number {
    const fromAttr = parseInt(this.getAttr('width'), 10)
    if (Number.isFinite(fromAttr) && fromAttr > 0) return fromAttr
    const panel = this.panel
    if (!panel) return 320
    return this.isHorizontal() ? panel.getBoundingClientRect().width : panel.getBoundingClientRect().height
  }

  /** 方向键微调（±8px；Home/End 跳 min/max），每次派发 oas-resize */
  private onRailKey(e: KeyboardEvent): void {
    if (!this.hasAttr('resizable')) return
    const horizontal = this.isHorizontal()
    const cur = this.currentDimensionPx()
    const step = 8
    let next: number | null = null
    if (horizontal) {
      if (e.key === 'ArrowRight') next = cur + step
      else if (e.key === 'ArrowLeft') next = cur - step
    } else {
      if (e.key === 'ArrowDown') next = cur + step
      else if (e.key === 'ArrowUp') next = cur - step
    }
    if (next === null && e.key === 'Home') next = this.resizeMin()
    if (next === null && e.key === 'End') next = this.resizeMax()
    if (next === null) return
    e.preventDefault()
    this.setDimensionPx(next)
    this.emit('resize', { size: this.currentDimensionPx() })
  }

  private setDimensionPx(px: number): void {
    const clamped = Math.round(Math.min(this.resizeMax(), Math.max(this.resizeMin(), px)))
    this.setAttribute('width', `${clamped}px`)
  }

  // ===== mobile 手势（P7：swipe 关闭 + snap 吸附 + 拖拽把手） =====

  private swiping = false
  private swipeStartX = 0
  private swipeStartY = 0
  private swipeStartTime = 0
  private swipeMoved = 0

  private swipeEnabled(): boolean {
    if (this.hasAttr('swipeable')) return true
    return this.hasAttr('snap-points') && this.getAttr('placement', 'right') === 'bottom'
  }

  private startSwipe(e: PointerEvent): void {
    if (!this.swipeEnabled() || !this.isOpen) return
    if (e.button !== 0 && e.pointerType !== 'touch') return
    // 把手/标题栏上的按钮点击不误触拖拽
    if ((e.target as Element | null)?.closest('button')) return
    e.preventDefault()
    this.swiping = true
    this.swipeStartX = e.clientX
    this.swipeStartY = e.clientY
    this.swipeStartTime = performance.now()
    this.swipeMoved = 0
    this.panel?.setAttribute('data-swiping', '')
    document.addEventListener('pointermove', this.onSwipeMove)
    document.addEventListener('pointerup', this.endSwipe, { once: true })
  }

  private onSwipeMove = (e: PointerEvent): void => {
    if (!this.swiping || !this.panel) return
    const p = this.getAttr('placement', 'right')
    // 关闭方向位移：bottom→下、top→上、left→右、right→左；反向拖拽钳制为 0
    let dx = 0
    let dy = 0
    if (p === 'bottom') dy = Math.max(0, e.clientY - this.swipeStartY)
    else if (p === 'top') dy = Math.max(0, this.swipeStartY - e.clientY)
    else if (p === 'left') dx = Math.max(0, e.clientX - this.swipeStartX)
    else if (p === 'right') dx = Math.max(0, this.swipeStartX - e.clientX)
    this.swipeMoved = Math.max(dx, dy)
    if (dy !== 0) this.panel.style.transform = `translateY(${dy}px)`
    if (dx !== 0) this.panel.style.transform = `translateX(${dx}px)`
  }

  private endSwipe = (): void => {
    if (!this.swiping) return
    this.swiping = false
    const panel = this.panel
    this.panel?.removeAttribute('data-swiping')
    document.removeEventListener('pointermove', this.onSwipeMove)
    const moved = this.swipeMoved
    const dim = this.currentDimensionPx() || 320
    const dt = Math.max(1, performance.now() - this.swipeStartTime)
    const fast = moved > SWIPE_VELOCITY_MIN_DIST && moved / dt > SWIPE_VELOCITY
    if (moved > dim * SWIPE_CLOSE_RATIO || fast) {
      panel?.style.removeProperty('transform')
      this.requestClose('swipe')
      return
    }
    // 未达阈值：bottom/top 且有 snap-points → 吸附最近点；否则回弹（清 transform）
    panel?.style.removeProperty('transform')
    const p = this.getAttr('placement', 'right')
    if ((p === 'bottom' || p === 'top') && this.hasAttr('snap-points')) this.snapToNearest(moved)
  }

  /** 解析吸附点：≤1 为视口比例，>1 为像素 */
  private snapPointsPx(): number[] {
    const raw = this.getAttr('snap-points')
    if (!raw) return []
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const out: number[] = []
    for (const part of raw.split(',')) {
      const n = Number(part.trim())
      if (!Number.isFinite(n) || n <= 0) continue
      out.push(n <= 1 ? Math.round(n * vh) : Math.round(n))
    }
    return out.sort((a, b) => a - b)
  }

  /** 释放后吸附到距离目标高度最近的吸附点（目标 = 打开高度 - 关闭方向位移） */
  private snapToNearest(closedDist: number): void {
    const panel = this.panel
    const points = this.snapPointsPx()
    if (!panel || points.length === 0) return
    const current = this.currentDimensionPx() || points[points.length - 1]!
    const target = Math.max(points[0]!, current - closedDist)
    let nearest = points[0]!
    let best = Infinity
    for (const pt of points) {
      const d = Math.abs(pt - target)
      if (d < best) {
        best = d
        nearest = pt
      }
    }
    panel.style.height = `${nearest}px`
    this.emit('resize', { size: nearest })
  }

  // ===== append-to（P11：挂载节点，参照 tour portal 同构） =====

  private ensurePortal(): void {
    const sel = this.getAttr('append-to')
    if (!sel) {
      this.destroyPortal()
      return
    }
    const target =
      sel === 'body' ? document.body : (document.querySelector(sel) as HTMLElement | null)
    if (!target) {
      this.destroyPortal()
      return
    }
    if (this.portalHost && this.portalHost.parentElement === target) return
    this.destroyPortal()
    const host = document.createElement('div')
    host.setAttribute('data-oas-drawer-portal', '')
    host.style.cssText =
      'position: fixed; inset: 0; pointer-events: none; z-index: 0;'
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    if (this.mask) root.appendChild(this.mask)
    if (this.panel) root.appendChild(this.panel)
    this.portalHost = host
  }

  private destroyPortal(): void {
    const host = this.portalHost
    if (!host) return
    this.portalHost = null
    if (this.mask && host.shadowRoot?.contains(this.mask)) this.shadow.appendChild(this.mask)
    if (this.panel && host.shadowRoot?.contains(this.panel)) this.shadow.appendChild(this.panel)
    host.remove()
  }

  protected override update(): void {
    const panel = this.panel
    if (!panel) return
    const visible = this.hasAttr('visible')

    // 显隐边沿：只在状态翻转时驱动动画（增量同步避免重复触发）
    if (visible && !this.isOpen) this.onOpenStart()
    else if (!visible && this.isOpen) this.onCloseStart()

    panel.setAttribute('aria-hidden', String(!visible))
    this.applyZ()
    this.applyDimension()
    panel.setAttribute('data-placement', this.getAttr('placement', 'right'))

    // append-to 挂载节点（挂在 update 末尾：初始 render 已缓存 refs，移动安全）
    this.ensurePortal()

    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题）。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本
    if (this.titleSlot && this.titleFallback) {
      this.titleFallback.textContent = this.titleCache ?? ''
      this.titleFallback.hidden = this.hasSlotContent(this.titleSlot)
    }
    // 关闭按钮 aria-label / 隐藏
    if (this.closeBtn) {
      this.closeBtn.setAttribute('aria-label', this.t('drawer.close'))
      this.closeBtn.hidden = this.hasAttr('no-close-btn')
    }
    // 标题区可整体隐藏
    if (this.header) this.header.hidden = this.hasAttr('no-header')
    // aria-labelledby：无标题区时移除可访问名关联（防止指向 hidden 元素）
    if (this.hasAttr('no-header')) panel.removeAttribute('aria-labelledby')
    else if (!panel.hasAttribute('aria-labelledby')) panel.setAttribute('aria-labelledby', 'oas-drawer-title')

    // 确定/取消文案（ok-text/cancel-text 覆盖 locale）与 loading 态
    const loading = this.hasAttr('loading')
    if (this.skeleton) this.skeleton.hidden = !loading
    if (this.bodySlot) this.bodySlot.hidden = loading
    if (this.okBtn) {
      const okText = this.getAttr('ok-text') || this.t('drawer.ok')
      this.okBtn.setAttribute('aria-label', okText)
      this.okBtn.querySelector<HTMLElement>('.ok-label')!.textContent = okText
      const okLoading = this.hasAttr('ok-loading')
      const spinner = this.okBtn.querySelector<HTMLElement>('.spinner')
      if (spinner) spinner.hidden = !okLoading
      this.okBtn.disabled = loading || okLoading
      this.okBtn.setAttribute('aria-busy', String(okLoading))
    }
    if (this.cancelBtn) {
      const cancelText = this.getAttr('cancel-text') || this.t('drawer.cancel')
      this.cancelBtn.setAttribute('aria-label', cancelText)
      this.cancelBtn.textContent = cancelText
      this.cancelBtn.disabled = loading
    }
    // footer：no-footer 或 footer 插槽有内容时隐藏内置按钮组；无 footer 时整体隐藏
    const footerSlotUsed = this.footerSlot ? this.hasSlotContent(this.footerSlot) : false
    if (this.footerEl) this.footerEl.style.display = this.hasAttr('no-footer') ? 'none' : ''
    if (this.footerActions) this.footerActions.hidden = footerSlotUsed

    // header-actions 插槽：空时隐藏容器
    if (this.headerActions) {
      this.headerActions.hidden = this.headerActionsSlot
        ? !this.hasSlotContent(this.headerActionsSlot)
        : true
    }

    // resizable：rail 显隐 + aria（方向随 placement）
    if (this.rail) {
      const show = this.hasAttr('resizable') && this.isOpen
      this.rail.hidden = !show
      if (show) {
        this.rail.setAttribute(
          'aria-orientation',
          this.isHorizontal() ? 'vertical' : 'horizontal',
        )
        this.rail.setAttribute('aria-label', this.t('drawer.resize'))
      }
    }
    // swipeable/snap：拖拽把手显隐
    if (this.handle) this.handle.hidden = !this.swipeEnabled() || !this.isOpen
  }
}
