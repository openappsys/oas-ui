import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ModalVariant = 'info' | 'success' | 'warning' | 'error'

/** 关闭来源：before-close 拦截与 oas-close 事件 detail.source */
export type ModalCloseSource =
  | 'ok'
  | 'cancel'
  | 'close-btn'
  | 'mask'
  | 'esc'
  | 'programmatic'

/** 关闭来源 → 动作语义（A32：✕/遮罩/Esc 归为 close，取消按钮归为 cancel，确定归为 confirm） */
const CLOSE_ACTION: Record<ModalCloseSource, 'confirm' | 'cancel' | 'close'> = {
  ok: 'confirm',
  cancel: 'cancel',
  'close-btn': 'close',
  mask: 'close',
  esc: 'close',
  programmatic: 'close',
}

/** 语义变体 → 内置图标名（iconRegistry 键） */
const SEMANTIC_ICONS: Record<ModalVariant, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
}

/**
 * body 滚动锁（P1，跨实例深度计数，最后一个解锁才恢复原值）。
 * 锁定时 overflow hidden + padding-right 补偿滚动条宽度（防止内容水平跳动）。
 */
let scrollLockDepth = 0
let scrollLockOriginalOverflow = ''
let scrollLockOriginalPadding = ''

/** 滚动条宽度：视口宽 - 文档宽（桌面端约 8-17px，移动端 0） */
function getScrollbarWidth(): number {
  if (typeof window === 'undefined' || typeof document.documentElement === 'undefined') return 0
  const w = window.innerWidth - document.documentElement.clientWidth
  return w > 0 ? w : 0
}

function lockBodyScroll(): void {
  if (scrollLockDepth === 0) {
    scrollLockOriginalOverflow = document.body.style.overflow
    scrollLockOriginalPadding = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    const gap = getScrollbarWidth()
    document.body.style.paddingRight =
      gap > 0 ? `calc(${scrollLockOriginalPadding || '0px'} + ${gap}px)` : scrollLockOriginalPadding
  }
  scrollLockDepth++
}

function unlockBodyScroll(): void {
  if (scrollLockDepth <= 0) return
  scrollLockDepth--
  if (scrollLockDepth === 0) {
    document.body.style.overflow = scrollLockOriginalOverflow
    document.body.style.paddingRight = scrollLockOriginalPadding
  }
}

const STYLE = `
:host {
  display: none;
}
:host([visible]) {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-modal-mask-bg, var(--oas-color-overlay));
  /* 遮罩模糊可选：--oas-modal-mask-blur 开口，默认 0 无模糊（性能/语义由宿主决定） */
  backdrop-filter: blur(var(--oas-modal-mask-blur, 0px));
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
}
.dialog {
  position: fixed;
  top: 100px;
  /* 水平居中不用 transform：fixed + left/right 0 + margin auto（transform 会让后代
     position:fixed 的浮层以其为包含块，modal 内 select 等下拉按视口算的坐标被错位解释） */
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 520px;
  min-width: 360px;
  max-width: 90vw;
  /* 视口高度保护：小窗口下不溢出（标题/关闭钮始终可达），超出部分由 body 滚动承载 */
  max-height: var(--oas-modal-max-height, 90vh);
  display: flex;
  flex-direction: column;
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: calc(calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050)) + 1);
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
/* 垂直居中：data-centered 由 update() 增量同步；inset 0 + margin auto（不用 transform，同上） */
.dialog[data-centered] {
  inset: 0;
  margin: auto;
}
/* 顶部贴边：position="top" 时贴视口顶缘（默认 top:100px；与 centered 互斥，同时设置时后置规则生效） */
:host([position='top']) .dialog {
  top: 0;
}
/* 可拖拽：标题栏抓取、触摸不滚动；拖拽中禁止选中文本（状态属性 dragging 与用户属性 draggable 区分） */
:host([draggable]) .header {
  cursor: move;
  touch-action: none;
}
:host([dragging]) {
  user-select: none;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.close-btn {
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
}
.close-btn:hover {
  color: var(--oas-color-text-primary);
}
.close-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.body {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
  /* 超出滚动：flex 子项收缩锚定（min-height 归零才允许被 max-height 限住） */
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  /* 滚动边缘指示（CSS-only scroll shadow）：上下边缘渐隐阴影提示该方向还有内容——
     上下 bg 覆盖层随内容滚动、到边缘时遮住阴影；径向阴影固定在视口边缘（background-attachment 分层） */
  background-color: var(--oas-color-bg);
  background-image:
    linear-gradient(var(--oas-color-bg) 30%, transparent),
    linear-gradient(transparent, var(--oas-color-bg) 70%),
    radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.12), transparent),
    radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.12), transparent);
  background-repeat: no-repeat;
  background-size:
    100% 24px,
    100% 24px,
    100% 12px,
    100% 12px;
  background-attachment: local, local, scroll, scroll;
}
/* 描述区（P14：description 插槽承载内容，dialog aria-describedby 关联）；默认隐藏 */
.description {
  padding-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.description[hidden] {
  display: none;
}
.footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-4);
  border-top: 1px solid var(--oas-color-border);
}
/* footer 插槽自定义内容：靠左排列（默认仅内置按钮时靠右） */
.footer slot[name='footer'] {
  margin-inline-end: auto;
}
.footer-actions {
  display: inline-flex;
  gap: var(--oas-space-2);
}
.footer-actions[hidden] {
  display: none;
}
.btn {
  min-width: 64px;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-md);
  cursor: pointer;
  font-family: inherit;
}
.btn[part='ok'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
/* 语义变体图标（type 属性）：正文顶部居中，颜色随语义（info 用 primary） */
.semantic-icon {
  display: block;
  text-align: center;
  font-size: 36px;
  line-height: 1;
  margin-bottom: var(--oas-space-3);
  color: var(--oas-color-primary);
}
.semantic-icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.semantic-icon[hidden] {
  display: none;
}
:host([type='success']) .semantic-icon {
  color: var(--oas-color-success);
}
:host([type='warning']) .semantic-icon {
  color: var(--oas-color-warning);
}
:host([type='error']) .semantic-icon {
  color: var(--oas-color-danger);
}
/* 全屏：铺满视口、无圆角/边距；规则后置 + 更高特异性，优先级高于 centered/width/draggable */
:host([fullscreen]) .dialog {
  inset: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: none;
  border-radius: 0;
  transform: none;
}
/* 全屏下拖拽语义失效：标题栏不显示 move 光标、恢复触摸默认行为 */
:host([fullscreen]) .header {
  cursor: default;
  touch-action: auto;
}
/* 确定按钮 loading：内置 spinner（复用按钮的 oas-spin 动效，shadow 内 keyframes 隔离） */
.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
  vertical-align: -0.125em;
  margin-inline-end: var(--oas-space-1);
}
.spinner[hidden] {
  display: none;
}
:host([loading]) .btn[part='ok'] {
  opacity: 0.6;
  cursor: default;
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`

export class OASModal extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'visible',
      'title',
      'no-footer',
      'no-cancel',
      'no-mask-close',
      'no-esc-close',
      'no-close-btn',
      'no-scroll-lock',
      'no-focus-trap',
      'destroy-on-close',
      'append-to',
      'position',
      'initial-focus',
      'role',
      'width',
      'centered',
      'draggable',
      'fullscreen',
      'loading',
      'type',
      'ok-text',
      'cancel-text',
      'focus-ok',
    ]
  }

  private previousFocus: HTMLElement | null = null
  private wasVisible = false
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null
  /** 关闭来源暂存：close() 记下意图，update() 关闭分支派发 oas-close 时消费并复位 */
  private pendingCloseSource: ModalCloseSource = 'programmatic'
  /** append-to portal host（mask/dialog 移入其 shadow 后引用仍有效） */
  private portalHost: HTMLElement | null = null

  // 节点引用缓存（append-to 会把 mask/dialog 移入 portal shadow，引用随移动保持有效）
  private mask: HTMLElement | null = null
  private dialog: HTMLElement | null = null
  private header: HTMLElement | null = null
  private titleSlot: HTMLSlotElement | null = null
  private titleFallback: HTMLElement | null = null
  private closeBtn: HTMLButtonElement | null = null
  private okBtn: HTMLButtonElement | null = null
  private cancelBtn: HTMLElement | null = null
  private footerEl: HTMLElement | null = null
  private footerSlot: HTMLSlotElement | null = null
  private footerActions: HTMLElement | null = null
  private semanticIcon: HTMLElement | null = null
  private descriptionEl: HTMLElement | null = null
  private descriptionSlot: HTMLSlotElement | null = null

  /** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /**
   * 确定按钮点击时不自动关闭、只派发 oas-ok，由宿主决定关闭时机。
   * 仅 confirm/prompt 命令式 API（异步 onOk）内部使用，避免异步流程中 modal 先关后 loading。
   */
  deferOkClose = false

  // 拖拽状态：dragging 为内部状态属性（未观察），draggable 为用户属性
  private dragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragOriginLeft = 0
  private dragOriginTop = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="dialog" part="dialog" role="dialog" aria-modal="true" aria-labelledby="oas-modal-title">
        <div class="header" part="header">
          <span class="title" id="oas-modal-title" part="title"><slot name="title"><span class="title-text"></span></slot></span>
          <button class="close-btn" part="close" aria-label="">✕</button>
        </div>
        <div class="body" part="body">
          <span class="semantic-icon" part="semantic-icon" aria-hidden="true" hidden></span>
          <div class="description" part="description" id="oas-modal-desc" hidden>
            <slot name="description"></slot>
          </div>
          <slot></slot>
        </div>
        ${
          this.hasAttr('no-footer')
            ? ''
            : `
        <div class="footer" part="footer">
          <slot name="footer"></slot>
          <span class="footer-actions" part="footer-actions">
            <button class="btn" part="cancel" type="button"></button>
            <button class="btn" part="ok" type="button">
              <span class="spinner" part="spinner" hidden></span>
              <span class="ok-label"></span>
            </button>
          </span>
        </div>`
        }
      </div>
    `
  }

  /** 缓存节点引用 + 绑定交互事件（render 与水合路径共用） */
  private bind(): void {
    this.mask = this.shadow.querySelector('.mask')
    this.dialog = this.shadow.querySelector('.dialog')
    this.header = this.shadow.querySelector('.header')
    this.titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    this.titleFallback = this.shadow.querySelector('.title-text')
    this.closeBtn = this.shadow.querySelector<HTMLButtonElement>('.close-btn')
    this.okBtn = this.shadow.querySelector<HTMLButtonElement>('[part="ok"]')
    this.cancelBtn = this.shadow.querySelector<HTMLElement>('[part="cancel"]')
    this.footerEl = this.shadow.querySelector('.footer')
    this.footerSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="footer"]')
    this.footerActions = this.shadow.querySelector('.footer-actions')
    this.semanticIcon = this.shadow.querySelector('.semantic-icon')
    this.descriptionEl = this.shadow.querySelector('#oas-modal-desc')
    this.descriptionSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="description"]')

    this.dialog?.addEventListener('click', (e) => e.stopPropagation())
    this.mask?.addEventListener('click', () => {
      if (this.hasAttr('no-mask-close')) return
      this.close('mask')
    })
    this.cancelBtn?.addEventListener('click', () => this.close('cancel'))
    this.closeBtn?.addEventListener('click', () => this.close('close-btn'))
    this.okBtn?.addEventListener('click', () => {
      if (this.hasAttr('loading')) return
      if (this.deferOkClose) {
        // 异步确认（confirm/prompt onOk）：不关闭，由宿主决定关闭时机；loading 由宿主设置
        this.emit('ok')
        return
      }
      this.close('ok')
    })

    // 可拖拽：标题栏 pointerdown 启动，move/up 监听在 document 保证指针移出仍跟随
    this.header?.addEventListener('pointerdown', (e) => this.startDrag(e as PointerEvent))

    // 命名插槽内容增减（slot 覆盖属性文案）时重刷双通道
    this.titleSlot?.addEventListener('slotchange', () => this.update())
    this.footerSlot?.addEventListener('slotchange', () => this.update())
    this.descriptionSlot?.addEventListener('slotchange', () => this.update())
    this.onCleanup(() => {
      document.removeEventListener('pointermove', this.onDrag)
      document.removeEventListener('pointerup', this.endDrag)
    })

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // Esc 开关（P4）+ 仅最上层响应（多实例嵌套逐层关闭）
        if (!this.hasAttr('visible')) return
        if (this.hasAttr('no-esc-close')) return
        if (!this.isTopmost()) return
        this.close('esc')
        return
      }
      if (e.key === 'Tab') this.trapFocus(e)
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 断开连接：解锁滚动（防 modal 未 closed 就被移除时残留锁） */
  override disconnectedCallback(): void {
    if (this.wasVisible && !this.hasAttr('no-scroll-lock')) unlockBodyScroll()
    super.disconnectedCallback()
  }

  /** 真水合：校验 SSR 快照结构（mask 与 dialog 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉（aria-labelledby 指向的标题区不受影响） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    if (!this.shadow.querySelector('.dialog')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  private startDrag(e: PointerEvent): void {
    if (!this.hasAttr('draggable')) return
    // 全屏铺满视口，拖拽语义失效（优先级：fullscreen > draggable）
    if (this.hasAttr('fullscreen')) return
    if (e.button !== 0 && e.pointerType !== 'touch') return
    // 标题栏上的关闭按钮不触发拖动
    if ((e.target as Element | null)?.closest('[part="close"]')) return
    e.preventDefault()
    const dialog = this.dialog
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    this.dragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragOriginLeft = rect.left
    this.dragOriginTop = rect.top
    this.setAttribute('dragging', '')
    document.addEventListener('pointermove', this.onDrag)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDrag = (e: PointerEvent): void => {
    if (!this.dragging) return
    const dialog = this.dialog
    if (!dialog) return
    // 内联 left/top 覆盖 CSS 居中定位；清居中相关（margin auto/right/inset）防 margin auto
    // 与内联 left 冲突（居中已从 transform 改 margin auto 方案）
    dialog.style.transform = 'none'
    dialog.style.margin = '0'
    dialog.style.right = 'auto'
    dialog.style.inset = 'auto'
    dialog.style.left = `${this.dragOriginLeft + e.clientX - this.dragStartX}px`
    dialog.style.top = `${this.dragOriginTop + e.clientY - this.dragStartY}px`
  }

  private endDrag = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.removeAttribute('dragging')
    document.removeEventListener('pointermove', this.onDrag)
    document.removeEventListener('pointerup', this.endDrag)
  }

  /** 当前是否最上层可见 modal（Esc/焦点陷阱只由最上层接管） */
  private isTopmost(): boolean {
    if (!this.hasAttr('visible')) return false
    const visibles = [...document.querySelectorAll('oas-modal[visible]')]
    return visibles[visibles.length - 1] === this
  }

  /** 元素是否可聚焦（焦点陷阱候选） */
  private isFocusable(el: HTMLElement): boolean {
    return el.matches(
      'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
  }

  /**
   * 深度优先收集对话框内可聚焦元素：shadow 内元素 + slot 分配的 light DOM 树
   * （穿透嵌套自定义元素的 inner shadow）。保证 prompt 输入框等 light DOM 控件
   * 进入 Tab 陷阱序（PB5）。
   */
  private collectFocusables(node: Node, out: HTMLElement[]): void {
    if (node instanceof HTMLSlotElement) {
      for (const n of node.assignedNodes()) this.collectFocusables(n, out)
      return
    }
    if (node instanceof HTMLElement && this.isFocusable(node)) out.push(node)
    if (node instanceof ShadowRoot) {
      for (const c of node.children) this.collectFocusables(c, out)
      return
    }
    if (node instanceof Element) {
      if (node.shadowRoot) this.collectFocusables(node.shadowRoot, out)
      for (const c of node.children) this.collectFocusables(c, out)
    }
  }

  /** 对话框内可聚焦元素（按 DOM 顺序；hidden/disabled 元素排除在陷阱外） */
  private getFocusables(): HTMLElement[] {
    const out: HTMLElement[] = []
    if (this.dialog) this.collectFocusables(this.dialog, out)
    return out
  }

  /**
   * 解析当前真实聚焦元素。
   * 真实浏览器对 open shadow DOM 返回内层元素；happy-dom 重定向为宿主（document.activeElement = host），
   * 需回退 shadowRoot.activeElement 获取真实焦点。
   */
  private resolveActive(): HTMLElement | null {
    const ae = document.activeElement
    if (!ae) return null
    if (this.dialog && this.dialog.contains(ae)) return ae as HTMLElement
    if (ae === this) return this.shadow.activeElement as HTMLElement | null
    return null
  }

  /**
   * 焦点是否落在 modal 的可达区域：shadow 内元素，或 slot 分配的 light DOM 树
   * （含嵌套自定义元素，穿透其 inner shadow）。用于判断 Tab 是否逃逸出对话框——
   * 否则焦点在嵌套表单控件（如 slot 内 oas-input 的内层 input）时会被误判为逃逸并拉回。
   */
  private isWithinModalTree(node: Node | null): boolean {
    while (node) {
      if (node === this || node === this.shadow) return true
      if (node instanceof ShadowRoot) node = node.host
      else node = node.parentNode
    }
    return false
  }

  /** 焦点陷阱：Tab/Shift+Tab 在对话框内循环，焦点逃逸则拉回；多实例仅最上层接管 */
  private trapFocus(e: KeyboardEvent): void {
    if (!this.hasAttr('visible')) return
    if (!this.isTopmost()) return
    if (this.hasAttr('no-focus-trap')) return
    const focusables = this.getFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = this.resolveActive()
    // 逃逸判定：真实焦点不在 modal 树（shadow 或 slot 内容）内
    if (active == null && !this.isWithinModalTree(document.activeElement)) {
      // 焦点逃逸出对话框（含尚未移入）：Tab 拉回首个可聚焦元素
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

  /**
   * 关闭请求（确定/取消/✕/遮罩/Esc/编程）：cancelable oas-before-close 拦截，
   * preventDefault 则不关闭；放行后移除 visible，由 update() 派发 oas-close（含来源/动作）。
   * 确定路径额外保留 oas-ok 事件（声明式确定点击的历史语义）。
   * programmatic（命令式 handle.close / destroyAllModal）绕过拦截——编程关闭必须可靠，
   * 宿主误拦截不得让 handle.close() 失效（对齐 drawer 的 api 关闭语义）。
   */
  close(source: ModalCloseSource): void {
    if (!this.hasAttr('visible')) return
    if (source !== 'programmatic' && !this.emit('before-close', { source }, { cancelable: true })) {
      return
    }
    if (source === 'ok') this.emit('ok')
    this.pendingCloseSource = source
    this.removeAttribute('visible')
  }

  protected override update(): void {
    const dialog = this.dialog
    if (!dialog) return
    const visible = this.hasAttr('visible')
    const okBtn = this.okBtn
    const cancelBtn = this.cancelBtn
    const loading = this.hasAttr('loading')

    // 显隐边沿：只在状态翻转时驱动（锁滚动 + 焦点管理 / 解锁 + 关闭事件 + 焦点还原）
    if (visible && !this.wasVisible) {
      this.wasVisible = true
      if (!this.hasAttr('no-scroll-lock')) lockBodyScroll()
      this.previousFocus = document.activeElement as HTMLElement
      let target: HTMLElement | null = null
      const initSel = this.getAttr('initial-focus')
      if (initSel) {
        target =
          dialog.querySelector<HTMLElement>(initSel) ??
          this.querySelector<HTMLElement>(initSel)
      }
      if (!target && this.hasAttr('focus-ok')) {
        target = okBtn
      } else if (!target && cancelBtn && !this.hasAttr('no-cancel')) {
        target = cancelBtn
      }
      if (!target) target = okBtn ?? this.closeBtn
      target?.focus()
    } else if (!visible && this.wasVisible) {
      this.wasVisible = false
      // 关闭：还原来源焦点、解锁滚动、派发关闭事件、可选销毁内容
      this.previousFocus?.focus()
      this.previousFocus = null
      // 关闭时结束拖拽并重置内联定位，下次打开回到默认布局
      if (this.dragging) this.endDrag()
      dialog.style.left = ''
      dialog.style.top = ''
      dialog.style.transform = ''
      const source = this.pendingCloseSource
      this.pendingCloseSource = 'programmatic'
      // 关闭事件：detail 全量携带来源与动作（P12/A32）；非确定路径保留 oas-cancel 旧语义
      this.emit('close', { source, action: CLOSE_ACTION[source] })
      if (source !== 'ok') this.emit('cancel')
      if (!this.hasAttr('no-scroll-lock')) unlockBodyScroll()
      // 关闭后销毁内容节点（P10：默认保留 DOM 仅隐藏，开启则清空重建）
      if (this.hasAttr('destroy-on-close')) this.replaceChildren()
    }

    dialog.setAttribute('aria-hidden', String(!visible))
    // role 语义（P24）：命令式确认/语义变体用 alertdialog，声明式缺省 dialog
    dialog.setAttribute('role', this.getAttr('role', 'dialog'))
    const fullscreen = this.hasAttr('fullscreen')
    // 全屏：data-fullscreen 驱动 CSS 铺满；同时清除内联 width/拖拽定位，防止覆盖全屏布局
    if (fullscreen) dialog.setAttribute('data-fullscreen', '')
    else dialog.removeAttribute('data-fullscreen')
    if (fullscreen) {
      dialog.style.width = ''
      dialog.style.left = ''
      dialog.style.top = ''
      dialog.style.transform = ''
    } else {
      // 宽度：显式设置则覆盖主题默认 520px，未设置时回退 CSS 默认
      dialog.style.width = this.getAttr('width')
    }
    // 垂直居中：data-centered 驱动 CSS 布局，增删同步
    if (this.hasAttr('centered')) dialog.setAttribute('data-centered', '')
    else dialog.removeAttribute('data-centered')
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
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本；
    // aria-labelledby 指向标题区容器（part="title"，id 保留在容器上），slot 化后可访问名不丢
    const titleSlot = this.titleSlot
    const titleFallback = this.titleFallback
    if (titleSlot && titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = this.hasSlotContent(titleSlot)
    }
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）；ok-text/cancel-text 可覆盖
    this.closeBtn?.setAttribute('aria-label', this.t('modal.close'))
    // ✕ 显隐（P4 三开关之一）
    if (this.closeBtn) this.closeBtn.hidden = this.hasAttr('no-close-btn')
    if (okBtn) {
      const okText = this.getAttr('ok-text') || this.t('modal.ok')
      okBtn.setAttribute('aria-label', okText)
      okBtn.querySelector<HTMLElement>('.ok-label')!.textContent = okText
      // loading：禁用确定 + aria-busy + spinner，禁止重复触发
      okBtn.disabled = loading
      okBtn.setAttribute('aria-busy', String(loading))
      const spinner = okBtn.querySelector<HTMLElement>('.spinner')
      if (spinner) spinner.hidden = !loading
    }
    if (cancelBtn) {
      const cancelText = this.getAttr('cancel-text') || this.t('modal.cancel')
      // no-cancel：隐藏取消按钮（hidden 属性，焦点陷阱选择器同步排除）
      cancelBtn.hidden = this.hasAttr('no-cancel')
      cancelBtn.setAttribute('aria-label', cancelText)
      cancelBtn.textContent = cancelText
    }
    // 语义变体图标（type 属性）：内置图标名映射；无 type / 非法值隐藏
    const semanticIcon = this.semanticIcon
    if (semanticIcon) {
      const iconName = SEMANTIC_ICONS[this.getAttr('type') as ModalVariant]
      if (iconName) {
        semanticIcon.hidden = false
        semanticIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${iconRegistry[iconName]}</svg>`
      } else {
        semanticIcon.hidden = true
        semanticIcon.innerHTML = ''
      }
    }
    // footer：no-footer 隐藏整个底部；footer 插槽有内容时隐藏内置按钮组（P5）
    if (this.footerEl) this.footerEl.style.display = this.hasAttr('no-footer') ? 'none' : ''
    if (this.footerActions) {
      this.footerActions.hidden = this.footerSlot ? this.hasSlotContent(this.footerSlot) : false
    }
    // aria-describedby（P14）：宿主属性透传优先，其次 description 插槽，否则移除关联
    const hostDescribedby = this.getAttribute('aria-describedby')
    if (hostDescribedby) {
      dialog.setAttribute('aria-describedby', hostDescribedby)
    } else if (this.descriptionSlot && this.hasSlotContent(this.descriptionSlot)) {
      if (this.descriptionEl) this.descriptionEl.hidden = false
      dialog.setAttribute('aria-describedby', 'oas-modal-desc')
    } else {
      if (this.descriptionEl) this.descriptionEl.hidden = true
      dialog.removeAttribute('aria-describedby')
    }

    // append-to 挂载节点（P7：update 末尾执行，节点引用已缓存，移动安全）
    this.ensurePortal()
  }

  // ===== append-to（P7：挂载节点，参照 drawer/tour portal 同构） =====

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
    host.setAttribute('data-oas-modal-portal', '')
    host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 0;'
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    if (this.mask) root.appendChild(this.mask)
    if (this.dialog) root.appendChild(this.dialog)
    this.portalHost = host
  }

  private destroyPortal(): void {
    const host = this.portalHost
    if (!host) return
    this.portalHost = null
    if (this.mask && host.shadowRoot?.contains(this.mask)) this.shadow.appendChild(this.mask)
    if (this.dialog && host.shadowRoot?.contains(this.dialog)) this.shadow.appendChild(this.dialog)
    host.remove()
  }
}
