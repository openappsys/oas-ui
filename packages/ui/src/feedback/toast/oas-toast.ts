import { OASElement } from '@oas-ui/core'

/**
 * 离场动画默认时长（JS 按此延迟 remove 与 CSS 动画保持同步）。
 * 实际值由宿主经 `--oas-toast-leave-duration` 覆盖，读取失败时回落本常量。
 */
const LEAVE_ANIMATION_MS = 200
/** 滑动关闭触发阈值（px） */
const SWIPE_THRESHOLD = 80

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  max-width: 360px;
  margin-bottom: var(--oas-space-2);
  /* 进出场动画配置开口：时长/曲线走 CSS 变量，JS 只读 leave 时长做 remove 同步 */
  --oas-toast-enter-duration: 0.2s;
  --oas-toast-leave-duration: 0.2s;
  --oas-toast-ease: ease;
}
/* 受控关闭态：open="false" 整卡隐藏（声明式用法），计时随之暂停 */
:host([open='false']) {
  display: none;
}
.box {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  will-change: transform, opacity;
  animation: oas-toast-enter var(--oas-toast-enter-duration) var(--oas-toast-ease);
}
/* 离场：JS 按 --oas-toast-leave-duration 延迟 remove（动画与移除同拍） */
.box.closing {
  animation: oas-toast-leave var(--oas-toast-leave-duration) var(--oas-toast-ease) forwards;
  pointer-events: none;
}
/* 滑动关闭：拖拽中无过渡直跟手势，释放回弹走过渡 */
.box.swipe-back {
  transition: transform var(--oas-toast-leave-duration) var(--oas-toast-ease),
    opacity var(--oas-toast-leave-duration) var(--oas-toast-ease);
}
@keyframes oas-toast-enter {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes oas-toast-leave {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(4px) scale(0.98); }
}
.icon {
  flex-shrink: 0;
  line-height: 1.4;
  font-size: var(--oas-font-size-lg);
}
.spinner {
  display: none;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 2px solid var(--oas-color-border-strong);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-toast-spin 0.8s linear infinite;
}
/* type 属性设在 host 上，颜色选择器从 host 属性命中 */
:host([type='success']) .icon { color: var(--oas-color-success); }
:host([type='error']) .icon { color: var(--oas-color-danger); }
:host([type='warning']) .icon { color: var(--oas-color-warning); }
:host([type='loading']) .spinner { display: block; }
:host([type='loading']) .icon { display: none; }
:host([type='loading']) .close { display: none; }
.content {
  flex: 1;
  min-width: 0;
}
.title-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.title {
  font-weight: 600;
  line-height: 1.5;
}
/* 同内容去重计数徽标（×N） */
.count {
  flex-shrink: 0;
  min-width: 20px;
  padding: 0 var(--oas-space-1);
  border-radius: 10px;
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary);
  font-size: var(--oas-font-size-xs);
  line-height: 18px;
  text-align: center;
}
.count[hidden] { display: none; }
.description {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  flex-shrink: 0;
}
.actions[hidden] { display: none; }
.action {
  border: none;
  background: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-primary);
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.action:hover { background: var(--oas-color-bg-hover); }
.action.success { color: var(--oas-color-success); }
.action.warning { color: var(--oas-color-warning); }
.action.danger { color: var(--oas-color-danger); }
.action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--oas-color-primary) 60%, transparent);
  outline-offset: 1px;
}
.close {
  position: relative;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: var(--oas-space-1);
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.close:hover { opacity: 1; }
.close:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--oas-color-primary) 60%, transparent);
  outline-offset: 1px;
}
/* 进度环式关闭按钮：SVG 圆环（--oas-toast-progress-ring 形态） */
.ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ring[hidden] { display: none; }
.ring-track {
  fill: none;
  stroke: var(--oas-color-bg-hover);
  stroke-width: 2;
}
.ring-fill {
  fill: none;
  stroke: var(--oas-color-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 50.27;
  animation-name: oas-toast-ring;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.close-x { font-size: var(--oas-font-size-xs); }
@keyframes oas-toast-ring {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -50.27; }
}
/* 自动关闭剩余时间进度条（轻量版，与通知 show-progress 同构） */
.progress {
  position: absolute;
  left: var(--oas-space-2);
  right: var(--oas-space-2);
  bottom: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--oas-color-bg-hover);
  overflow: hidden;
}
.progress[hidden] { display: none; }
.progress.progress-top { top: 0; bottom: auto; }
.progress-fill {
  width: 100%;
  height: 100%;
  background: var(--oas-color-primary);
  animation-name: oas-toast-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes oas-toast-progress {
  from { width: 100%; }
  to { width: 0; }
}
/* plain：无边框无底纹（文本直出） */
:host([variant='plain']) .box {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
/* translucent：半透明材质（毛玻璃） */
:host([variant='translucent']) .box {
  background: color-mix(in srgb, var(--oas-color-bg) 78%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-border) 60%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
@keyframes oas-toast-spin {
  to { transform: rotate(360deg); }
}
`

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading'

const ICONS: Record<ToastType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
  loading: '',
}

export type ToastActionVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger'

export interface ToastAction {
  label: string
  onClick: () => void
  /** 点击后不自动关闭（默认点击即关） */
  noDismiss?: boolean
  /** 按钮颜色变体（默认 primary 色） */
  variant?: ToastActionVariant
}

export type ToastCloseTrigger =
  | 'auto'
  | 'manual'
  | 'action'
  | 'close-button'
  | 'esc'
  | 'swipe'
  | 'preempt'
  | 'external'

export interface ToastRefreshOptions {
  type?: ToastType
  /** 标题：string 走属性吸收通道；Node 由组件 append 进标题区 */
  title?: string | Node
  description?: string
  duration?: number
  actions?: ToastAction[]
  closable?: boolean
}

export class OASToast extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'duration',
      'description',
      'closable',
      'open',
      'id',
      'politeness',
      'variant',
      'show-progress',
      'progress-position',
      'progress-ring',
      'count',
      'swipe-direction',
      'pause-on-hover',
      'pause-on-focus',
      'pause-on-window-blur',
    ]
  }

  /** action 单按钮兼容入口：读写 actions 首个元素 */
  get action(): ToastAction | null {
    return this.actions[0] ?? null
  }

  set action(a: ToastAction | null) {
    this.actions = a ? [a] : []
  }

  /** action 由命令式层在 append 前注入（函数无法走属性） */
  actions: ToastAction[] = []

  /** 命令式 Node 标题通道：options.title 传 Node 时由 toast.show()/transition() 注入，
   *  渲染时 append 进标题区（忽略 titleCache 文本路径）；string 走属性吸收通道，置 null */
  titleNode: Node | null = null

  private timer: ReturnType<typeof setTimeout> | null = null
  private leaveTimer: ReturnType<typeof setTimeout> | null = null
  /** 剩余时长记账：暂停时记录，恢复时按此续跑 */
  private remaining = 0
  private startedAt = 0
  private pauseSources = new Set<string>()
  private closing = false
  private closeTrigger: ToastCloseTrigger | null = null
  /** 滑动关闭已用手势离场（行内 transform/opacity 过渡，不再叠加 .closing 动画） */
  private swipedOut = false

  private prevType = ''
  private prevDuration = -1
  private prevOpen: boolean | null = null
  private actionsSignature = ''

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  private box: HTMLElement | null = null
  private actionsEl: HTMLElement | null = null
  private swipe: { id: number; startX: number; startY: number; x: number; y: number } | null = null

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案/Node 通道的判空依据 */
  private hasTitleSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="status" aria-live="polite" aria-atomic="true">
        <span class="spinner" part="spinner" aria-hidden="true"></span>
        <span class="icon" part="icon" aria-hidden="true"></span>
        <div class="content" part="content">
          <div class="title-row">
            <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
            <span class="count" part="count" aria-hidden="true" hidden></span>
          </div>
          <div class="description" part="description"></div>
        </div>
        <div class="actions" part="actions" hidden></div>
        <button class="close" part="close" type="button" aria-label="">
          <svg class="ring" viewBox="0 0 20 20" aria-hidden="true" hidden>
            <circle class="ring-track" cx="10" cy="10" r="8"></circle>
            <circle class="ring-fill" cx="10" cy="10" r="8"></circle>
          </svg>
          <span class="close-x" aria-hidden="true">✕</span>
        </button>
      </div>
      <div class="progress" part="progress" aria-hidden="true" hidden>
        <div class="progress-fill"></div>
      </div>
    `
    this.box = this.shadow.querySelector<HTMLElement>('[part="box"]')
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')

    this.shadow
      .querySelector<HTMLButtonElement>('[part="close"]')
      ?.addEventListener('click', () => this.close('close-button'))
    // action 事件委托：按钮由 syncActions 按需增删，点击按 data-index 定位，免重绑
    this.actionsEl?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.action[data-index]')
      if (!btn) return
      const action = this.actions[Number(btn.dataset.index)]
      if (!action) return
      action.onClick()
      if (!action.noDismiss) this.close('action')
    })
    // title 插槽内容增减（slot 覆盖属性文案/Node 通道的兜底判空）时重刷
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="title"]')
      ?.addEventListener('slotchange', () => this.syncUi())

    // 键盘可达：焦点在本 toast 内时 Esc 关闭当前
    this.addEventListener('keydown', this.onKeydown)
    this.onCleanup(() => this.removeEventListener('keydown', this.onKeydown))

    // 计时暂停：hover / 聚焦 / 窗口失焦（默认开，pause-on-* 显式 "false" 关闭）
    this.addEventListener('pointerenter', () => this.pauseOn('hover'))
    this.addEventListener('pointerleave', () => this.resumeFrom('hover'))
    this.addEventListener('focusin', () => this.pauseOn('focus'))
    this.addEventListener('focusout', () => this.resumeFrom('focus'))
    const onWindowBlur = (): void => this.pauseOn('blur')
    const onWindowFocus = (): void => this.resumeFrom('blur')
    const onVisibility = (): void => {
      if (document.hidden) this.pauseOn('blur')
      else this.resumeFrom('blur')
    }
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibility)
    this.onCleanup(() => {
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    })

    // 滑动关闭：拖拽跟手 + 超过阈值触发离场
    this.box?.addEventListener('pointerdown', (e) => this.swipeStart(e as PointerEvent))
    window.addEventListener('pointermove', this.onSwipeMove)
    window.addEventListener('pointerup', this.onSwipeEnd)
    window.addEventListener('pointercancel', this.onSwipeEnd)
    this.onCleanup(() => {
      window.removeEventListener('pointermove', this.onSwipeMove)
      window.removeEventListener('pointerup', this.onSwipeEnd)
      window.removeEventListener('pointercancel', this.onSwipeEnd)
    })

    this.onCleanup(() => this.clearTimer())

    this.syncUi()
    this.prevType = this.getAttr('type', 'info')
    this.prevDuration = this.durationMs()
    this.prevOpen = this.isOpen()
    this.emit('open', { trigger: 'show' })
    this.startTimerFull()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    // 全链生命周期：正常 close() 只补 destroy；外部 remove（destroyAll/宿主移除）补 close+destroy
    const trigger = this.closeTrigger ?? ('external' as ToastCloseTrigger)
    if (!this.closing) this.emit('close', { trigger })
    this.emit('destroy', { trigger })
  }

  /** 关闭当前 toast：派发 oas-close → 播放离场动画 → 移除 → oas-destroy */
  close(trigger: ToastCloseTrigger = 'manual'): void {
    if (this.closing) return
    this.closing = true
    this.closeTrigger = trigger
    this.clearTimer()
    this.emit('close', { trigger })
    const duration = this.leaveDurationMs()
    if (this.animateLeave() && duration > 0) {
      if (!this.swipedOut) this.box?.classList.add('closing')
      this.leaveTimer = setTimeout(() => this.remove(), duration)
      this.onCleanup(() => {
        if (this.leaveTimer) clearTimeout(this.leaveTimer)
      })
    } else {
      this.remove()
    }
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.close('esc')
    }
  }

  /** promise 链流转：切换类型并重置自动关闭计时器。title 支持 string（属性通道）或
   *  Node（append 进标题区，忽略 titleCache 文本路径；同时以 title="" 清掉属性通道） */
  transition(type: ToastType, title: string | Node, duration = 3000): void {
    this.setAttribute('type', type)
    this.setAttribute('duration', String(duration))
    if (typeof title === 'string') {
      this.titleNode = null
      this.setAttribute('title', title)
    } else {
      this.titleNode = title
      this.setAttribute('title', '')
    }
    this.syncUi()
    this.startTimerFull()
  }

  /** 命令式 update() 数据通道：整卡增量刷新（内容/类型/时长/描述/按钮），并重置自动关闭计时 */
  refresh(options: ToastRefreshOptions): void {
    if (options.type) this.setAttribute('type', options.type)
    if (options.title !== undefined) {
      if (typeof options.title === 'string') {
        this.titleNode = null
        this.setAttribute('title', options.title)
      } else {
        this.titleNode = options.title
        this.setAttribute('title', '')
      }
    }
    if (options.description !== undefined) this.setAttribute('description', options.description)
    if (options.duration !== undefined) this.setAttribute('duration', String(options.duration))
    if (options.actions !== undefined) this.actions = options.actions
    if (options.closable !== undefined) {
      if (options.closable && this.getAttr('type') !== 'loading') this.setAttribute('closable', '')
      else this.removeAttribute('closable')
    }
    this.syncUi()
    this.startTimerFull()
  }

  protected override update(): void {
    const type = this.getAttr('type', 'info')
    const duration = this.durationMs()
    const open = this.isOpen()

    this.syncUi()
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="close"]')
      ?.setAttribute('aria-label', this.t('toast.close'))
    // 暂停开关变化时同步清掉已失效的暂停源
    this.syncPauseSources()
    this.syncProgressState()

    // 计时状态机：open 翻转 → 全量重开/停止；type/duration 变化 → 全量重开（新阅读时长）；
    // 其余增量属性 → 保续（剩余时长记账不丢）
    if (open !== this.prevOpen) {
      if (open) this.startTimerFull()
      else {
        this.clearTimer()
        this.remaining = 0
      }
    } else if (type !== this.prevType || duration !== this.prevDuration) {
      this.startTimerFull()
    } else if (this.timer === null && !this.closing && !this.isPaused()) {
      this.scheduleFromRemaining()
    }

    this.prevType = type
    this.prevDuration = duration
    this.prevOpen = open
  }

  private syncUi(): void {
    const type = (this.getAttr('type', 'info') || 'info') as ToastType
    const box = this.shadow.querySelector<HTMLElement>('[part="box"]')
    if (box) {
      // 读屏敏感度：显式 politeness 优先，缺省按类型（error=assertive，其余 polite）
      const pol = this.getAttr('politeness', '')
      const assertive = pol === 'assertive' || (pol === '' && type === 'error')
      box.setAttribute('role', assertive ? 'alert' : 'status')
      box.setAttribute('aria-live', assertive ? 'assertive' : 'polite')
      box.setAttribute('aria-atomic', 'true')
    }
    this.shadow.querySelector<HTMLElement>('[part="icon"]')!.textContent = ICONS[type] ?? ''
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。命令式 transition() 以 setAttribute('title') 作数据通道，
    // 设置后 syncUi 随即吸收，宿主无残留；吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // title 双通道：slot 有真实内容时以插槽为准；无则兜底 span 承载
    // titleCache 文本（string 通道）或命令式 Node（titleNode 通道，忽略 titleCache 文本路径）
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    if (titleSlot && titleFallback) {
      const hasSlot = this.hasTitleSlotContent(titleSlot)
      if (this.titleNode) {
        titleFallback.textContent = ''
        titleFallback.appendChild(this.titleNode)
      } else {
        titleFallback.textContent = this.titleCache ?? ''
      }
      titleFallback.hidden = hasSlot
    }
    const desc = this.getAttr('description', '')
    const descEl = this.shadow.querySelector<HTMLElement>('[part="description"]')
    if (descEl) {
      descEl.textContent = desc
      descEl.style.display = desc ? '' : 'none'
    }
    // closable：loading 恒不可关
    const closable = this.hasAttr('closable') && type !== 'loading'
    const closeBtn = this.shadow.querySelector<HTMLElement>('[part="close"]')
    if (closeBtn) closeBtn.hidden = !closable
    // 同内容去重计数徽标
    const count = Number(this.getAttr('count', '0'))
    const countEl = this.shadow.querySelector<HTMLElement>('[part="count"]')
    if (countEl) {
      countEl.textContent = count > 1 ? `×${count}` : ''
      countEl.hidden = count <= 1
    }
    this.syncActions()
  }

  /** 操作按钮按需增删（内容签名变化才重建，update() 增量不重建） */
  private syncActions(): void {
    const actionsEl = this.actionsEl
    if (!actionsEl) return
    const sig = this.actions
      .map((a) => `${a.label}|${a.variant ?? 'default'}|${a.noDismiss ? 1 : 0}`)
      .join(',')
    if (sig === this.actionsSignature) return
    this.actionsSignature = sig
    actionsEl.textContent = ''
    if (this.actions.length === 0) {
      actionsEl.hidden = true
      return
    }
    actionsEl.hidden = false
    this.actions.forEach((a, i) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.setAttribute('part', 'action')
      btn.className = `action${a.variant && a.variant !== 'default' ? ` ${a.variant}` : ''}`
      btn.dataset.index = String(i)
      btn.textContent = a.label
      actionsEl.appendChild(btn)
    })
  }

  // ---------- 计时状态机（剩余时长记账 + hover/focus/blur 暂停） ----------

  private durationMs(): number {
    const d = Number(this.getAttr('duration', '3000'))
    return d > 0 ? d : 0
  }

  private isOpen(): boolean {
    return this.getAttr('open', 'true') !== 'false'
  }

  private isPaused(): boolean {
    return this.pauseSources.size > 0
  }

  private pauseEnabled(source: 'hover' | 'focus' | 'blur'): boolean {
    const attr =
      source === 'hover'
        ? 'pause-on-hover'
        : source === 'focus'
          ? 'pause-on-focus'
          : 'pause-on-window-blur'
    return this.getAttr(attr, 'true') !== 'false'
  }

  private pauseOn(source: 'hover' | 'focus' | 'blur'): void {
    if (!this.pauseEnabled(source)) return
    this.pause(source)
  }

  private resumeFrom(source: 'hover' | 'focus' | 'blur'): void {
    if (this.pauseSources.has(source)) this.resume(source)
  }

  /** 暂停：记账剩余时长并停表 */
  private pause(source: string): void {
    if (this.pauseSources.has(source)) return
    this.pauseSources.add(source)
    if (!this.timer) return
    const d = this.durationMs()
    if (d > 0 && this.startedAt > 0) {
      this.remaining = Math.max(0, d - (Date.now() - this.startedAt))
    }
    this.clearTimer()
    this.syncProgressPlayState()
  }

  /** 恢复：全部暂停源清除后按剩余时长续跑 */
  private resume(source: string): void {
    if (!this.pauseSources.delete(source)) return
    if (this.isPaused()) return
    this.syncProgressPlayState()
    this.scheduleFromRemaining()
  }

  /** 全量重开：剩余时长重置为完整 duration */
  private startTimerFull(): void {
    this.clearTimer()
    const d = this.durationMs()
    if (!this.isOpen() || this.getAttr('type') === 'loading' || d <= 0) {
      this.remaining = 0
      this.syncProgressState()
      return
    }
    this.remaining = d
    this.scheduleFromRemaining()
  }

  /** 按当前剩余时长起表（暂停中/loading/关闭中/无剩余时不起） */
  private scheduleFromRemaining(): void {
    if (this.timer || this.closing) return
    if (!this.isOpen() || this.isPaused()) return
    if (this.getAttr('type') === 'loading') return
    if (this.remaining <= 0) return
    this.startedAt = Date.now()
    this.timer = setTimeout(() => this.close('auto'), this.remaining)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.startedAt = 0
  }

  /** 暂停开关（pause-on-* 属性）变化时清掉已失效的暂停源 */
  private syncPauseSources(): void {
    for (const source of [...this.pauseSources]) {
      if (!this.pauseEnabled(source as 'hover' | 'focus' | 'blur')) this.resume(source)
    }
  }

  // ---------- 剩余时间进度（进度条 P8 / 进度环 P25） ----------

  private syncProgressState(): void {
    const duration = this.durationMs()
    const show = this.hasAttr('show-progress') && duration > 0
    const ring = this.hasAttr('progress-ring') && duration > 0
    const progress = this.shadow.querySelector<HTMLElement>('[part="progress"]')
    if (progress) {
      progress.hidden = !show
      progress.classList.toggle('progress-top', this.getAttr('progress-position', 'bottom') === 'top')
      const fill = progress.querySelector<HTMLElement>('.progress-fill')
      if (fill && fill.style.animationDuration !== `${duration}ms`) {
        fill.style.animationDuration = `${duration}ms`
      }
    }
    const ringEl = this.shadow.querySelector<HTMLElement>('.ring')
    if (ringEl) {
      ringEl.hidden = !ring
      const ringFill = ringEl.querySelector<HTMLElement>('.ring-fill')
      if (ringFill && ringFill.style.animationDuration !== `${duration}ms`) {
        ringFill.style.animationDuration = `${duration}ms`
      }
    }
    this.syncProgressPlayState()
  }

  /** 暂停时进度动画同步定格（animation-play-state），恢复继续 */
  private syncProgressPlayState(): void {
    const paused = this.isPaused()
    const fill = this.shadow.querySelector<HTMLElement>('.progress-fill')
    if (fill) fill.style.animationPlayState = paused ? 'paused' : 'running'
    const ringFill = this.shadow.querySelector<HTMLElement>('.ring-fill')
    if (ringFill) ringFill.style.animationPlayState = paused ? 'paused' : 'running'
  }

  // ---------- 滑动关闭（P10） ----------

  private swipeDirection(): string {
    return this.getAttr('swipe-direction', 'both')
  }

  private swipeStart(e: PointerEvent): void {
    if (this.closing || e.button !== 0) return
    this.swipe = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: 0, y: 0 }
  }

  private onSwipeMove = (e: PointerEvent): void => {
    if (!this.swipe || e.pointerId !== this.swipe.id) return
    const dx = e.clientX - this.swipe.startX
    const dy = e.clientY - this.swipe.startY
    this.swipe.x = dx
    this.swipe.y = dy
    const dir = this.swipeDirection()
    let tx = 0
    let ty = 0
    if (dir === 'right' || dir === 'left' || dir === 'both') tx = dx
    if (dir === 'up' || dir === 'down' || dir === 'both') ty = dy
    // 正交轴阻尼 0.2，只跟随配置方向
    if (dir === 'right' && tx < 0) tx *= 0.2
    if (dir === 'left' && tx > 0) tx *= 0.2
    if (dir === 'down' && ty < 0) ty *= 0.2
    if (dir === 'up' && ty > 0) ty *= 0.2
    if (this.box) this.box.style.transform = `translate(${tx}px, ${ty}px)`
  }

  private onSwipeEnd = (e: PointerEvent): void => {
    if (!this.swipe || e.pointerId !== this.swipe.id) return
    const { x, y } = this.swipe
    this.swipe = null
    const dir = this.swipeDirection()
    const dirHit =
      (dir === 'right' && x >= SWIPE_THRESHOLD) ||
      (dir === 'left' && x <= -SWIPE_THRESHOLD) ||
      (dir === 'down' && y >= SWIPE_THRESHOLD) ||
      (dir === 'up' && y <= -SWIPE_THRESHOLD) ||
      (dir === 'both' &&
        (Math.abs(x) >= SWIPE_THRESHOLD || Math.abs(y) >= SWIPE_THRESHOLD))
    const box = this.box
    if (!box) return
    if (dirHit) {
      // 手势离场：行内 transform/opacity 过渡（不再叠加 .closing，避免动画覆盖手势位移）
      this.swipedOut = true
      box.style.transition = `transform var(--oas-toast-leave-duration) var(--oas-toast-ease), opacity var(--oas-toast-leave-duration) var(--oas-toast-ease)`
      box.style.transform = `translate(${x * 1.5}px, ${y * 1.5}px)`
      box.style.opacity = '0'
      this.close('swipe')
    } else {
      // 未达阈值：回弹
      box.classList.add('swipe-back')
      box.style.transform = ''
      box.style.opacity = ''
      const t = window.setTimeout(() => {
        box.classList.remove('swipe-back')
        box.style.transition = ''
      }, this.leaveDurationMs() + 50)
      this.onCleanup(() => clearTimeout(t))
    }
  }

  // ---------- 离场动画（P18，时长走 CSS 变量） ----------

  private leaveDurationMs(): number {
    const raw = getComputedStyle(this).getPropertyValue('--oas-toast-leave-duration')
    const n = parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : LEAVE_ANIMATION_MS
  }

  private animateLeave(): boolean {
    if (typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
      } catch {
        /* 忽略 matchMedia 异常 */
      }
    }
    return true
  }
}
