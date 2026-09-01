import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.box {
  position: fixed;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-message, 1060));
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-2) var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  transition:
    transform var(--oas-transition-base) var(--oas-ease-out),
    opacity var(--oas-transition-base) var(--oas-ease-out);
  pointer-events: auto;
  max-width: calc(100vw - var(--oas-space-6));
}
/* bottom 为默认方向（未设 direction 时也贴底部，避免 fixed 无垂直定位跑到文档底部） */
:host(:not([direction='top'])) .box {
  bottom: calc(var(--snackbar-offset, 24px) + var(--snackbar-stack-shift, 0px));
}
:host([direction='top']) .box {
  top: calc(var(--snackbar-offset, 24px) + var(--snackbar-stack-shift, 0px));
}
/* open 视觉态由内部类驱动（而非 open 属性）：排队/合并等「属性在而视觉未开」的场景可独立控制 */
:host(:not(.oas-open)) .box {
  opacity: 0;
  pointer-events: none;
}
:host(:not([direction='top']):not(.oas-open)) .box {
  transform: translate(-50%, var(--oas-space-5));
}
:host([direction='top']:not(.oas-open)) .box {
  transform: translate(-50%, calc(-1 * var(--oas-space-5)));
}
.message {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}
.action-btn {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-primary);
  cursor: pointer;
  font-family: inherit;
}
.action-btn:hover {
  background: var(--oas-color-bg-hover);
}
.action-btn:focus-visible,
.close-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.close-btn {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0 var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  font-family: inherit;
}
.close-btn:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
/* 同内容合并计数徽标 */
.count {
  flex-shrink: 0;
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-xl);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
/* 计时进度条（JS 记账驱动 scaleX，暂停即冻结） */
.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-bottom-left-radius: var(--oas-radius-md);
  border-bottom-right-radius: var(--oas-radius-md);
  background: var(--oas-color-primary);
  opacity: 0.45;
  transform-origin: 0 50%;
}
/* 滑动关闭：拦截纵向触摸滚动冲突 */
:host([swipe]) .box {
  touch-action: none;
}
`

/** oas-close 事件 detail.reason：关闭途径语义分离（P6） */
export type SnackbarCloseReason =
  | 'timeout' // duration 到期
  | 'escape' // Escape 键关闭
  | 'close' // 关闭按钮点击
  | 'swipe' // 滑动关闭
  | 'evict' // 堆叠超限被挤下
  | 'group' // 同内容合并（自身不展示，并入既有条目）

export interface SnackbarCloseDetail {
  reason: SnackbarCloseReason
}

type SnackbarDirection = 'top' | 'bottom'

/** 堆叠上限：每个方向最多同时 3 条在屏，超出时最老的一条收到 oas-close（reason=evict） */
const OPEN_MAX = 3
/** 滑动关闭位移阈值（px） */
const SWIPE_THRESHOLD = 48
/** 栈内条目间距（--oas-space-2 的镜像值，避免读 computed style） */
const STACK_GAP = 8

const DIRECTIONS: SnackbarDirection[] = ['top', 'bottom']

/** 每个方向的在屏列表（数组序 = 打开顺序，末位最新） */
const openLists: Record<SnackbarDirection, OASSnackbar[]> = { top: [], bottom: [] }
/** 每个方向的排队等待列表（queue 模式，栈满时 FIFO 补位） */
const waitQueues: Record<SnackbarDirection, OASSnackbar[]> = { top: [], bottom: [] }
/** 全局打开序号（跨方向比较「最老」用） */
let seqCounter = 0
/** document 级 Escape 监听按在屏数量装/卸（零泄漏） */
let escapeAttached = false

function directionOf(el: OASSnackbar): SnackbarDirection {
  return el.getAttribute('direction') === 'top' ? 'top' : 'bottom'
}

function removeFromArray<T>(arr: T[], item: T): void {
  const i = arr.indexOf(item)
  if (i >= 0) arr.splice(i, 1)
}

export class OASSnackbar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'message',
      'action-text',
      'duration',
      'direction',
      'offset',
      'closable',
      'group',
      'queue',
      'progress',
      'swipe',
      'no-pause',
    ]
  }

  /** 全局打开序号（「最老」比较用） */
  private openSeq = 0
  /** 视觉/生命周期已激活（排队、合并场景下为 false） */
  private opened = false
  /** 排队等待中（open 属性在、等待栈空位） */
  private waiting = false
  /** 当前登记进的方向列表（null = 未登记） */
  private listedDir: SnackbarDirection | null = null
  /** message 变更侦测（计数重置依据） */
  private lastMessage: string | null = null
  /** 默认插槽是否有真实内容（有则覆盖 message 属性文本，且不参与合并） */
  private slotFilled = false

  // 计时记账（P4：暂停按剩余时长续走，不重置满时长）
  private timer: ReturnType<typeof setTimeout> | null = null
  private total = 0
  private remaining = 0
  private startedAt = 0
  private pauseSources = new Set<'hover' | 'focus' | 'hidden'>()

  // 同内容合并计数（P15）
  private groupCount = 1

  // 滑动关闭状态（P12）
  private swipeStartY: number | null = null
  private swipeDy = 0
  private swipeMoved = false

  private readonly onVisibility = (): void => {
    if (document.hidden) this.pauseFor('hidden')
    else this.resumeFor('hidden')
  }

  // ---------- 模块级栈管理（静态方法：同类实例私有互访） ----------

  /**
   * 栈位重排（P1）：每个方向的在屏条目按打开顺序纵向排列不重叠。
   * 公式（两方向同构）：第 i 条的位移 = 比它新的条目（视觉上更靠屏幕边缘一侧）高度之和 + 间距。
   * 通过 --snackbar-stack-shift 写到宿主，由 .box 的 bottom/top calc() 消费。
   */
  private static relayout(): void {
    for (const dir of DIRECTIONS) {
      const list = openLists[dir]
      const heights = list.map((el) => el.boxEl()?.getBoundingClientRect().height ?? 0)
      list.forEach((el, i) => {
        let shift = 0
        for (let j = i + 1; j < list.length; j++) shift += heights[j]! + STACK_GAP
        el.style.setProperty('--snackbar-stack-shift', `${shift}px`)
      })
    }
  }

  /** Escape 语义（对齐无障碍惯例）：焦点在 snackbar 内 → 关当前；无归属 → 关全局最老一条 */
  private static onEscapeKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    const path = e.composedPath()
    let target: OASSnackbar | null = null
    for (const dir of DIRECTIONS) {
      for (const el of openLists[dir]) {
        if (path.includes(el)) target = el
      }
    }
    if (!target) {
      const heads = [openLists.bottom[0], openLists.top[0]].filter(Boolean) as OASSnackbar[]
      if (heads.length) target = heads.reduce((a, b) => (a.openSeq <= b.openSeq ? a : b))
    }
    if (!target) return
    e.preventDefault()
    target.dismiss('escape')
  }

  /** 在屏总数归零时卸载 document 级 Escape 监听 */
  private static syncEscapeListener(): void {
    const total = openLists.top.length + openLists.bottom.length
    if (total > 0 && !escapeAttached) {
      document.addEventListener('keydown', OASSnackbar.onEscapeKey)
      escapeAttached = true
    } else if (total === 0 && escapeAttached) {
      document.removeEventListener('keydown', OASSnackbar.onEscapeKey)
      escapeAttached = false
    }
  }

  /** 栈内非最新条目 inert（仅最新一条可 Tab，防 tab 陷阱；P16） */
  private static updateFocusability(): void {
    for (const dir of DIRECTIONS) {
      const list = openLists[dir]
      list.forEach((el, i) => {
        const b = el.boxEl()
        if (!b) return
        if (i === list.length - 1) b.removeAttribute('inert')
        else b.setAttribute('inert', '')
      })
    }
  }

  /** 列表变动后的统一收口：Esc 监听装/卸 + 焦点可达性 + 栈位重排 */
  private static afterListChange(): void {
    OASSnackbar.syncEscapeListener()
    OASSnackbar.updateFocusability()
    OASSnackbar.relayout()
  }

  /** 超限挤掉最老（queue 模式在入队前已拦截，不会走到这里） */
  private static evictOverflow(direction: SnackbarDirection): void {
    while (openLists[direction].length > OPEN_MAX) {
      openLists[direction][0]?.dismiss('evict')
    }
  }

  /** 空位补位：按 FIFO 依次展示排队元素（宿主已移除 open 的跳过） */
  private static drainQueue(direction: SnackbarDirection): void {
    while (openLists[direction].length < OPEN_MAX && waitQueues[direction].length > 0) {
      const next = waitQueues[direction].shift()!
      if (!next.isConnected || !next.hasAttribute('open')) continue
      next.waiting = false
      next.startOpen()
    }
  }

  // ---------- 生命周期 ----------

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="status" aria-live="polite" aria-atomic="true" aria-hidden="true">
        <span class="message" part="message"><slot><span class="message-text" part="message-text"></span></slot></span>
        <span class="count" part="count" hidden></span>
        <button class="action-btn" part="action" type="button" hidden></button>
        <button class="close-btn" part="close" type="button" aria-label hidden>✕</button>
        <div class="progress" part="progress" aria-hidden="true" hidden></div>
      </div>
    `
    const box = this.boxEl()
    if (!box) return
    // hover 暂停（focus 暂停挂在宿主 focusin/focusout，覆盖内部按钮获焦）
    box.addEventListener('pointerenter', () => this.pauseFor('hover'))
    box.addEventListener('pointerleave', () => this.resumeFor('hover'))
    this.addEventListener('focusin', () => this.pauseFor('focus'))
    this.addEventListener('focusout', () => this.resumeFor('focus'))
    // 操作按钮（P14 精神：多动作场景由插槽自理，内置只保留单 action 便捷通道）
    this.shadow
      .querySelector<HTMLButtonElement>('[part="action"]')
      ?.addEventListener('click', () => {
        if (this.swipeMoved) return
        this.emit('action')
      })
    // 关闭按钮（P2）
    this.shadow
      .querySelector<HTMLButtonElement>('[part="close"]')
      ?.addEventListener('click', () => {
        if (this.swipeMoved) return
        this.dismiss('close')
      })
    // 默认插槽（P3）：有真实内容时覆盖 message 属性文本
    this.shadow.querySelector<HTMLSlotElement>('slot')?.addEventListener('slotchange', () => {
      this.syncSlotFilled()
      this.syncContent()
    })
    // 页面隐藏暂停（P17/S6）：连接期间常驻监听，opened 时才生效
    document.addEventListener('visibilitychange', this.onVisibility)
    // 滑动关闭（P12）
    box.addEventListener('pointerdown', (e) => this.onSwipeStart(e as PointerEvent))
    box.addEventListener('pointermove', (e) => this.onSwipeMove(e as PointerEvent))
    box.addEventListener('pointerup', () => this.onSwipeEnd())
    box.addEventListener('pointercancel', () => this.onSwipeCancel())

    this.onCleanup(() => {
      this.clearTimer()
      document.removeEventListener('visibilitychange', this.onVisibility)
      const dir = this.listedDir
      this.waiting = false
      this.opened = false
      this.swipeStartY = null
      for (const d of DIRECTIONS) {
        removeFromArray(waitQueues[d], this)
        removeFromArray(openLists[d], this)
      }
      this.listedDir = null
      // 断开即硬复位视觉态（重连后由 open 属性重新驱动）
      this.classList.remove('oas-open')
      if (dir != null) {
        OASSnackbar.afterListChange()
        OASSnackbar.drainQueue(dir)
      }
    })
  }

  /** 堆叠超限/Escape 最老挤下等外部触发的受控下屏：仅派发 oas-close，宿主负责移除 open */
  requestDismiss(): void {
    this.dismiss('evict')
  }

  protected override update(): void {
    if (!this.boxEl()) return
    const open = this.hasAttr('open')
    if (open && !this.opened && !this.waiting) {
      this.handleOpenIntent()
    } else if (!open && (this.opened || this.waiting)) {
      this.handleCloseIntent()
    }
    this.syncContent()
    this.syncPlacement()
    this.syncProgressVisibility()
  }

  /** 打开意图：先看同内容合并（P15），再看栈满排队/挤掉（P1/P10），最后常规打开 */
  private handleOpenIntent(): void {
    const dir = directionOf(this)
    const group = this.getAttr('group', '')
    if (group && !this.slotFilled) {
      const message = this.getAttr('message', '')
      const candidates = [...openLists[dir], ...waitQueues[dir]]
      const target = candidates.find(
        (o) =>
          o !== this &&
          o.getAttr('group', '') === group &&
          !o.slotFilled &&
          o.getAttr('message', '') === message,
      )
      if (target) {
        target.absorbGroupHit()
        // 合并握手：本次展示请求并入既有条目，宿主收到 close（reason=group）后清理 open
        const reason: SnackbarCloseReason = 'group'
        this.emit('close', { reason })
        return
      }
    }
    if (openLists[dir].length >= OPEN_MAX && this.hasAttr('queue')) {
      this.waiting = true
      waitQueues[dir].push(this)
      return
    }
    this.startOpen()
  }

  /** 关闭意图（宿主移除 open 属性）：不发事件（外部发起），排队中则出队 */
  private handleCloseIntent(): void {
    if (this.waiting) {
      this.waiting = false
      removeFromArray(waitQueues[directionOf(this)], this)
      return
    }
    if (!this.opened) return
    this.teardown('external')
  }

  /** 常规打开：登记栈位 + 入场视觉 + 计时 + 派发 oas-open */
  private startOpen(): void {
    const dir = directionOf(this)
    this.opened = true
    this.openSeq = ++seqCounter
    this.groupCount = 1
    this.listedDir = dir
    openLists[dir].push(this)
    OASSnackbar.evictOverflow(dir)
    OASSnackbar.afterListChange()
    this.enterVisual()
    this.startLifecycle()
    this.emit('open')
  }

  /** 入场视觉：清滑动残留 → 强制回流（让浏览器先计算关闭态样式）→ 加 open 类驱动过渡 */
  private enterVisual(): void {
    this.classList.remove('oas-open')
    const b = this.boxEl()
    if (b) {
      b.style.transform = ''
      b.style.opacity = ''
    }
    void this.offsetWidth
    this.classList.add('oas-open')
    b?.setAttribute('aria-hidden', 'false')
  }

  /** 退场视觉：摘 open 类，过渡淡出（fixed 元素不占布局，无需折叠收尾） */
  private exitVisual(): void {
    this.classList.remove('oas-open')
    this.boxEl()?.setAttribute('aria-hidden', 'true')
  }

  /** 统一下屏收口：external（宿主移除 open）不派发事件；其余派发 close(reason) 后补位排队 */
  private teardown(reason: SnackbarCloseReason | 'external'): void {
    this.opened = false
    this.stopLifecycle()
    const dir = this.listedDir ?? directionOf(this)
    if (this.listedDir) {
      removeFromArray(openLists[this.listedDir], this)
      this.listedDir = null
    }
    this.exitVisual()
    OASSnackbar.afterListChange()
    if (reason !== 'external') this.emit('close', { reason })
    OASSnackbar.drainQueue(dir)
  }

  /** 内部/交互关闭路径（timeout/escape/close/swipe/evict） */
  private dismiss(reason: SnackbarCloseReason): void {
    if (!this.opened) return
    this.teardown(reason)
  }

  /** 同内容合并命中：既有条目计数 +1、计时重置 */
  private absorbGroupHit(): void {
    this.groupCount = Math.max(1, this.groupCount) + 1
    const count = this.countEl()
    if (count) {
      count.hidden = this.groupCount <= 1
      count.textContent = `×${this.groupCount}`
    }
    if (this.opened) this.startLifecycle()
  }

  // ---------- 计时记账（P4/P13） ----------

  /** 计时生命周期：满时长起跳，暂停按剩余续走 */
  private startLifecycle(): void {
    this.pauseSources.clear()
    const duration = Number(this.getAttr('duration', '4000'))
    this.total = Number.isFinite(duration) && duration > 0 ? duration : 0
    this.remaining = this.total
    this.runTimer()
  }

  private stopLifecycle(): void {
    this.clearTimer()
    this.startedAt = 0
    this.pauseSources.clear()
  }

  private runTimer(): void {
    this.clearTimer()
    this.progressRun()
    if (this.remaining > 0) {
      this.timer = setTimeout(() => this.dismiss('timeout'), this.remaining)
      this.startedAt = Date.now()
    }
  }

  private pauseFor(src: 'hover' | 'focus' | 'hidden'): void {
    if (!this.opened || this.hasAttr('no-pause')) return
    if (this.pauseSources.has(src)) return
    const first = this.pauseSources.size === 0
    this.pauseSources.add(src)
    if (first && this.timer) {
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt))
      this.clearTimer()
      this.startedAt = 0
      this.progressFreeze()
    }
  }

  private resumeFor(src: 'hover' | 'focus' | 'hidden'): void {
    if (!this.pauseSources.delete(src)) return
    if (this.pauseSources.size === 0 && this.opened) this.runTimer()
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  // ---------- 计时进度（P13） ----------

  /** 进度条：JS 记账驱动 scaleX，起跳走满时长线性动画 */
  private progressRun(): void {
    const bar = this.progressEl()
    if (!bar) return
    if (!this.progressEnabled()) {
      bar.hidden = true
      return
    }
    bar.hidden = false
    const fraction = this.total > 0 ? this.remaining / this.total : 1
    bar.style.transition = 'none'
    bar.style.transform = `scaleX(${fraction})`
    void bar.offsetWidth
    if (this.remaining > 0) {
      bar.style.transition = `transform ${this.remaining}ms linear`
      bar.style.transform = 'scaleX(0)'
    }
  }

  private progressFreeze(): void {
    const bar = this.progressEl()
    if (!bar || !this.progressEnabled()) return
    bar.style.transition = 'none'
    bar.style.transform = `scaleX(${this.total > 0 ? this.remaining / this.total : 1})`
  }

  private progressEnabled(): boolean {
    return this.opened && this.hasAttr('progress') && this.total > 0
  }

  private syncProgressVisibility(): void {
    const bar = this.progressEl()
    if (bar) bar.hidden = !this.progressEnabled()
  }

  // ---------- 滑动关闭（P12） ----------

  private onSwipeStart(e: PointerEvent): void {
    if (!this.opened || !this.hasAttr('swipe')) return
    if (e.button !== undefined && e.button !== 0) return
    this.swipeStartY = e.clientY
    this.swipeDy = 0
    this.swipeMoved = false
    const target = e.target as HTMLElement | null
    try {
      target?.setPointerCapture?.(e.pointerId)
    } catch {
      // 指针捕获失败不阻断拖拽判定
    }
  }

  private onSwipeMove(e: PointerEvent): void {
    if (this.swipeStartY == null) return
    this.swipeDy = e.clientY - this.swipeStartY
    if (Math.abs(this.swipeDy) > 6) this.swipeMoved = true
    this.boxEl()!.style.transform = `translate(-50%, ${this.swipeDy}px)`
  }

  private onSwipeEnd(): void {
    if (this.swipeStartY == null) return
    const dy = this.swipeDy
    this.swipeStartY = null
    this.swipeDy = 0
    const b = this.boxEl()
    if (Math.abs(dy) >= SWIPE_THRESHOLD) {
      // 顺势抛出：内联位移接管退出过渡（淡出在原位移处完成）
      if (b) b.style.transform = `translate(-50%, ${dy * 5}px)`
      this.dismiss('swipe')
    } else if (b) {
      b.style.transform = ''
    }
    // click 在 pointerup 后派发，微任务后复位抑制标记
    setTimeout(() => {
      this.swipeMoved = false
    }, 0)
  }

  private onSwipeCancel(): void {
    if (this.swipeStartY == null) return
    this.swipeStartY = null
    this.swipeDy = 0
    const b = this.boxEl()
    if (b) b.style.transform = ''
    setTimeout(() => {
      this.swipeMoved = false
    }, 0)
  }

  // ---------- 属性增量同步 ----------

  private syncSlotFilled(): void {
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot')
    if (!slot) return
    this.slotFilled = slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  private syncContent(): void {
    const b = this.boxEl()
    if (!b) return
    const message = this.getAttr('message', '')
    if (this.lastMessage == null) this.lastMessage = message
    else if (this.lastMessage !== message) {
      // message 变更：合并计数重置（同组换文案视作新内容）
      this.lastMessage = message
      this.groupCount = 1
    }
    this.syncSlotFilled()
    const fallback = this.shadow.querySelector<HTMLElement>('.message-text')
    if (fallback) {
      fallback.textContent = message
      fallback.hidden = this.slotFilled
    }
    const hasAction = this.getAttr('action-text', '') !== ''
    const actionBtn = this.shadow.querySelector<HTMLButtonElement>('[part="action"]')
    if (actionBtn) {
      actionBtn.hidden = !hasAction
      actionBtn.textContent = this.getAttr('action-text', '')
    }
    const closeBtn = this.shadow.querySelector<HTMLButtonElement>('[part="close"]')
    if (closeBtn) {
      closeBtn.hidden = !this.hasAttr('closable')
      closeBtn.setAttribute('aria-label', this.t('snackbar.close'))
    }
    const count = this.countEl()
    if (count) {
      count.hidden = this.groupCount <= 1
      count.textContent = `×${this.groupCount}`
    }
    b.setAttribute('aria-hidden', String(!this.opened))
  }

  /** 栈位同步：offset 应用（逐元素独立）、打开中换向迁移列表、高度变化重排 */
  private syncPlacement(): void {
    const n = Number(this.getAttr('offset', '24'))
    const offset = Number.isFinite(n) && n >= 0 ? n : 24
    this.style.setProperty('--snackbar-offset', `${offset}px`)
    if (!this.opened) return
    const dir = directionOf(this)
    // 打开中换向：迁移列表并重排
    if (this.listedDir && this.listedDir !== dir) {
      removeFromArray(openLists[this.listedDir], this)
      this.listedDir = dir
      openLists[dir].push(this)
      OASSnackbar.afterListChange()
    }
  }

  private boxEl(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="box"]')
  }

  private countEl(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="count"]')
  }

  private progressEl(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="progress"]')
  }
}
