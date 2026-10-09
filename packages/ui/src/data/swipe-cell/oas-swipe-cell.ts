import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/**
 * oas-swipe-cell —— 列表项横向滑动操作（data 族）。**支持单侧与双侧**。
 *
 * 结构：默认插槽 = 内容层（列表项主体，铺在最上层）。
 * - `slot="actions"`：操作按钮组，默认挂 inline-end 侧（LTR 左滑露出）；`side="start"` 改挂 inline-start 侧
 *   （单侧旧用法，与书写方向正交，RTL 自动镜像）。
 * - `slot="actions-start"`：**另一侧**操作按钮组，固定挂 inline-start 侧（LTR 右滑露出）。
 *   与 `slot="actions"` **可同项同时在位**（双侧：左滑露右侧组、右滑露左侧组）；两组皆在时 `side` 被忽略、
 *   `slot="actions"` 归 inline-end。
 *
 * 开态：由布尔升级为**侧向**（`openSide ∈ {null,'start','end'}`）。`open` 属性/`property` 保留（任一侧开着即真；
 * 程序置 `true` 时按可用侧取默认，end 优先）；`open-side` 反射当前/目标开侧（`start`|`end`）。`oas-open` 事件
 * `detail` 带 `{ side }`。同一手势可双向拖动、跨 0 端到端切换侧；同 cell 内互斥（仅一侧开）。
 *
 * 手势方向门槛 8px：pointermove 仅当 |dx|>|dy| 且 |dx|>8 才接管（setPointerCapture + preventDefault），
 * 否则放行纵向滚动。CSS `touch-action: pan-y` 保证纵向原生滚动不受干扰。
 *
 * 单开互斥：落定开态广播 `oas-swipe-cell-open`，同 document 其余开态 cell 自动关；开态时 document capture
 * 监听 pointerdown（外点关）与 scroll（滚动关）。监听随开/关增删并经 onCleanup 清理。
 *
 * a11y：每个在位操作区 `role="group"` + i18n `swipeCell.actionsLabel`；按钮 DOM 天然 tabbable（焦点进入对应侧
 * 自动开该侧）；Esc 关；cell 不加重角色。`prefers-reduced-motion` 下关过渡。
 */

/** 默认吸附阈值（px） */
const DEFAULT_THRESHOLD = 40
/** 方向判定门槛（px）：位移须超过才决定横/纵轴 */
const DIRECTION_THRESHOLD = 8
/** 跨实例单开互斥的 document 级广播事件名（内部协议，非公开 API） */
const BROADCAST_EVENT = 'oas-swipe-cell-open'

/** 开侧（null = 关） */
type OpenSide = 'start' | 'end' | null

const STYLE = `
:host {
  display: block;
  position: relative;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  /* 内容层底色（覆盖 actions 的遮挡层，需不透明）与 actions 区底色，均可被宿主变量覆盖 */
  --oas-swipe-cell-bg: var(--oas-color-bg);
  --oas-swipe-cell-actions-bg: var(--oas-color-bg-hover);
  /* 内容层物理偏移量（JS 按书写方向写 ±px） */
  --oas-swipe-cell-offset: 0px;
}
:host([hidden]) {
  display: none;
}
.root {
  position: relative;
  overflow: hidden;
}
/* 操作区基样式（两组共用）；具体挂侧由下方规则决定 */
.actions,
.actions-start {
  position: absolute;
  inset-block: 0;
  z-index: 0;
  display: flex;
  align-items: stretch;
  background: var(--oas-swipe-cell-actions-bg);
}
/* slot="actions" 默认挂 inline-end（LTR 左滑露出） */
.actions {
  inset-inline-end: 0;
}
/* 单侧旧用法：side="start" 把 actions 改挂 inline-start（LTR 右滑露出） */
:host([side='start']) .actions {
  inset-inline-end: auto;
  inset-inline-start: 0;
}
/* 双侧：actions-start 在位时，actions 强制归 inline-end（忽略 side=start） */
:host([data-has-start]) .actions {
  inset-inline-end: 0;
  inset-inline-start: auto;
}
/* slot="actions-start" 固定挂 inline-start（LTR 右滑露出） */
.actions-start {
  inset-inline-start: 0;
}
/* actions-start 无内容时隐藏（不产生空 role=group） */
:host(:not([data-has-start])) .actions-start {
  display: none;
}
/* actions 内按钮填满行高（::slotted 可设自定义属性穿透 shadow 边界） */
.actions ::slotted(oas-button),
.actions-start ::slotted(oas-button) {
  --oas-button-height: 100%;
}
.actions ::slotted(button),
.actions-start ::slotted(button) {
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
  /* 底缘外延 1px 同色投影（不影响布局）：避免下层 actions 合成抗锯齿透出线 */
  box-shadow: 0 1px 0 var(--oas-swipe-cell-bg);
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

/** 单次手势状态：方向未定时 axis='pending'；用**物理偏移**跟踪（end/start 对称） */
interface DragState {
  pointerId: number
  startX: number
  startY: number
  /** 按下时的物理偏移 */
  startPhysical: number
  axis: 'pending' | 'x' | 'y'
  /** 最近两个 move 点（速度吸附用） */
  lastX: number
  lastT: number
  prevX: number
  prevT: number
}

export class OASSwipeCell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['disabled', 'open', 'open-side', 'threshold', 'side']
  }

  private contentEl: HTMLElement | null = null
  /** slot="actions" 容器（默认 inline-end；单侧 side 时可挂 start） */
  private actionsEl: HTMLElement | null = null
  /** slot="actions-start" 容器（固定 inline-start） */
  private actionsStartEl: HTMLElement | null = null
  /** 当前开侧（null = 关）；为唯一开态事实源 */
  private currentSide: OpenSide = null
  /** 内部属性写入守卫：`open`/`open-side` 互触发的重入更新一律跳过 */
  private internalUpdate = false
  /** 首次同步标记：连接初始 open 不派发事件 */
  private syncedOnce = false
  /** 两侧操作区实测宽度（打开前测量；0 = 该侧无操作区，不可开） */
  private endWidth = 0
  private startWidth = 0
  private drag: DragState | null = null
  /** 拖动中的物理偏移 */
  private dragPhysical = 0
  private docPointerBound = false
  private docScrollBound = false

  /** 公开 property：读写即反射 open 属性（受控/程序开合；Vue/React 桥接安全） */
  get open(): boolean {
    return this.hasAttribute('open')
  }
  set open(value: boolean) {
    this.toggleAttribute('open', !!value)
  }

  /**
   * 公开 property：当前/目标开侧（'' | 'start' | 'end'）——读写即反射 open-side。
   * 赋 `'start'|'end'` 同时置 `open`（开该侧）；赋 `''`/其他值关闭。
   */
  get openSide(): '' | 'start' | 'end' {
    const v = this.getAttr('open-side', '')
    return v === 'start' || v === 'end' ? v : ''
  }
  set openSide(value: '' | 'start' | 'end') {
    if (value === 'start' || value === 'end') {
      this.setAttribute('open-side', value)
      this.setAttribute('open', '')
    } else {
      this.removeAttribute('open-side')
      this.removeAttribute('open')
    }
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="actions-start" part="actions-start" role="group" hidden>
          <slot name="actions-start"></slot>
        </div>
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
    this.actionsStartEl = this.shadow.querySelector<HTMLElement>('[part="actions-start"]')
    this.contentEl?.addEventListener('pointerdown', this.onPointerDown)
    this.contentEl?.addEventListener('pointermove', this.onPointerMove)
    this.contentEl?.addEventListener('pointerup', this.onPointerUp)
    this.contentEl?.addEventListener('pointercancel', this.onPointerUp)
    this.addEventListener('keydown', this.onKeyDown)
    this.addEventListener('focusin', this.onFocusIn)
    // 具名插槽内容变化（如动态加按钮）→ 重算在位侧与宽度
    for (const name of ['actions', 'actions-start']) {
      this.shadow.querySelector(`slot[name="${name}"]`)?.addEventListener('slotchange', this.onSlotChange)
    }
    document.addEventListener(BROADCAST_EVENT, this.onBroadcast)
    this.onCleanup(() => {
      this.contentEl?.removeEventListener('pointerdown', this.onPointerDown)
      this.contentEl?.removeEventListener('pointermove', this.onPointerMove)
      this.contentEl?.removeEventListener('pointerup', this.onPointerUp)
      this.contentEl?.removeEventListener('pointercancel', this.onPointerUp)
      this.removeEventListener('keydown', this.onKeyDown)
      this.removeEventListener('focusin', this.onFocusIn)
      for (const name of ['actions', 'actions-start']) {
        this.shadow.querySelector(`slot[name="${name}"]`)?.removeEventListener('slotchange', this.onSlotChange)
      }
      document.removeEventListener(BROADCAST_EVENT, this.onBroadcast)
      this.removeOpenListeners()
    })
  }

  protected override update(): void {
    if (this.internalUpdate) return
    this.contentEl = this.contentEl ?? this.shadow.querySelector<HTMLElement>('[part="content"]')
    this.actionsEl = this.actionsEl ?? this.shadow.querySelector<HTMLElement>('[part="actions"]')
    this.actionsStartEl = this.actionsStartEl ?? this.shadow.querySelector<HTMLElement>('[part="actions-start"]')
    const disabled = this.injectDisabled()
    // 宿主状态镜像（data-* 非 observed，写入不触发 attributeChangedCallback 循环）
    this.toggleAttribute('data-disabled', disabled)
    this.toggleAttribute('data-rtl', isRtl(this))

    const hasStart = this.hasSlotContent('actions-start')
    this.toggleAttribute('data-has-start', hasStart)
    if (this.actionsStartEl) this.actionsStartEl.hidden = !hasStart

    this.layout()

    if (this.actionsEl) {
      this.actionsEl.setAttribute('role', 'group')
      this.actionsEl.setAttribute('aria-label', this.t('swipeCell.actionsLabel'))
    }
    if (this.actionsStartEl) {
      this.actionsStartEl.setAttribute('role', 'group')
      this.actionsStartEl.setAttribute('aria-label', this.t('swipeCell.actionsLabel'))
    }

    // disabled 强制收敛：清除开态属性（若属性在关闭态下被设置也清掉，避免属性/状态分叉）
    if (disabled) {
      this.currentSide = null
      this.setOpenAttrs(null)
    }

    // 目标开侧：`open` 为权威开/关，`open-side` 选择哪一侧（缺省按可用侧取默认，end 优先）
    let want: OpenSide = null
    if (this.hasAttr('open')) want = this.normalizeSide(this.getAttr('open-side', '')) ?? this.defaultSide()
    if (disabled) want = null
    // 目标侧无操作区 → 不可开
    if (want && (want === 'end' ? this.endWidth : this.startWidth) <= 0) want = null

    const emit = this.syncedOnce
    if (want !== this.currentSide) this.applyOpenSide(want, emit)
    else {
      this.syncTranslation()
      this.syncOpenListeners()
    }
    this.syncedOnce = true
  }

  private onSlotChange = (): void => {
    this.update()
  }

  /** 某具名插槽是否有 light DOM 内容 */
  private hasSlotContent(name: string): boolean {
    for (const child of Array.from(this.children)) {
      if (child.getAttribute('slot') === name) return true
    }
    return false
  }

  private normalizeSide(v: string): OpenSide {
    return v === 'start' || v === 'end' ? v : null
  }

  /** 默认开侧：end 优先，其次 start，皆无 → null */
  private defaultSide(): OpenSide {
    if (this.endWidth > 0) return 'end'
    if (this.startWidth > 0) return 'start'
    return null
  }

  /**
   * 布局测量与在侧判定：
   * - 双侧（actions-start 在位）：actions → end，actions-start → start；
   * - 单侧：actions 按 side 归位（start 归 start、否则 end）。
   */
  private layout(): void {
    const hasStart = this.hasSlotContent('actions-start')
    const singleAtStart = !hasStart && this.getAttr('side', 'end') === 'start'
    const aW = this.measureElement(this.actionsEl)
    const sW = this.measureElement(this.actionsStartEl)
    this.endWidth = hasStart || !singleAtStart ? aW : 0
    this.startWidth = (hasStart ? sW : 0) + (singleAtStart ? aW : 0)
  }

  private measureElement(el: HTMLElement | null): number {
    if (!el) return 0
    const width = el.getBoundingClientRect().width
    return Number.isFinite(width) && width > 0 ? width : 0
  }

  /** 书写方向位移符号（RTL +1、LTR -1） */
  private dirSign(): number {
    return isRtl(this) ? 1 : -1
  }

  /** 某开侧的物理偏移（end 取 dirSign、start 取 -dirSign；与书写方向正交镜像） */
  private physicalFor(side: OpenSide): number {
    if (side === 'end') return this.dirSign() * this.endWidth
    if (side === 'start') return -this.dirSign() * this.startWidth
    return 0
  }

  private minPhysical(): number {
    return Math.min(0, this.physicalFor('end'), this.physicalFor('start'))
  }

  private maxPhysical(): number {
    return Math.max(0, this.physicalFor('end'), this.physicalFor('start'))
  }

  private clampPhysical(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.min(Math.max(value, this.minPhysical()), this.maxPhysical())
  }

  /** 物理偏移写入 CSS 变量（像素四舍五入） */
  private applyPhysical(physical: number): void {
    this.style.setProperty('--oas-swipe-cell-offset', `${Math.round(this.clampPhysical(physical))}px`)
  }

  /** 当前物理偏移（拖动中跟手；否则按开侧吸附） */
  private currentPhysical(): number {
    return this.drag ? this.dragPhysical : this.physicalFor(this.currentSide)
  }

  private syncTranslation(): void {
    this.applyPhysical(this.currentPhysical())
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
    this.layout()
    const startPhysical = this.currentPhysical()
    this.dragPhysical = startPhysical
    this.drag = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      startPhysical,
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

    // 横向跟手（物理偏移按 dx 直接累加；两侧对称钳制）
    if (ev.cancelable) ev.preventDefault()
    this.dragPhysical = this.clampPhysical(drag.startPhysical + dx)
    this.applyPhysical(this.dragPhysical)
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
    // 释放吸附：快速甩动（|v| ≥ 0.5px/ms）按方向直接开对应侧；慢速按位移阈值——
    // 位移达到阈值且该方向确有可露出内容 → 开该侧；否则回弹关。
    // 速度窗口下限 8ms（一帧）：合成事件同刻连发 dt≈0 一律走位移阈值。
    const physical = this.dragPhysical
    const dt = drag.lastT - drag.prevT
    const v = dt >= 8 ? (drag.lastX - drag.prevX) / dt : 0
    const FLICK = 0.5
    const dir =
      Math.abs(v) >= FLICK ? Math.sign(v) : Math.abs(physical) >= this.thresholdValue() ? Math.sign(physical) : 0
    this.applyOpenSide(this.sideForSign(dir), true)
  }

  /** 物理位移符号 → 目标开侧（无该侧操作区则 null） */
  private sideForSign(sign: number): OpenSide {
    if (sign === 0) return null
    for (const side of ['end', 'start'] as const) {
      const p = this.physicalFor(side)
      if (p !== 0 && Math.sign(p) === sign) return side
    }
    return null
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
   * 落定开侧：同步属性、偏移与监听，按需派发事件。
   * 手势与程序性属性变化都汇聚到此，保证事件恰好派发一次。
   */
  private applyOpenSide(side: OpenSide, emit: boolean): void {
    if (side === this.currentSide) {
      this.syncTranslation()
      this.syncOpenListeners()
      return
    }
    this.currentSide = side
    this.setOpenAttrs(side)
    this.syncTranslation()
    this.syncOpenListeners()
    if (emit) {
      // 字面量事件名：能力清单/API 扫描（含 demo-coverage 通用探针）按字符串字面量提取
      if (side) this.emit('open', { side })
      else this.emit('close')
    }
    // 单开互斥：广播本次开态，同 document 内其余开态 cell 自动关闭
    if (side) document.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: this }))
  }

  /** 写开态属性（守卫内部写入，避免 `open`/`open-side` 互触发的重入更新） */
  private setOpenAttrs(side: OpenSide): void {
    this.internalUpdate = true
    try {
      if (side) {
        this.setAttribute('open-side', side)
        this.setAttribute('open', '')
      } else {
        this.removeAttribute('open')
        this.removeAttribute('open-side')
      }
    } finally {
      this.internalUpdate = false
    }
  }

  private onBroadcast = (e: Event): void => {
    if ((e as CustomEvent).detail === this) return
    if (this.currentSide !== null) this.applyOpenSide(null, true)
  }

  private onDocPointerDown = (e: Event): void => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : []
    // 落在自身（含 light DOM actions 按钮）内部不关闭；外部/其他 cell 关闭
    if (path.includes(this)) return
    this.applyOpenSide(null, true)
  }

  private onDocScroll = (): void => {
    if (this.currentSide === null) return
    // 焦点落在本 cell 的 actions 按钮上时，滚动常由「聚焦把按钮带入视口」引发——
    // 此时关闭会让键盘用户聚焦的按钮重新被内容层遮住，故跳过。
    if (this.focusInActions()) return
    this.applyOpenSide(null, true)
  }

  /** 当前焦点是否落在本 cell 的任一 actions 区（light DOM 具名插槽按钮） */
  private focusInActions(): boolean {
    const active = document.activeElement as HTMLElement | null
    if (!active || active === this) return false
    if (typeof active.getAttribute !== 'function' || typeof active.closest !== 'function') return false
    const slot = active.getAttribute('slot')
    if (slot !== 'actions' && slot !== 'actions-start') return false
    return active.closest('oas-swipe-cell') === this
  }

  /** 开态时挂 document capture 监听（外点/滚动关闭），关态移除 */
  private syncOpenListeners(): void {
    if (this.currentSide !== null) {
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
    if (ev.key !== 'Escape' || this.currentSide === null) return
    if (ev.cancelable) ev.preventDefault()
    this.applyOpenSide(null, true)
  }

  /**
   * 焦点进入 actions 区按钮时自动开对应侧：按钮在 DOM 中天然 tabbable，
   * 键盘用户 Tab 到按钮即露出该侧操作区（可见可读屏）。
   */
  private onFocusIn = (e: Event): void => {
    if (this.injectDisabled()) return
    const target = e.target as Element | null
    if (!target || typeof target.getAttribute !== 'function') return
    const slot = target.getAttribute('slot')
    let side: OpenSide = null
    if (slot === 'actions-start') side = 'start'
    else if (slot === 'actions')
      side = !this.hasSlotContent('actions-start') && this.getAttr('side', 'end') === 'start' ? 'start' : 'end'
    if (!side) return
    if (this.currentSide === side) return
    this.layout()
    if ((side === 'end' ? this.endWidth : this.startWidth) <= 0) return
    this.applyOpenSide(side, true)
  }
}
