import { OASElement } from '@oas-ui/core'

/**
 * oas-pull-refresh —— 下拉刷新（feedback 族，移动原生形态批）。
 *
 * 容器组件：默认插槽 = 滚动内容（列表等）；容器自身为滚动盒（`overflow-y: auto`，
 * 高度由宿主约束）。列表滚到顶部（scrollTop <= 0）继续下拉时接管手势露出顶部指示区，
 * 释放按位移阈值判定触发刷新。
 *
 * 属性（kebab-case）：
 * - `disabled`：布尔，全禁手势（config-provider 全局禁用注入同效）；
 *   拖拽中途置位立即取消回弹（零事件）
 * - `threshold`：触发刷新的下拉阈值 px（默认 60）；非法/非正回落默认；
 *   生效值夹取不超过 max-pull（渐近阻力曲线下等于上限不可达，建议 threshold < max-pull）
 * - `max-pull`：拉动位移上限 px（默认 100）；阻力曲线
 *   `pull = maxPull * (1 - exp(-dy / maxPull))` 渐近上限（增益递减）
 * - `refreshing`：刷新中（宿主受控）——`oas-refresh` 派发后宿主开始异步刷新并置 true，
 *   完成后移除；组件播 success 文案约 600ms 后回弹复位。refreshing 期间再次下拉忽略；
 *   无手势直接置位（程序性刷新）同样停驻刷新中视觉、不派发事件
 *
 * 事件（bubbles + composed）：
 * - `oas-refresh`：下拉位移达到阈值后释放时派发一次；组件停驻阈值高度进刷新中视觉，
 *   等宿主置 `refreshing`（不置则保持停驻等待宿主）
 *
 * 手势与滚动协调：
 * - pointerdown 仅当 scrollTop <= 0 记录起点；pointermove 仅当 dy > 0 且起始于顶部才接管
 *   （setPointerCapture + preventDefault 阻断原生滚动），dy <= 0 放行原生滚动
 * - CSS 侧 `overscroll-behavior-y: contain` 防滚动链、`touch-action: pan-y` 保留纵向滚动
 *   接管权（顶部继续下拉时无原生滚动可启动，pointer 序列不被 pointercancel 打断）
 * - 桌面端鼠标拖拽同效（pointer events 统一）；滚轮不触发（只 pointer 拖拽）
 * - pointercancel 强制回弹、不派发事件（取消语义）
 * - `prefers-reduced-motion` 下回弹/过渡无动画
 *
 * 结构与 a11y：指示区在容器顶部（负 margin 藏于滚动原点上方，拉动位移露出），
 * `role="status"` + `aria-live="polite"`——状态文案切换读屏播报；滚动盒 `tabindex="0"`
 * 键盘可达（axe scrollable-region-focusable：滚动区域必须键盘可滚动，聚焦显示焦点环），
 * 组件不主动抢焦点（纯手势增强）。状态机 idle → pulling → refreshing → success → idle
 * 镜像到宿主 `data-state` 供 CSS 消费；spinner 与箭头互斥显示由 data-state 驱动。
 *
 * 颜色只走 CSS 变量 token（含暗色变体），指示区文案用 text-secondary 达标档浅底可读，
 * 不需掺深安全档（无品牌色着色文字）。
 */

/** 默认触发阈值（px） */
const DEFAULT_THRESHOLD = 60

/** 默认拉动位移上限（px） */
const DEFAULT_MAX_PULL = 100

/** success 文案停留时长（ms），随后回弹复位 */
const SUCCESS_MS = 600

/** 组件内部相位：idle → pulling → refreshing → success → idle */
type Phase = 'idle' | 'pulling' | 'refreshing' | 'success'

/** 单次手势状态（接管前仅记录起点，dy > 0 且在顶部才接管） */
interface PointerState {
  pointerId: number
  startY: number
  taken: boolean
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  /* 指示区高度档（可覆盖） */
  --oas-pull-refresh-indicator-height: 48px;
  /* 颜色通道：文字/箭头 + spinner，任意值可覆盖 */
  --oas-pull-refresh-label-color: var(--oas-color-text-secondary);
  --oas-pull-refresh-spinner-color: var(--oas-color-primary);
}
:host([hidden]) {
  display: none;
}
/* 滚动盒：高度由宿主约束（host 设高即可），纵向滚动 + 防滚动链 + 保留纵向接管权 */
.root {
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
/* 拖拽中禁文本选择/原生拖图（防误选拉动路径上的内容） */
:host([data-dragging]) .root {
  user-select: none;
}
:host([disabled]) .root,
:host([data-disabled]) .root {
  cursor: default;
}
/* 键盘可达（axe scrollable-region-focusable）：滚动盒 tabindex=0，聚焦时焦点环可见 */
.root:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: -1px;
}
/* 位移层：拉动 transform 跟手；释放回弹/停驻走过渡（拖拽中关过渡保证跟手） */
.track {
  position: relative;
  transform: translateY(0);
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  will-change: transform;
}
:host([data-dragging]) .track {
  transition: none;
}
/* 指示区：负 margin 藏于滚动原点上方，拉动位移后底缘先行露出（标准观感） */
.indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  height: var(--oas-pull-refresh-indicator-height);
  /* 指示区：负上 margin 藏于滚动原点上方（track 未位移时 indicator 落在 [-h,0]，被滚动口
     上缘裁掉；拉动位移 X 后落在 [X-h, X]，与内容零重叠完整露出）。
     不得用负下 margin——那会让内容层与指示区恒定叠合 48px（文案与首行内容同行，实抓） */
  margin-top: calc(-1 * var(--oas-pull-refresh-indicator-height));
  color: var(--oas-pull-refresh-label-color);
  font-size: var(--oas-font-size-sm);
  line-height: 1;
  overflow: hidden;
}
.icon {
  position: relative;
  display: inline-flex;
  width: 1em;
  height: 1em;
  font-size: var(--oas-font-size-md);
}
.icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.arrow {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.arrow.flipped {
  transform: rotate(180deg);
}
/* refreshing/success 态藏箭头（spinner 互斥显示由 data-state 驱动） */
:host([data-state='refreshing']) .arrow,
:host([data-state='success']) .arrow {
  display: none;
}
.spinner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-pull-refresh-spinner-color);
  animation: oas-pull-refresh-spin 0.8s linear infinite;
  display: none;
}
:host([data-state='refreshing']) .spinner {
  display: block;
}
@keyframes oas-pull-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}
.label {
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .track {
    transition: none;
  }
  .arrow {
    transition: none;
  }
}
`

export class OASPullRefresh extends OASElement {
  static override get observedAttributes(): string[] {
    return ['disabled', 'threshold', 'max-pull', 'refreshing']
  }

  private scrollEl: HTMLElement | null = null
  private trackEl: HTMLElement | null = null
  private labelEl: HTMLElement | null = null
  private arrowEl: HTMLElement | null = null

  /** 状态机相位（idle/pulling/refreshing/success），镜像到宿主 data-state */
  private phase: Phase = 'idle'
  /** 当前拉动位移（px，已阻力化 + 封顶；0 = 归位） */
  private pull = 0
  /** 进行中的手势（null = 无手势） */
  private pointerState: PointerState | null = null
  /** success 文案停留计时器 */
  private successTimer: ReturnType<typeof setTimeout> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root" tabindex="0">
        <div class="track" part="track">
          <div class="indicator" part="indicator" role="status" aria-live="polite">
            <span class="icon" aria-hidden="true">
              <svg class="arrow" part="arrow" viewBox="0 0 24 24"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="spinner" part="spinner"></span>
            </span>
            <span class="label" part="label"></span>
          </div>
          <div class="content" part="content"><slot></slot></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；监听挂 shadow 内节点，随 render 重建废弃） */
  private bind(): void {
    this.scrollEl = this.shadow.querySelector<HTMLElement>('[part="root"]')
    this.trackEl = this.shadow.querySelector<HTMLElement>('[part="track"]')
    this.labelEl = this.shadow.querySelector<HTMLElement>('[part="label"]')
    this.arrowEl = this.shadow.querySelector<HTMLElement>('[part="arrow"]')
    this.scrollEl?.addEventListener('pointerdown', this.onPointerDown)
    this.scrollEl?.addEventListener('pointermove', this.onPointerMove)
    this.scrollEl?.addEventListener('pointerup', this.onPointerUp)
    this.scrollEl?.addEventListener('pointercancel', this.onPointerCancel)
    // 原生 touchmove（passive:false）：pan-y 下垂直手势归浏览器——顶部下拉（dy>0）必须
    // preventDefault 阻断浏览器接管（否则 pointercancel 打断 pointer 序列，移动仿真实抓 idle 不动）
    this.scrollEl?.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.onCleanup(() => this.clearSuccessTimer())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（滚动盒存在）后接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="root"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.scrollEl) return
    // 初始位移归一：首帧写确定值 translateY(0px)（宿主/测试不经手势也能稳定读取位移）
    if (this.trackEl && this.trackEl.style.transform === '') {
      this.trackEl.style.transform = 'translateY(0px)'
    }
    const disabled = this.injectDisabled()
    // 宿主状态镜像（data-* 非 observed 属性，写入不触发 attributeChangedCallback 循环）
    this.toggleAttribute('data-disabled', disabled)
    // 拖拽中置 disabled：立即取消（回弹、零事件）
    if (disabled && this.phase === 'pulling') {
      this.finishDrag()
      this.springBack()
    }

    // refreshing 受控通道协调：置位（含程序性刷新）停驻刷新中视觉；移除播 success 后复位
    const wantRefreshing = this.hasAttr('refreshing')
    if (wantRefreshing && (this.phase === 'idle' || this.phase === 'pulling')) {
      this.finishDrag()
      this.phase = 'refreshing'
      this.applyPull(this.thresholdValue())
      this.syncVisuals()
    } else if (!wantRefreshing && this.phase === 'refreshing') {
      this.enterSuccess()
    }

    this.syncVisuals()
  }

  // ---------- 手势（pointer events 统一，鼠标拖拽同效） ----------

  private onPointerDown = (e: Event): void => {
    const ev = e as PointerEvent
    if (this.injectDisabled()) return
    if (this.phase !== 'idle') return // refreshing/success 中再次下拉忽略
    if (this.scrollTopValue() > 0) return // 非顶部：放行原生滚动
    this.pointerState = { pointerId: ev.pointerId, startY: ev.clientY, taken: false }
  }

  private onPointerMove = (e: Event): void => {
    const ev = e as PointerEvent
    const st = this.pointerState
    if (!st || ev.pointerId !== st.pointerId) return
    if (this.injectDisabled()) {
      this.finishDrag()
      this.springBack()
      return
    }
    const dy = ev.clientY - st.startY
    if (!st.taken) {
      if (dy <= 0) return // 未下拉：放行原生滚动
      if (this.scrollTopValue() > 0) {
        // 防御守卫：起始于顶部但接管前列表被滚走（原生滚动未被阻断的场景）→ 放弃手势
        this.pointerState = null
        return
      }
      st.taken = true
      this.phase = 'pulling'
      this.toggleAttribute('data-dragging', true)
      this.capture(st.pointerId)
      this.applyPull(0)
      this.syncVisuals()
    }
    // 接管后阻断原生滚动（触摸端 touch-action: pan-y 下顶部无可启动的滚动，鼠标端原生拖拽本就不滚）
    if (ev.cancelable) ev.preventDefault()
    this.applyPull(dy > 0 ? this.resist(dy) : 0)
  }

  private onPointerUp = (e: Event): void => {
    const ev = e as PointerEvent
    const st = this.pointerState
    if (!st || ev.pointerId !== st.pointerId) return
    this.pointerState = null
    if (!st.taken) return
    this.toggleAttribute('data-dragging', false)
    this.release(st.pointerId)
    // 释放判定：位移达阈值 → 派发 oas-refresh（一次）并停驻阈值高度进刷新中视觉；
    // 不足 → 回弹归零（零事件零残留）
    if (this.pull >= this.thresholdValue()) {
      this.phase = 'refreshing'
      this.applyPull(this.thresholdValue())
      this.syncVisuals()
      this.emit('refresh')
    } else {
      this.springBack()
    }
  }

  /** 原生 touchmove：顶部下拉手势阻断浏览器原生 pan（见 bind 注释）；上推（dy<=0）放行正常滚动 */
  private onTouchMove = (ev: TouchEvent): void => {
    const st = this.pointerState
    if (!st) return
    const dy = (ev.touches[0]?.clientY ?? 0) - st.startY
    if ((st.taken || dy > 0) && ev.cancelable) ev.preventDefault()
  }

  private onPointerCancel = (e: Event): void => {
    const ev = e as PointerEvent
    const st = this.pointerState
    if (!st || ev.pointerId !== st.pointerId) return
    // 取消语义：强制回弹、不派发事件
    this.finishDrag()
    this.springBack()
  }

  /** 结束手势：清指针态、还原拖拽镜像、释放指针捕获（幂等） */
  private finishDrag(): void {
    const st = this.pointerState
    this.pointerState = null
    if (!st?.taken) return
    this.toggleAttribute('data-dragging', false)
    this.release(st.pointerId)
  }

  // ---------- 状态机 ----------

  /** 回弹复位：位移归零（过渡动画承载，reduced-motion 下瞬跳）、状态回 idle */
  private springBack(): void {
    this.phase = 'idle'
    this.applyPull(0)
    this.syncVisuals()
  }

  /** success 文案停留 ~600ms 后回弹复位（refreshing 移除后调用） */
  private enterSuccess(): void {
    this.clearSuccessTimer()
    this.phase = 'success'
    this.successTimer = setTimeout(() => {
      this.successTimer = null
      this.springBack()
    }, SUCCESS_MS)
    this.syncVisuals()
  }

  private clearSuccessTimer(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer)
      this.successTimer = null
    }
  }

  /** 同步宿主状态镜像与指示区视觉（文案/箭头；spinner 互斥由 CSS data-state 驱动） */
  private syncVisuals(): void {
    this.setAttribute('data-state', this.phase)
    this.syncLabel()
    this.syncArrow()
  }

  private syncLabel(): void {
    if (!this.labelEl) return
    let key = 'pullRefresh.pull'
    if (this.phase === 'refreshing') key = 'pullRefresh.refreshing'
    else if (this.phase === 'success') key = 'pullRefresh.success'
    else if (this.pull >= this.thresholdValue()) key = 'pullRefresh.release'
    const text = this.t(key)
    if (this.labelEl.textContent !== text) this.labelEl.textContent = text
  }

  private syncArrow(): void {
    this.arrowEl?.classList.toggle('flipped', this.pull >= this.thresholdValue())
  }

  // ---------- 位移与参数 ----------

  /** 写入拉动位移（阻力化 + 封顶 + 两位小数舍入；渐近曲线下大位移可精确达上限） */
  private applyPull(raw: number): void {
    this.pull = Math.max(0, Math.round(raw * 100) / 100)
    if (this.trackEl) this.trackEl.style.transform = `translateY(${this.pull}px)`
    this.syncArrow()
    this.syncLabel()
  }

  /** 阻力曲线：位移渐近 max-pull（增益递减），硬封顶 max-pull */
  private resist(dy: number): number {
    const max = this.maxPullValue()
    return Math.min(max * (1 - Math.exp(-dy / max)), max)
  }

  /** max-pull 归一：非法/非正回落默认 100 */
  private maxPullValue(): number {
    const n = Number(this.getAttr('max-pull', String(DEFAULT_MAX_PULL)))
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PULL
  }

  /** threshold 归一：非法/非正回落默认 60；生效值夹取不超过 max-pull */
  private thresholdValue(): number {
    const n = Number(this.getAttr('threshold', String(DEFAULT_THRESHOLD)))
    const raw = Number.isFinite(n) && n > 0 ? n : DEFAULT_THRESHOLD
    // 夹取上限 max(maxPull-1, maxPull/2)：阻力曲线渐近 max-pull，threshold≥max-pull 不可达
    //（配置陷阱，review M5）；maxPull 极小/亚像素时用半值兜底（max(1,…)=1>maxPull 死锁，二轮 Minor 实抓）
    const maxPull = this.maxPullValue()
    return Math.min(raw, Math.max(maxPull - 1, maxPull / 2))
  }

  /** 滚动盒当前 scrollTop（0 = 顶部，下拉手势的前提条件） */
  private scrollTopValue(): number {
    return this.scrollEl?.scrollTop ?? 0
  }

  private capture(pointerId: number): void {
    try {
      this.scrollEl?.setPointerCapture(pointerId)
    } catch {
      /* 捕获失败（元素未连接/指针已释放）不阻断本次手势 */
    }
  }

  private release(pointerId: number): void {
    try {
      this.scrollEl?.releasePointerCapture(pointerId)
    } catch {
      /* 已释放 */
    }
  }
}
