import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/**
 * oas-swipe-cell —— 列表项横向滑动操作（data 族）。
 *
 * 结构：默认插槽 = 内容层（列表项主体，铺在最上层）；`slot="actions"` = 操作按钮组
 * （宿主放 button 等，组件排成一行置于内容层下方、inline-end 侧）。向 inline-start
 * 方向横滑内容层，露出 actions；松手按位移阈值吸附开/关。
 *
 * 方向：逻辑方向化——LTR 左滑露出右侧 actions，RTL 右滑露出左侧 actions（物理 CSS 用
 * 逻辑属性 `inset-inline-end`，位移量按 `shared/direction` 的 RTL 判定取符号）。方向判定
 * 门槛 8px：pointermove 仅当 |dx|>|dy| 且 |dx|>8 才接管（setPointerCapture +
 * preventDefault），否则放行纵向滚动——列表内多 cell 共存的关键。CSS `touch-action: pan-y`
 * 保证纵向原生滚动不受干扰、横向手势交由 pointer 处理。
 *
 * 单开互斥：任一 cell 落定开态时在 document 上广播 `oas-swipe-cell-open`，同 document 内
 * 其余开态 cell 自动关闭；开态时 document capture 监听 pointerdown（外点关闭）与 scroll
 * （滚动关闭）。监听随开/关增删并经 onCleanup 生命周期清理，无孤儿监听。
 *
 * a11y：actions 区 `role="group"` + i18n `swipeCell.actionsLabel`；actions 内按钮 DOM 天然
 * tabbable（焦点进入自动开态，按钮可见可读屏）；Esc 关闭；cell 本身不加重角色（内容语义由
 * 宿主提供）。`prefers-reduced-motion` 下关过渡。
 *
 * 事件：`oas-open` / `oas-close` 在开/关落定各派发一次（程序性 open 属性变化同样派发）。
 */

/** 默认吸附阈值（px） */
const DEFAULT_THRESHOLD = 40
/** 方向判定门槛（px）：位移须超过才决定横/纵轴 */
const DIRECTION_THRESHOLD = 8
/** 跨实例单开互斥的 document 级广播事件名（内部协议，非公开 API） */
const BROADCAST_EVENT = 'oas-swipe-cell-open'

const STYLE = `
:host {
  display: block;
  position: relative;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 内容层底色（覆盖 actions 的遮挡层，需不透明）与 actions 区底色，均可被宿主变量覆盖 */
  --oas-swipe-cell-bg: var(--oas-color-bg);
  --oas-swipe-cell-actions-bg: var(--oas-color-bg-hover);
  /* 内容层物理偏移量（JS 按书写方向写入 ±px） */
  --oas-swipe-cell-offset: 0px;
}
:host([hidden]) {
  display: none;
}
.root {
  position: relative;
  overflow: hidden;
}
/* actions 置于 inline-end 侧、内容层之下（z-index 0） */
.actions {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  z-index: 0;
  display: flex;
  align-items: stretch;
  background: var(--oas-swipe-cell-actions-bg);
}
/* actions 内按钮填满行高（移动滑动操作的通行观感）：::slotted 可设自定义属性穿透
   shadow 边界（::slotted 后不支持链 ::part，oas-button 的高度开口走变量） */
.actions ::slotted(oas-button) {
  --oas-button-height: 100%;
}
.actions ::slotted(button) {
  height: 100%;
}
/* 内容层盖在 actions 之上，横向平移露出下层 */
.content {
  position: relative;
  z-index: 1;
  background: var(--oas-swipe-cell-bg);
  transform: translateX(var(--oas-swipe-cell-offset));
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  /* 纵向滚动交还浏览器，横向手势由 pointer 接管（不触发原生滚动） */
  touch-action: pan-y;
  will-change: transform;
}
/* 拖动中关过渡，保证内容层严格跟手；禁用文本选中避免桌面拖拽时选中文字 */
:host([data-dragging]) .content {
  transition: none;
  user-select: none;
}
:host([disabled]) .content,
:host([data-disabled]) .content {
  cursor: default;
}
@media (prefers-reduced-motion: reduce) {
  .content {
    transition: none;
  }
}
`

/** 单次手势状态：方向未定时 axis='pending' */
interface DragState {
  pointerId: number
  startX: number
  startY: number
  /** 按下时的逻辑偏移（0 = 关，actionsWidth = 开） */
  startLogical: number
  axis: 'pending' | 'x' | 'y'
  /** 最近两个 move 点（速度吸附用） */
  lastX: number
  lastT: number
  prevX: number
  prevT: number
}

export class OASSwipeCell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['disabled', 'open', 'threshold']
  }

  private contentEl: HTMLElement | null = null
  private actionsEl: HTMLElement | null = null
  /** 生效开态（与 open 属性同步） */
  private openState = false
  /** 首次同步标记：连接初始 open 不派发事件 */
  private syncedOnce = false
  /** actions 实测宽度（打开前测量；0 = 无操作区，不可开） */
  private actionsWidth = 0
  private drag: DragState | null = null
  /** 拖动中的逻辑偏移（0…actionsWidth） */
  private dragLogical = 0
  private docPointerBound = false
  private docScrollBound = false

  /** 公开 property：读写即反射 open 属性（受控/程序开合；Vue/React 桥接安全） */
  get open(): boolean {
    return this.hasAttribute('open')
  }
  set open(value: boolean) {
    this.toggleAttribute('open', !!value)
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="actions" part="actions" role="group">
          <slot name="actions"></slot>
        </div>
        <div class="content" part="content">
          <slot></slot>
        </div>
      </div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（内容层存在）后接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="content"]')) return false
    this.bind()
    return true
  }

  /** 断开重连：重绑宿主级监听（幂等；render 与内部状态不重建，开态保留） */
  protected override onReconnect(): void {
    this.bind()
  }

  /** 缓存节点引用 + 绑定宿主级事件（render / hydrate / 重连共用；幂等） */
  private bind(): void {
    this.contentEl = this.shadow.querySelector<HTMLElement>('[part="content"]')
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    this.contentEl?.addEventListener('pointerdown', this.onPointerDown)
    this.contentEl?.addEventListener('pointermove', this.onPointerMove)
    this.contentEl?.addEventListener('pointerup', this.onPointerUp)
    this.contentEl?.addEventListener('pointercancel', this.onPointerUp)
    this.addEventListener('keydown', this.onKeyDown)
    this.addEventListener('focusin', this.onFocusIn)
    document.addEventListener(BROADCAST_EVENT, this.onBroadcast)
    this.onCleanup(() => {
      this.contentEl?.removeEventListener('pointerdown', this.onPointerDown)
      this.contentEl?.removeEventListener('pointermove', this.onPointerMove)
      this.contentEl?.removeEventListener('pointerup', this.onPointerUp)
      this.contentEl?.removeEventListener('pointercancel', this.onPointerUp)
      this.removeEventListener('keydown', this.onKeyDown)
      this.removeEventListener('focusin', this.onFocusIn)
      document.removeEventListener(BROADCAST_EVENT, this.onBroadcast)
      this.removeOpenListeners()
    })
  }

  protected override update(): void {
    this.contentEl = this.contentEl ?? this.shadow.querySelector<HTMLElement>('[part="content"]')
    this.actionsEl = this.actionsEl ?? this.shadow.querySelector<HTMLElement>('[part="actions"]')
    const disabled = this.injectDisabled()
    // 宿主状态镜像（data-* 非 observed，写入不触发 attributeChangedCallback 循环）
    this.toggleAttribute('data-disabled', disabled)
    this.toggleAttribute('data-rtl', isRtl(this))

    if (this.actionsEl) {
      this.actionsEl.setAttribute('role', 'group')
      this.actionsEl.setAttribute('aria-label', this.t('swipeCell.actionsLabel'))
    }

    // disabled 强制收敛：清除 open 属性并关态（若属性在关闭态下被设置也清掉，避免属性/状态分叉）
    if (disabled && this.hasAttr('open')) this.removeAttribute('open')

    // 打开前测量 actions 宽度（happy-dom 无布局时为 0 → 不可开，回弹关）
    this.measureActions()

    const want = this.hasAttr('open')
    // 首次同步（连接时声明式初始 open）：只落态不派发——与全库「初始不派发」惯例一致
    //（框架在 upgrade 前挂监听不应收到空闲事件，review M1）；其后的属性变化照派
    const emit = this.syncedOnce
    if (want && !this.openState) this.applyOpen(true, emit)
    else if (!want && this.openState) this.applyOpen(false, emit)
    else this.syncTranslation()
    this.syncedOnce = true

    this.syncOpenListeners()
  }

  /** 测量 actions 区宽度（打开前调用；无效宽度归 0） */
  private measureActions(): void {
    const el = this.actionsEl
    if (!el) {
      this.actionsWidth = 0
      return
    }
    const width = el.getBoundingClientRect().width
    this.actionsWidth = Number.isFinite(width) && width > 0 ? width : 0
  }

  /** 逻辑偏移 [0, actionsWidth] → 物理偏移并写入 CSS 变量（RTL 取正、LTR 取负） */
  private applyOffsetLogical(logical: number): void {
    const clamped = this.clampLogical(logical)
    const physical = Math.round(this.dirSign() * clamped)
    this.style.setProperty('--oas-swipe-cell-offset', `${physical}px`)
  }

  private clampLogical(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.min(Math.max(value, 0), this.actionsWidth)
  }

  /** 逻辑进度 → 物理位移方向的符号（RTL +1、LTR -1） */
  private dirSign(): number {
    return isRtl(this) ? 1 : -1
  }

  /** 当前开态对应的逻辑偏移 */
  private logicalFromOpen(): number {
    return this.openState ? this.actionsWidth : 0
  }

  /** 同步内容层偏移到当前状态（拖动中跟手，否则按开/关吸附） */
  private syncTranslation(): void {
    const logical = this.drag ? this.dragLogical : this.logicalFromOpen()
    this.applyOffsetLogical(logical)
  }

  private thresholdValue(): number {
    const raw = this.getAttr('threshold', String(DEFAULT_THRESHOLD))
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD
  }

  // ---------- 手势 ----------

  private onPointerDown = (e: Event): void => {
    const ev = e as PointerEvent
    if (this.injectDisabled()) return
    if (ev.button !== 0 && ev.button !== undefined) return
    if (this.drag) return
    this.measureActions()
    const startLogical = this.logicalFromOpen()
    this.dragLogical = startLogical
    this.drag = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      startLogical,
      axis: 'pending',
      lastX: ev.clientX,
      lastT: ev.timeStamp,
      prevX: ev.clientX,
      prevT: ev.timeStamp,
    }
  }

  private onPointerMove = (e: Event): void => {
    const ev = e as PointerEvent
    const drag = this.drag
    if (!drag || ev.pointerId !== drag.pointerId) return
    if (drag.axis === 'y') return

    const dx = ev.clientX - drag.startX
    const dy = ev.clientY - drag.startY

    if (drag.axis === 'pending') {
      if (Math.abs(dx) <= DIRECTION_THRESHOLD && Math.abs(dy) <= DIRECTION_THRESHOLD) return
      if (Math.abs(dx) > Math.abs(dy)) {
        drag.axis = 'x'
        this.toggleAttribute('data-dragging', true)
        this.capture(drag.pointerId)
      } else {
        // 纵向意图：放行原生滚动，本手势不再接管
        drag.axis = 'y'
        return
      }
    }

    // 横向跟手（钳制到 [0, actionsWidth]）
    if (ev.cancelable) ev.preventDefault()
    this.dragLogical = this.clampLogical(drag.startLogical + dx * this.dirSign())
    this.applyOffsetLogical(this.dragLogical)
    // 速度轨迹（flick 吸附用）
    drag.prevX = drag.lastX
    drag.prevT = drag.lastT
    drag.lastX = ev.clientX
    drag.lastT = ev.timeStamp
  }

  private onPointerUp = (e: Event): void => {
    const ev = e as PointerEvent
    const drag = this.drag
    if (!drag || ev.pointerId !== drag.pointerId) return
    this.drag = null
    if (drag.axis !== 'x') return
    this.toggleAttribute('data-dragging', false)
    this.release(drag.pointerId)
    // 释放吸附：快速甩动（|v| ≥ 0.5px/ms）按方向直接开/关（PRD「速度吸附」）；
    // 慢速按位移阈值——位移达到阈值且确有可露出内容 → 开；否则回弹关
    // 速度窗口下限 8ms（一帧）：合成事件同刻连发 dt≈0 一律走位移阈值，
    // 真实手势 move 间隔 8-16ms 才进入 flick 判定
    const dt = drag.lastT - drag.prevT
    const v = dt >= 8 ? ((drag.lastX - drag.prevX) / dt) * this.dirSign() : 0
    const FLICK = 0.5
    let shouldOpen: boolean
    if (v >= FLICK) shouldOpen = this.actionsWidth > 0
    else if (v <= -FLICK) shouldOpen = false
    else shouldOpen = this.actionsWidth > 0 && this.dragLogical >= this.thresholdValue()
    this.applyOpen(shouldOpen, true)
  }

  private capture(pointerId: number): void {
    try {
      this.contentEl?.setPointerCapture(pointerId)
    } catch {
      /* 捕获失败（元素未连接/指针已释放）不阻断本次手势 */
    }
  }

  private release(pointerId: number): void {
    try {
      this.contentEl?.releasePointerCapture(pointerId)
    } catch {
      /* 已释放 */
    }
  }

  // ---------- 开/关落定 ----------

  /**
   * 落定开/关：同步属性、偏移与监听，按需派发事件。
   * 手势与程序性属性变化都汇聚到此，保证事件恰好派发一次。
   */
  private applyOpen(next: boolean, emit: boolean): void {
    if (next === this.openState) {
      this.syncTranslation()
      this.syncOpenListeners()
      return
    }
    this.openState = next
    if (next) this.setAttribute('open', '')
    else this.removeAttribute('open')
    this.syncTranslation()
    this.syncOpenListeners()
    if (emit) {
      // 字面量事件名：能力清单/API 扫描（含 demo-coverage 通用探针）按字符串字面量提取
      if (next) this.emit('open')
      else this.emit('close')
    }
    // 单开互斥：广播本次开态，同 document 内其余开态 cell 自动关闭
    if (next) document.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: this }))
  }

  private onBroadcast = (e: Event): void => {
    if ((e as CustomEvent).detail === this) return
    if (this.openState) this.applyOpen(false, true)
  }

  private onDocPointerDown = (e: Event): void => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : []
    // 落在自身（含 light DOM actions 按钮）内部不关闭；外部/其他 cell 关闭
    if (path.includes(this)) return
    this.applyOpen(false, true)
  }

  private onDocScroll = (): void => {
    if (!this.openState) return
    // 焦点落在本 cell 的 actions 按钮上时，滚动常由「聚焦把按钮带入视口」引发——
    // 此时关闭会让键盘用户聚焦的按钮重新被内容层遮住（实测焦点 + 浏览器滚动 → 开后又立刻关），故跳过。
    if (this.focusInActions()) return
    this.applyOpen(false, true)
  }

  /** 当前焦点是否落在本 cell 的 actions 区（light DOM 具名插槽按钮） */
  private focusInActions(): boolean {
    const active = document.activeElement as HTMLElement | null
    if (!active || active === this) return false
    if (typeof active.getAttribute !== 'function' || typeof active.closest !== 'function') return false
    if (active.getAttribute('slot') !== 'actions') return false
    return active.closest('oas-swipe-cell') === this
  }

  /** 开态时挂 document capture 监听（外点/滚动关闭），关态移除 */
  private syncOpenListeners(): void {
    if (this.openState) {
      if (!this.docPointerBound) {
        document.addEventListener('pointerdown', this.onDocPointerDown, true)
        this.docPointerBound = true
      }
      if (!this.docScrollBound) {
        document.addEventListener('scroll', this.onDocScroll, true)
        this.docScrollBound = true
      }
    } else {
      this.removeOpenListeners()
    }
  }

  private removeOpenListeners(): void {
    if (this.docPointerBound) {
      document.removeEventListener('pointerdown', this.onDocPointerDown, true)
      this.docPointerBound = false
    }
    if (this.docScrollBound) {
      document.removeEventListener('scroll', this.onDocScroll, true)
      this.docScrollBound = false
    }
  }

  // ---------- 键盘 / 焦点 ----------

  private onKeyDown = (e: Event): void => {
    const ev = e as KeyboardEvent
    if (ev.key !== 'Escape' || !this.openState) return
    if (ev.cancelable) ev.preventDefault()
    this.applyOpen(false, true)
  }

  /**
   * 焦点进入 actions 区按钮时自动开态：actions 按钮在 DOM 中天然 tabbable，
   * 键盘用户 Tab 到按钮即露出操作区（可见可读屏）。
   */
  private onFocusIn = (e: Event): void => {
    if (this.injectDisabled()) return
    const target = e.target as Element | null
    if (!target || typeof target.getAttribute !== 'function') return
    if (target.getAttribute('slot') !== 'actions') return
    if (this.openState) return
    this.measureActions()
    this.applyOpen(true, true)
  }
}
