import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { stableHash36 } from '../../shared/stable-id.js'

/**
 * oas-drag —— 自由拖拽浮块（overlay 族）。
 *
 * 把任意子元素（默认插槽）包成可拖拽的浮块：指针统一拖拽（鼠标 / 触屏 / 笔），
 * 边界钳制（视口或指定容器），可选惯性滑行与位置记忆；键盘方向键微调。
 *
 * 属性（kebab-case）：
 * - `boundary`：拖拽边界——缺省 `viewport`（视口）或 CSS 选择器（该元素的矩形；非法选择器告警一次并回落视口）
 * - `axis`：`both`（缺省）/ `x` / `y`，限制拖拽方向
 * - `inertia`：松手滑行衰减（摩擦 0.95/16ms，真实时长上限 800ms——60 / 120Hz 屏体感一致，
 *   速度衰减到阈值同样截停，触边即停；`prefers-reduced-motion: reduce` 时降级为瞬停）
 * - `remember`：把位置写入 `localStorage`（SSR / 隐私模式不可用时静默降级，不记不读）
 * - `storage-key`：位置记忆的键（缺省 `oas-drag`）
 * - `keyboard`：键盘微调（缺省开启，写 `keyboard="false"` 关闭）；宿主可聚焦，方向键 1px、Shift+方向键 10px
 * - `announce`：位置变化经 `aria-live` 播报（缺省关闭）
 * - `disabled`：关闭拖拽（子元素保持原有交互）
 * - `snap`：吸附网格尺寸（正整数 px；字面量 `grid` = 8px 网格）。松手（含惯性收尾）时把位移
 *   对齐到最近的网格点；键盘微调不受影响
 * - `snap-targets`：吸附点 JSON 数组 `[{ x, y }]`（相对初始布局位置的位移坐标）——松手时距最近的
 *   吸附点小于等于 `snap-threshold` 即精确吸附；拖拽过程中接近吸附点会显示吸附提示（`part="snap-hint"`）
 * - `snap-threshold`：吸附点距离阈值（px，默认 12）；非法值告警一次回落默认
 *
 * 事件（bubbles + composed）：
 * - `oas-drag-start`：指针拖拽越过 4px 阈值、接管指针时派发一次，`detail: { x, y, source }`
 * - `oas-drag`：位置变化（指针拖拽 / 键盘微调 / 惯性滑行），`detail: { x, y, source }`
 * - `oas-drag-end`：拖拽收尾，`detail: { x, y, source, phase }`。**双派发语义**：指针松手
 *   （含 pointercancel）派发 `phase: 'release'`；开启 `inertia` 时滑行收尾再派发一次
 *   `phase: 'coast-end'`（终值）。宿主按 `phase` 区分两次派发，不必按时间窗去重
 *
 * 方法：
 * - `reset()`：回到初始位置并清除记忆
 *
 * 交互约定：整个宿主即拖拽面；提供 `handle` 插槽时只有手柄区起拖（其余区域照常交互）。
 * 指针位移 < 4px 视为点击，不阻止子元素的 click / 默认行为；越过阈值的拖拽结束后，
 * 紧随的那一次 click 被吞掉（松手恰好停在子按钮上不会误触），下一次正常点击不受影响。
 * `pointercancel`（滚动 / 手势中断）只收尾拖拽，不写位置记忆、不起惯性。
 * 吸附只作用于指针拖拽的落点（松手 / 惯性收尾）：键盘微调与 `position` 写入保持 1px 精确。
 *
 * @summary 子元素自由拖拽浮块（边界钳制 / 惯性 / 位置记忆 / 键盘微调 / 网格与吸附点）
 */

export type DragAxis = 'both' | 'x' | 'y'

export interface DragPosition {
  x: number
  y: number
}

/** 指针拖拽会话状态（null = 未拖拽） */
interface PointerDragState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
  lastX: number
  lastY: number
  lastT: number
  velocityX: number
  velocityY: number
}

type DragSource = 'pointer' | 'keyboard'

/** oas-drag-end 的派发阶段：release = 指针释放（含取消），coast-end = 惯性滑行收尾 */
export type DragEndPhase = 'release' | 'coast-end'

export interface DragEndDetail {
  x: number
  y: number
  source: DragSource
  phase: DragEndPhase
}

/** 拖拽判定阈值（px）：小于此位移视为点击，避免吞掉子元素点击 */
const DRAG_THRESHOLD = 4
/** 键盘单步位移（px）与 Shift 加速倍数 */
const KEY_STEP = 1
const KEY_STEP_FAST = 10
/** 惯性衰减：每帧（16ms）保留的速度比例，低于 MIN_VELOCITY 停止 */
const INERTIA_DECAY = 0.95
const MIN_VELOCITY = 0.02
/**
 * 松手速度的「有效期」（ms）：最后一次 pointermove 采样距今超过它即视为已经停住，
 * 速度按 0 处理——否则「快速拖一下 → 按住不动 → 松手」会带着停顿前的速度滑出去。
 */
const STALE_VELOCITY_MS = 100
/**
 * 惯性滑行的真实时长上限（ms）：60 / 120Hz 屏体感一致——帧数口径在高刷屏只有一半时长
 * 且末段急刹。速度衰减到 MIN_VELOCITY 同样截停；帧数上限只作时间戳异常的兜底。
 */
const MAX_COAST_MS = 800
/** 滑行帧数兜底上限（仅防 rAF 时间戳不推进导致死循环；正常由时长 / 速度条件截停） */
const MAX_COAST_FRAMES = 1000
const VALID_AXES: readonly string[] = ['both', 'x', 'y']
/** `snap="grid"` 字面量的默认网格尺寸（px） */
const DEFAULT_SNAP_GRID = 8
/** 吸附点距离阈值缺省值（px） */
const DEFAULT_SNAP_THRESHOLD = 12

const warned = new Set<string>()
let instanceSeq = 0
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  devWarn(message)
}

function clampValue(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

const STYLE = `
:host {
  display: inline-block;
  box-sizing: border-box;
  font-family: inherit;
  /* 拖拽面：触屏不做原生滚动/缩放，保证 pointermove 连续 */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  will-change: transform;
}
:host([hidden]) {
  display: none !important;
}
:host([data-dragging]) {
  cursor: grabbing;
  transition: none;
}
/* 整宿主拖拽形态给可拖动光标；手柄形态由手柄区承担该提示 */
:host(:not([data-has-handle]):not([disabled])) {
  cursor: grab;
}
:host(:not([data-dragging])) {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
/* 惯性滑行期间禁用过渡，位移由 rAF 直接驱动 */
:host([data-coasting]) {
  transition: none;
}
/* 位置记忆恢复的首帧禁用过渡：避免「页面加载即从原点滑到记忆位置」的可见滑入 */
:host([data-restoring]) {
  transition: none;
}
:host([data-reduced-motion]) {
  transition: none;
}
:host([disabled]) {
  cursor: default;
  touch-action: auto;
}
:host([disabled]) .handle {
  cursor: default;
}
.surface {
  display: contents;
}
.handle {
  display: block;
  touch-action: none;
  cursor: grab;
}
.handle[hidden] {
  display: none;
}
.handle:focus-visible,
:host(:focus-visible) {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
/* 吸附提示：拖拽中接近吸附点时的视觉落点标记（不参与命中，纯提示；自中心对齐用 transform）。
   尺寸大于常见拖拽块的热区，保证吸附落点被宿主内容遮挡时仍可见 */
.snap-hint {
  position: absolute;
  z-index: 2;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  border: 2px dashed var(--oas-color-primary);
  border-radius: 50%;
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  pointer-events: none;
  opacity: 0.9;
  transform: translate(-50%, -50%);
}
.snap-hint[hidden] {
  display: none;
}
@media (forced-colors: active) {
  .handle:focus-visible,
  :host(:focus-visible) {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
  }
}
`

export class OASDrag extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'boundary',
      'axis',
      'inertia',
      'remember',
      'storage-key',
      'keyboard',
      'announce',
      'disabled',
      'snap',
      'snap-targets',
      'snap-threshold',
    ]
  }

  private surfaceEl: HTMLElement | null = null
  private handleEl: HTMLElement | null = null
  private handleSlot: HTMLSlotElement | null = null
  private contentSlot: HTMLSlotElement | null = null
  private liveEl: HTMLElement | null = null
  private hintEl: HTMLElement | null = null
  private snapHintEl: HTMLElement | null = null

  /** 当前位移（相对初始布局位置） */
  private offsetX = 0
  private offsetY = 0
  /** 拖拽中的指针状态（null = 未拖拽） */
  private drag: PointerDragState | null = null
  /** 惯性动画帧句柄（0 = 未运行） */
  private coastFrame = 0
  /** 拖拽后抑制紧随 click 的守卫（null = 未挂） */
  private clickGuard: ((event: Event) => void) | null = null
  /** 是否记忆位置已恢复（首帧只恢复一次） */
  private restored = false
  /** 是否处于「有手柄」形态（handle 插槽有内容） */
  private hasHandle = false
  /** 是否处于 reduced-motion（惯性降级瞬停） */
  private reducedMotion = false
  /** 实例 ID（shadow 内 IDREF 唯一化，惰性计算） */
  private uidValue = ''

  private uid(): string {
    if (this.uidValue === '') this.uidValue = stableHash36(`${this.tagName}-${(instanceSeq += 1)}`)
    return this.uidValue
  }

  /**
   * @apiProperty 当前位移：get 返回 `{ x, y }`；set 接受同形对象（写回即钳制，不派发事件）
   */
  get position(): DragPosition {
    return { x: this.offsetX, y: this.offsetY }
  }

  set position(value: DragPosition | string) {
    const parsed = typeof value === 'string' ? this.tryParse(value) : value
    if (!parsed || typeof parsed !== 'object') return
    const record = parsed as { x?: unknown; y?: unknown }
    const x = typeof record.x === 'number' && Number.isFinite(record.x) ? record.x : this.offsetX
    const y = typeof record.y === 'number' && Number.isFinite(record.y) ? record.y : this.offsetY
    this.applyOffset(x, y, 'keyboard', false)
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="surface" part="surface">
        <div class="handle" part="handle" hidden><slot name="handle"></slot></div>
        <div class="content" part="content"><slot></slot></div>
        <span class="sr-only" part="hint"></span>
        <span class="sr-only" part="live" aria-live="polite"></span>
        <span class="snap-hint" part="snap-hint" aria-hidden="true" hidden></span>
      </div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
    this.update()
  }

  private bind(): void {
    this.surfaceEl = this.shadow.querySelector('.surface')
    this.handleEl = this.shadow.querySelector('.handle')
    this.handleSlot = this.shadow.querySelector('slot[name="handle"]')
    this.contentSlot = this.shadow.querySelector('slot:not([name])')
    this.liveEl = this.shadow.querySelector('[part="live"]')
    this.hintEl = this.shadow.querySelector('[part="hint"]')
    this.snapHintEl = this.shadow.querySelector('[part="snap-hint"]')
    this.addEventListener('pointerdown', this.onPointerDown)
    this.addEventListener('pointermove', this.onPointerMove)
    this.addEventListener('pointerup', this.onPointerUp)
    this.addEventListener('pointercancel', this.onPointerCancel)
    this.addEventListener('keydown', this.onKeyDown)
    this.handleSlot?.addEventListener('slotchange', this.onSlotChange)
    this.contentSlot?.addEventListener('slotchange', this.onSlotChange)
    this.onCleanup(() => {
      this.removeEventListener('pointerdown', this.onPointerDown)
      this.removeEventListener('pointermove', this.onPointerMove)
      this.removeEventListener('pointerup', this.onPointerUp)
      this.removeEventListener('pointercancel', this.onPointerCancel)
      this.removeEventListener('keydown', this.onKeyDown)
      this.handleSlot?.removeEventListener('slotchange', this.onSlotChange)
      this.contentSlot?.removeEventListener('slotchange', this.onSlotChange)
      this.stopCoast()
      this.releaseClickGuard()
      this.releaseCapture()
      this.drag = null
      this.removeAttribute('data-dragging')
      this.removeAttribute('data-restoring')
    })
  }

  protected override update(): void {
    if (!this.surfaceEl) return
    const disabled = this.injectDisabled()
    const keyboard = this.keyboardEnabled()
    this.reducedMotion = this.prefersReducedMotion()
    this.hasHandle = this.handleNodes().length > 0
    this.handleEl!.hidden = !this.hasHandle
    this.toggleAttribute('data-has-handle', this.hasHandle)
    this.toggleAttribute('disabled', disabled)
    this.toggleAttribute('data-reduced-motion', this.reducedMotion)

    // 可访问名与键盘可达：整宿主拖拽形态下宿主自身作为焦点停靠点
    this.setAttribute('aria-label', this.getAttr('aria-label', '') || this.t('drag.label'))
    if (keyboard && !disabled && !this.hasHandle) this.setAttribute('tabindex', '0')
    else this.removeAttribute('tabindex')

    // 键盘操作提示（sr-only）与位置播报区
    const hintId = `oas-drag-hint-${this.uid()}`
    this.hintEl!.id = hintId
    this.hintEl!.textContent = keyboard ? this.t('drag.hint') : ''
    if (keyboard) this.setAttribute('aria-describedby', hintId)
    else this.removeAttribute('aria-describedby')

    this.liveEl!.hidden = !this.hasAttr('announce')

    if (!this.restored) {
      this.restored = true
      this.restorePosition()
    }
    this.applyTransform()
  }

  // ---------- 解析 ----------

  private resolveAxis(): DragAxis {
    const raw = this.getAttr('axis', 'both')
    if (VALID_AXES.includes(raw)) return raw as DragAxis
    warnOnce(`[oas-drag] 非法 axis "${raw}"，已回落 both；合法值：both / x / y`)
    return 'both'
  }

  private keyboardEnabled(): boolean {
    const raw = this.getAttr('keyboard', '')
    return raw !== 'false'
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  }

  private tryParse(raw: string): unknown {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  /** 位置记忆：`remember` + `storage-key`；不可用时静默降级（SSR / 隐私模式） */
  private storage(): Storage | null {
    if (!this.hasAttr('remember')) return null
    try {
      if (typeof localStorage === 'undefined') return null
      // 隐私模式访问可能抛错：探针读写一次，失败即视为不可用
      const probe = '__oas_drag_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return localStorage
    } catch {
      return null
    }
  }

  private storageKeyOf(): string {
    return this.getAttr('storage-key', 'oas-drag') || 'oas-drag'
  }

  private restorePosition(): void {
    const storage = this.storage()
    if (!storage) return
    try {
      const raw = storage.getItem(this.storageKeyOf())
      if (!raw) return
      const parsed = this.tryParse(raw) as { x?: unknown; y?: unknown } | null
      if (!parsed || typeof parsed !== 'object') return
      const x = typeof parsed.x === 'number' && Number.isFinite(parsed.x) ? parsed.x : 0
      const y = typeof parsed.y === 'number' && Number.isFinite(parsed.y) ? parsed.y : 0
      const clamped = this.clampOffset(x, y)
      this.offsetX = clamped.x
      this.offsetY = clamped.y
      this.holdRestoreFrame()
    } catch {
      /* 读到坏数据：忽略，保持初始位置 */
    }
  }

  /** 恢复位置的首帧禁用过渡（下一帧撤除）：避免挂载瞬间从原点可见滑到记忆位置 */
  private holdRestoreFrame(): void {
    this.toggleAttribute('data-restoring', true)
    const release = (): void => this.removeAttribute('data-restoring')
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(release)
    else setTimeout(release, 0)
  }

  private savePosition(): void {
    const storage = this.storage()
    if (!storage) return
    try {
      storage.setItem(this.storageKeyOf(), JSON.stringify({ x: this.offsetX, y: this.offsetY }))
    } catch {
      /* 写入失败（配额 / 隐私模式）：忽略，不影响拖拽 */
    }
  }

  // ---------- 几何 ----------

  /** 拖拽边界矩形（viewport 或选择器命中元素） */
  private resolveBounds(): { left: number; top: number; right: number; bottom: number } {
    const raw = this.getAttr('boundary', 'viewport').trim()
    if (raw === '' || raw === 'viewport') {
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
    }
    let target: Element | null = null
    try {
      target = document.querySelector(raw)
    } catch {
      target = null
    }
    if (!target) {
      warnOnce(`[oas-drag] boundary 选择器未命中元素 "${raw}"，已回落 viewport`)
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
    }
    const rect = target.getBoundingClientRect()
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
  }

  /**
   * 钳制位移：以「未施加 transform 的宿主矩形」为基准，
   * 保证宿主整体落在边界内（边界小于宿主时不出现负值抖动）。
   */
  private clampOffset(x: number, y: number): DragPosition {
    const axis = this.resolveAxis()
    const rect = this.getBoundingClientRect()
    const baseLeft = rect.left - this.offsetX
    const baseTop = rect.top - this.offsetY
    const bounds = this.resolveBounds()
    let nextX = axis === 'y' ? this.offsetX : x
    let nextY = axis === 'x' ? this.offsetY : y
    const minX = bounds.left - baseLeft
    const maxX = bounds.right - (baseLeft + rect.width)
    const minY = bounds.top - baseTop
    const maxY = bounds.bottom - (baseTop + rect.height)
    nextX = clampValue(nextX, Math.min(minX, maxX), Math.max(minX, maxX))
    nextY = clampValue(nextY, Math.min(minY, maxY), Math.max(minY, maxY))
    return { x: nextX, y: nextY }
  }

  private applyTransform(): void {
    const x = Math.round(this.offsetX * 100) / 100
    const y = Math.round(this.offsetY * 100) / 100
    this.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }

  // ---------- 吸附（网格 / 吸附点） ----------

  /** 网格尺寸：`snap` 数值或字面量 `grid`（= 8px）；未写 / 非法 = 不吸附（非法告警一次） */
  private snapGrid(): number {
    const raw = this.getAttr('snap', '').trim()
    if (raw === '') return 0
    if (raw === 'grid') return DEFAULT_SNAP_GRID
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      warnOnce(`[oas-drag] 非法 snap "${raw}"，已按不吸附处理；合法值：正整数（网格尺寸）或 "grid"`)
      return 0
    }
    return value
  }

  /** 吸附点数组：JSON `[{ x, y }]`；非法形态告警一次并忽略
   * （名字刻意避开 `snapTargets`：框架按「key in el」把 attribute 写成 property 时会遮蔽同名方法） */
  private parseSnapTargets(): DragPosition[] {
    const raw = this.getAttr('snap-targets', '').trim()
    if (raw === '') return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      warnOnce(`[oas-drag] snap-targets 不是合法 JSON，已忽略；示例：[{ "x": 100, "y": 40 }]`)
      return []
    }
    if (!Array.isArray(parsed)) {
      warnOnce('[oas-drag] snap-targets 必须是数组，已忽略')
      return []
    }
    const out: DragPosition[] = []
    for (const entry of parsed) {
      const record = entry as { x?: unknown; y?: unknown } | null
      if (!record || typeof record !== 'object') continue
      if (typeof record.x !== 'number' || !Number.isFinite(record.x)) continue
      if (typeof record.y !== 'number' || !Number.isFinite(record.y)) continue
      out.push({ x: record.x, y: record.y })
    }
    return out
  }

  /** 吸附点距离阈值（px）：非负；非法告警一次回落 12
   * （名字刻意避开 `snapThreshold`：框架按「key in el」把 attribute 写成 property 时会遮蔽同名方法） */
  private parseSnapThreshold(): number {
    const raw = this.getAttr('snap-threshold', '').trim()
    if (raw === '') return DEFAULT_SNAP_THRESHOLD
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) {
      warnOnce(`[oas-drag] 非法 snap-threshold "${raw}"，已回落 ${DEFAULT_SNAP_THRESHOLD}`)
      return DEFAULT_SNAP_THRESHOLD
    }
    return value
  }

  /** 吸附落点：吸附点优先（阈值内取最近），其次网格取整；都不适用返回 null */
  private snapPosition(x: number, y: number): DragPosition | null {
    const targets = this.parseSnapTargets()
    if (targets.length > 0) {
      const threshold = this.parseSnapThreshold()
      let best: DragPosition | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (const target of targets) {
        const distance = Math.hypot(target.x - x, target.y - y)
        if (distance < bestDistance) {
          bestDistance = distance
          best = target
        }
      }
      if (best && bestDistance <= threshold) return { x: best.x, y: best.y }
    }
    const grid = this.snapGrid()
    if (grid > 0) return { x: Math.round(x / grid) * grid, y: Math.round(y / grid) * grid }
    return null
  }

  /** 执行吸附（松手 / 惯性收尾）：命中则写位移并返回 true（调用方据此补一次 oas-drag） */
  private applySnap(): boolean {
    const snapped = this.snapPosition(this.offsetX, this.offsetY)
    if (!snapped) return false
    const clamped = this.clampOffset(snapped.x, snapped.y)
    if (clamped.x === this.offsetX && clamped.y === this.offsetY) return false
    this.offsetX = clamped.x
    this.offsetY = clamped.y
    this.applyTransform()
    this.announcePosition()
    return true
  }

  /** 拖拽中的吸附提示：接近吸附点时在目标位置画提示环（绝对定位在宿主坐标系内） */
  private syncSnapHint(): void {
    const hint = this.snapHintEl
    if (!hint) return
    const targets = this.parseSnapTargets()
    if (!this.drag || targets.length === 0) {
      hint.hidden = true
      return
    }
    const threshold = this.parseSnapThreshold()
    let best: DragPosition | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const target of targets) {
      const distance = Math.hypot(target.x - this.offsetX, target.y - this.offsetY)
      if (distance < bestDistance) {
        bestDistance = distance
        best = target
      }
    }
    if (!best || bestDistance > threshold) {
      hint.hidden = true
      return
    }
    hint.hidden = false
    hint.style.left = `${best.x - this.offsetX}px`
    hint.style.top = `${best.y - this.offsetY}px`
  }

  private hideSnapHint(): void {
    if (this.snapHintEl) this.snapHintEl.hidden = true
  }

  /** 写入位移（钳制 → 期望态与执行态同步 → 事件；赋值通道 emit=false 不派发） */
  private applyOffset(x: number, y: number, source: DragSource, emit = true): void {
    const clamped = this.clampOffset(x, y)
    const moved = clamped.x !== this.offsetX || clamped.y !== this.offsetY
    this.offsetX = clamped.x
    this.offsetY = clamped.y
    this.applyTransform()
    this.announcePosition()
    if (!moved || !emit) return
    this.emit('drag', { x: this.offsetX, y: this.offsetY, source })
  }

  private announcePosition(): void {
    if (!this.liveEl || !this.hasAttr('announce')) return
    this.liveEl.textContent = this.t('drag.position', { x: Math.round(this.offsetX), y: Math.round(this.offsetY) })
  }

  // ---------- 指针拖拽 ----------

  /** 事件是否落在手柄区（有手柄时只有手柄能起拖） */
  private handleNodes(): Element[] {
    return [...this.children].filter((child) => child.getAttribute('slot') === 'handle')
  }

  private isInHandle(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Node)) return false
    return this.handleNodes().some((node) => node === target || node.contains(target))
  }

  private onSlotChange = (): void => {
    this.update()
  }

  private onPointerDown = (event: Event): void => {
    const ev = event as PointerEvent
    if (this.injectDisabled()) return
    if (this.drag) return
    if (ev.button !== undefined && ev.button !== 0) return
    if (this.hasHandle && !this.isInHandle(ev.target)) return
    this.stopCoast()
    this.releaseClickGuard()
    this.drag = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: this.offsetX,
      originY: this.offsetY,
      moved: false,
      lastX: ev.clientX,
      lastY: ev.clientY,
      lastT: ev.timeStamp,
      velocityX: 0,
      velocityY: 0,
    }
  }

  private onPointerMove = (event: Event): void => {
    const ev = event as PointerEvent
    const drag = this.drag
    if (!drag || ev.pointerId !== drag.pointerId) return
    const dx = ev.clientX - drag.startX
    const dy = ev.clientY - drag.startY
    if (!drag.moved) {
      // 阈值内视为点击：不接管指针、不阻止默认行为
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.moved = true
      this.setAttribute('data-dragging', '')
      this.capturePointer(drag.pointerId)
      this.emit('drag-start', { x: this.offsetX, y: this.offsetY, source: 'pointer' })
    }
    // 阻止文本选择/图片拖拽的默认行为（拖拽已接管）
    if (ev.cancelable) ev.preventDefault()
    const dt = Math.max(1, ev.timeStamp - drag.lastT)
    drag.velocityX = (ev.clientX - drag.lastX) / dt
    drag.velocityY = (ev.clientY - drag.lastY) / dt
    drag.lastX = ev.clientX
    drag.lastY = ev.clientY
    drag.lastT = ev.timeStamp
    this.applyOffset(drag.originX + dx, drag.originY + dy, 'pointer')
    this.syncSnapHint()
  }

  private onPointerUp = (event: Event): void => {
    const drag = this.endPointerDrag(event)
    if (!drag) return
    this.hideSnapHint()
    const { velocityX, velocityY } = this.releaseVelocity(drag, event)
    const willCoast = this.willCoast(velocityX, velocityY)
    // 无惯性：松手即吸附落点（补一次 oas-drag，让宿主拿到吸附后的终值）
    if (!willCoast && this.applySnap()) {
      this.emit('drag', { x: this.offsetX, y: this.offsetY, source: 'pointer' })
    }
    this.emit('drag-end', {
      x: this.offsetX,
      y: this.offsetY,
      source: 'pointer',
      phase: 'release',
    } satisfies DragEndDetail)
    this.savePosition()
    if (willCoast) this.startCoast(velocityX, velocityY)
  }

  /**
   * 松手时的起始速度：最后一次 pointermove 采样距今超过 `STALE_VELOCITY_MS` 视为「已经停住」，
   * 速度归零（`willCoast` 自然为 false，吸附照做）。
   *
   * 浏览器在指针静止时不再派发 pointermove，所以「先甩一下再按住不动」的最后一次采样会停在
   * 甩动那一刻；不判时效就会拿陈旧速度滑出去。`timeStamp` 缺失/非法时保持原速度（向后兼容）。
   */
  private releaseVelocity(drag: PointerDragState, event: Event): { velocityX: number; velocityY: number } {
    const stamp = (event as PointerEvent).timeStamp
    if (Number.isFinite(stamp) && stamp - drag.lastT > STALE_VELOCITY_MS) {
      return { velocityX: 0, velocityY: 0 }
    }
    return { velocityX: drag.velocityX, velocityY: drag.velocityY }
  }

  /**
   * 指针被浏览器接管（滚动 / 手势中断 / 触屏系统手势）：只收尾拖拽——不写位置记忆、不起惯性。
   * 与 pointerup 分离，避免「取消也被当成一次正常松手」而落盘一个用户没打算要的位置。
   */
  private onPointerCancel = (event: Event): void => {
    const drag = this.endPointerDrag(event)
    if (!drag) return
    this.hideSnapHint()
    this.emit('drag-end', {
      x: this.offsetX,
      y: this.offsetY,
      source: 'pointer',
      phase: 'release',
    } satisfies DragEndDetail)
  }

  /** 收尾一次指针拖拽（up / cancel 共用）：释放捕获、撤拖拽标记，返回本次会话（未越过阈值返回 null） */
  private endPointerDrag(event: Event): PointerDragState | null {
    const ev = event as PointerEvent
    const drag = this.drag
    if (!drag || ev.pointerId !== drag.pointerId) return null
    this.drag = null
    this.releaseCapture(drag.pointerId)
    if (!drag.moved) return null
    this.removeAttribute('data-dragging')
    // 拖拽结束的 click 不应落到子元素（松手恰好停在按钮上会误触）
    this.armClickGuard()
    return drag
  }

  /**
   * 拖拽后抑制紧随的那一次 click：捕获阶段挂在宿主自身（先于任何子元素监听，含插槽内容），
   * `once` + 下一任务自动撤销——真实浏览器里 click 在 pointerup 同一任务内派发，
   * 因此不会吞掉之后用户的正常点击。宿主级而非 document 级：不产生全局监听。
   */
  private armClickGuard(): void {
    this.releaseClickGuard()
    const guard = (event: Event): void => {
      event.stopPropagation()
      event.preventDefault()
      this.releaseClickGuard()
    }
    this.clickGuard = guard
    this.addEventListener('click', guard, { capture: true, once: true })
    setTimeout(() => {
      if (this.clickGuard === guard) this.releaseClickGuard()
    }, 0)
  }

  private releaseClickGuard(): void {
    const guard = this.clickGuard
    if (!guard) return
    this.clickGuard = null
    this.removeEventListener('click', guard, { capture: true })
  }

  private capturePointer(pointerId: number): void {
    try {
      this.setPointerCapture(pointerId)
    } catch {
      /* 指针已释放 / 元素未连接：忽略 */
    }
  }

  private releaseCapture(pointerId?: number): void {
    const id = pointerId ?? this.drag?.pointerId
    if (id === undefined) return
    try {
      this.releasePointerCapture(id)
    } catch {
      /* 未捕获：忽略 */
    }
  }

  // ---------- 惯性 ----------

  /**
   * 惯性滑行：按最后采样速度逐帧衰减（摩擦 0.95/16ms，速度低于阈值即停），边界钳制照常——
   * 触边即截停；真实时长上限 `MAX_COAST_MS` 保证 60 / 120Hz 屏体感一致（帧数只作兜底）。
   * `prefers-reduced-motion: reduce` 下整段降级为瞬停（不请求动画帧）；
   * 收尾时补一次吸附（网格 / 吸附点），让滑行终值同样落在吸附位上。
   */
  private willCoast(velocityX: number, velocityY: number): boolean {
    if (!this.hasAttr('inertia') || this.reducedMotion) return false
    const axis = this.resolveAxis()
    const vx = axis === 'y' ? 0 : velocityX
    const vy = axis === 'x' ? 0 : velocityY
    return Math.hypot(vx, vy) >= MIN_VELOCITY && typeof requestAnimationFrame === 'function'
  }

  private startCoast(velocityX: number, velocityY: number): void {
    if (!this.willCoast(velocityX, velocityY)) return
    const axis = this.resolveAxis()
    let vx = axis === 'y' ? 0 : velocityX
    let vy = axis === 'x' ? 0 : velocityY
    if (Math.hypot(vx, vy) < MIN_VELOCITY) return
    if (typeof requestAnimationFrame !== 'function') return
    let last = 0
    let startAt = 0
    let frames = 0
    this.setAttribute('data-coasting', '')
    const stop = (): void => {
      this.stopCoast()
      // 滑行收尾吸附：终值落在网格 / 吸附点上（补一次 oas-drag 反映终值）
      if (this.applySnap()) this.emit('drag', { x: this.offsetX, y: this.offsetY, source: 'pointer' })
      this.announcePosition()
      this.savePosition()
      this.emit('drag-end', {
        x: this.offsetX,
        y: this.offsetY,
        source: 'pointer',
        phase: 'coast-end',
      } satisfies DragEndDetail)
    }
    const step = (now: number): void => {
      if (startAt === 0) startAt = now
      const dt = last === 0 ? 16 : Math.min(64, now - last)
      last = now
      vx *= INERTIA_DECAY ** (dt / 16)
      vy *= INERTIA_DECAY ** (dt / 16)
      const nextX = this.offsetX + vx * dt
      const nextY = this.offsetY + vy * dt
      const clamped = this.clampOffset(nextX, nextY)
      const hitEdge = clamped.x !== nextX || clamped.y !== nextY
      this.offsetX = clamped.x
      this.offsetY = clamped.y
      this.applyTransform()
      this.emit('drag', { x: this.offsetX, y: this.offsetY, source: 'pointer' })
      frames += 1
      const elapsed = now - startAt
      if (hitEdge || Math.hypot(vx, vy) < MIN_VELOCITY || elapsed >= MAX_COAST_MS || frames >= MAX_COAST_FRAMES) {
        stop()
        return
      }
      this.coastFrame = requestAnimationFrame(step)
    }
    this.coastFrame = requestAnimationFrame(step)
  }

  private stopCoast(): void {
    const active = this.coastFrame !== 0
    if (active && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.coastFrame)
    this.coastFrame = 0
    if (!active) return
    this.removeAttribute('data-coasting')
    // 滑行被新指针 / reset / 断连冻结时补落盘：当前位置是真实发生过的位移，
    // 只记松手时刻的旧值会丢掉滑行已经走过的路程（remember 语义）
    this.savePosition()
  }

  // ---------- 键盘 ----------

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.injectDisabled() || !this.keyboardEnabled()) return
    // 只有焦点在宿主本身或手柄区时才接管方向键（子元素内的输入框保留自身方向键语义）
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    const inHandle = this.hasHandle && path.length > 0 && this.isInHandle(path[0] ?? null)
    if (event.target !== this && !inHandle) return
    const step = event.shiftKey ? KEY_STEP_FAST : KEY_STEP
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowDown') dy = step
    else if (event.key === 'ArrowUp') dy = -step
    else return
    event.preventDefault()
    const axis = this.resolveAxis()
    const nextX = axis === 'y' ? this.offsetX : this.offsetX + dx
    const nextY = axis === 'x' ? this.offsetY : this.offsetY + dy
    const moved = nextX !== this.offsetX || nextY !== this.offsetY
    if (!moved) return
    this.applyOffset(nextX, nextY, 'keyboard')
    this.savePosition()
  }

  // ---------- 方法 ----------

  /** 回到初始位置（位移归零）并清除位置记忆 */
  reset(): void {
    this.stopCoast()
    this.offsetX = 0
    this.offsetY = 0
    this.applyTransform()
    const storage = this.storage()
    if (storage) {
      try {
        storage.removeItem(this.storageKeyOf())
      } catch {
        /* 忽略 */
      }
    }
    this.announcePosition()
    this.emit('drag-end', { x: 0, y: 0, source: 'keyboard', phase: 'release' } satisfies DragEndDetail)
  }
}
