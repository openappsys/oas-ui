import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** 旋钮尺寸档位 */
export type KnobSize = 'sm' | 'md' | 'lg'
/** 手势模型：cursor=圆周跟随方位角 / axis=线性拖拽 / auto=前几像素自动解析（一次锁定） */
export type KnobInteraction = 'cursor' | 'axis' | 'auto'
/** 线性拖拽轴（auto 下作为偏好） */
export type KnobAxis = 'vertical' | 'horizontal'
/** 指示器形态 */
export type KnobIndicator = 'line' | 'dot'

/** 角度约定：0° = 12 点方向，顺时针为正 */
const DEFAULT_START_ANGLE = 225
const DEFAULT_END_ANGLE = 495

/** SVG viewBox 几何（0 0 100 100） */
const R_TRACK = 42
const STROKE_WIDTH = 8

/** 手势：起手移动超过该距离才算有效拖拽（解析手势模式 + 派发 drag-start；无移动点按零操作） */
const DECIDE_PX = 6
/** 线性拖拽灵敏度：拖满全量程的像素距离 */
const AXIS_PX = 150
/** Shift 精调乘子（只做 Shift 一档，加速档不做） */
const FINE_FACTOR = 0.2
/** 连续模式滚轮一格的量程占比（span / 50） */
const WHEEL_DIVISOR = 50
/** 值弧退化判定角差（小于该值视为零弧隐藏，防 round linecap 出圆点） */
const DEGENERATE_DEG = 0.5

function clampNum(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 归一化到 [0, 360) */
function norm360(a: number): number {
  return ((a % 360) + 360) % 360
}

/** 指针相对旋钮中心的方位角（0° = 12 点方向，顺时针为正） */
function angleFromCenter(cx: number, cy: number, x: number, y: number): number {
  const deg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI
  return deg < 0 ? deg + 360 : deg
}

/** 角度 → SVG 坐标（viewBox 中心 50,50，轨道半径 R_TRACK） */
function polar(a: number): [number, number] {
  const rad = ((a - 90) * Math.PI) / 180
  return [round2(50 + R_TRACK * Math.cos(rad)), round2(50 + R_TRACK * Math.sin(rad))]
}

/**
 * 圆弧路径（a1 → a2 顺时针，sweep ∈ (0, 360]）。
 * sweep ≥ 360 时拆两段半圆（SVG 单段 arc 画不了整圆：起终点重合会退化）。
 */
function arcPath(a1: number, a2: number): string {
  const sweep = a2 - a1
  if (sweep <= 0) return ''
  const [x1, y1] = polar(a1)
  if (sweep >= 359.999) {
    const [mx, my] = polar(a1 + 180)
    const [x2, y2] = polar(a1)
    return `M ${x1} ${y1} A ${R_TRACK} ${R_TRACK} 0 1 1 ${mx} ${my} ` + `A ${R_TRACK} ${R_TRACK} 0 1 1 ${x2} ${y2}`
  }
  const large = sweep > 180 ? 1 : 0
  const [x2, y2] = polar(a2)
  return `M ${x1} ${y1} A ${R_TRACK} ${R_TRACK} 0 ${large} 1 ${x2} ${y2}`
}

const STYLE = `
:host {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-2);
  font-family: inherit;
  outline: none;
  /* 尺寸档变量（自定义直径直接覆盖 --oas-knob-size） */
  --oas-knob-size: 56px;
  /* 颜色通道：全部走主题 token（明暗两套自动跟随），任意值可覆盖 */
  --oas-knob-track: var(--oas-color-border);
  --oas-knob-fill: var(--oas-color-primary);
  --oas-knob-body: var(--oas-color-bg-elevated);
  --oas-knob-indicator: var(--oas-color-text-secondary-strong);
  --oas-knob-value-color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none;
}
:host([data-size='sm']) {
  --oas-knob-size: 40px;
}
:host([data-size='lg']) {
  --oas-knob-size: 72px;
}
/* 触控目标下限：sm 档在粗指针设备抬到 44px（--oas-touch-target-min 同级约定） */
@media (pointer: coarse) {
  :host([data-size='sm']) {
    --oas-knob-size: 44px;
  }
}
:host([data-disabled]) {
  opacity: 0.6;
}
.frame {
  box-sizing: border-box;
  width: var(--oas-knob-size);
  height: var(--oas-knob-size);
  border-radius: 50%;
  /* 触屏拖拽接管：阻止浏览器把手势解释为滚动/缩放 */
  touch-action: none;
  cursor: pointer;
}
:host([data-readonly]) .frame {
  cursor: default;
}
:host([data-disabled]) .frame {
  cursor: not-allowed;
}
:host(:focus-visible) .frame {
  box-shadow: var(--oas-focus-ring);
}
.dial {
  display: block;
  width: 100%;
  height: 100%;
}
.track {
  fill: none;
  stroke: var(--oas-knob-track);
  stroke-width: ${STROKE_WIDTH};
  stroke-linecap: round;
}
.fill {
  fill: none;
  stroke: var(--oas-knob-fill);
  stroke-width: ${STROKE_WIDTH};
  stroke-linecap: round;
}
/* [hidden] 兜底：author display 规则不得压过隐藏（同类保护惯例） */
.fill[hidden] {
  display: none;
}
.body {
  fill: var(--oas-knob-body);
}
.indicator {
  stroke: var(--oas-knob-indicator);
  stroke-width: 3;
  stroke-linecap: round;
}
.dot {
  fill: var(--oas-knob-indicator);
}
:host([data-indicator='dot']) .indicator {
  display: none;
}
:host([data-indicator='line']) .dot {
  display: none;
}
/* hover 反馈只在支持 hover 的设备生效（触屏 :hover 粘滞防护，同 slider 惯例）；
   readonly/disabled 不给交互暗示 */
@media (hover: hover) {
  :host(:not([data-readonly]):not([data-disabled])) .frame:hover .indicator {
    stroke-width: 4;
  }
}
.value {
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  color: var(--oas-knob-value-color);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.value[hidden] {
  display: none;
}
`

/** 拖拽手势状态（null = 未在拖） */
interface DragState {
  pointerId: number
  /** 按下点（起手判定基准） */
  startX: number
  startY: number
  /** 旋钮中心（按下时锁定，拖拽中不随布局变化） */
  cx: number
  cy: number
  lastX: number
  lastY: number
  /** 圆周模式的上一次方位角 */
  lastAngle: number
  startValue: number
  /** 拖拽中的原始浮点值（step 吸附只作用于显示/事件） */
  dragValue: number
  lastShown: number
  /** 手势模式：解析后一次锁定（中途切换会跳值） */
  mode: 'circular' | 'vertical' | 'horizontal' | null
  /** 是否已发生有效移动（无移动点按零操作） */
  moved: boolean
}

export class OASKnob extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'min',
      'max',
      'step',
      'start-angle',
      'end-angle',
      'size',
      'interaction',
      'axis',
      'indicator',
      'include-arc',
      'start-point',
      'show-value',
      'unit',
      'format',
      'disabled',
      'readonly',
      'reverse',
      'large-step',
      'label',
      'default-value',
      'wheel',
    ]
  }

  /**
   * @apiProperty 当前值（受控）：读返回钳制/吸附后的数值（拖拽中返回拖拽实时值）；
   * 写为受控赋值即生效语义——写受控 `value` 属性并强制同步，不派发任何事件。
   */
  get value(): number {
    return this.displayValue()
  }
  set value(v: number) {
    const n = Number(v)
    this.setAttribute('value', String(Number.isFinite(n) ? n : 0))
    if (this.hasRendered) this.update()
  }

  /**
   * @apiProperty 复位目标值：读 `default-value` 属性（未设返回 null = 回落 min）；
   * 写数值反射到属性，写 null 清除属性。
   */
  get defaultValue(): number | null {
    const raw = this.getAttr('default-value', '')
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  set defaultValue(v: number | null) {
    if (v == null || !Number.isFinite(Number(v))) this.removeAttribute('default-value')
    else this.setAttribute('default-value', String(Number(v)))
    if (this.hasRendered) this.update()
  }

  /** 值格式化函数（JS property 通道，优先于 format 模板串 / unit 后缀）：输出同时进值文本与 aria-valuetext */
  private _formatValue: ((value: number) => string | number | null | undefined) | null = null

  /**
   * @apiProperty 值格式化函数：`el.formatValue = (value) => string`，优先级高于 `format` 属性与
   * `unit` 后缀；置 null 清除。输出同时进 show-value 值文本与 `aria-valuetext`（读屏同源）。
   */
  get formatValue(): ((value: number) => string | number | null | undefined) | null {
    return this._formatValue
  }
  set formatValue(fn: ((value: number) => string | number | null | undefined) | null) {
    this._formatValue = typeof fn === 'function' ? fn : null
    if (this.hasRendered) this.update()
  }

  private frame: HTMLElement | null = null
  private drag: DragState | null = null

  // ---------- 事件处理器（实例字段箭头函数：add/removeEventListener 引用稳定） ----------

  private readonly onPointerDown = (e: Event): void => {
    const pe = e as PointerEvent
    if (this.injectDisabled()) return
    if (this.hasAttr('readonly')) {
      // 只读拦截：不启动手势（可聚焦、事件不冒泡破坏原生行为）
      pe.preventDefault()
      return
    }
    // 鼠标非主键不接管（右键等原生行为保留）；已有人在拖则主指针独占——
    // 第二指针整体忽略（含 Ctrl 复位意图：拖拽中的复位手势一律不打断进行中手势）
    if (pe.pointerType === 'mouse' && pe.button !== 0) return
    if (this.drag) return
    // Ctrl/Cmd + 单击 = 复位默认值（专业音频惯例，与拖拽互斥）
    if (pe.ctrlKey || pe.metaKey) {
      pe.preventDefault()
      this.applyReset()
      return
    }
    const rect = this.frame?.getBoundingClientRect()
    // 无布局尺寸（hidden / 未挂载）不启动手势
    if (!rect || !rect.width || !rect.height) return
    const startX = pe.clientX
    const startY = pe.clientY
    this.drag = {
      pointerId: pe.pointerId,
      startX,
      startY,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      lastX: startX,
      lastY: startY,
      lastAngle: angleFromCenter(rect.left + rect.width / 2, rect.top + rect.height / 2, startX, startY),
      startValue: this.displayValue(),
      dragValue: this.displayValue(),
      lastShown: this.displayValue(),
      mode: null,
      moved: false,
    }
    try {
      this.frame?.setPointerCapture(pe.pointerId)
    } catch {
      /* 捕获失败（指针已释放等）不阻断手势 */
    }
    this.frame?.addEventListener('pointermove', this.onPointerMove)
    this.frame?.addEventListener('pointerup', this.onPointerFinish)
    this.frame?.addEventListener('pointercancel', this.onPointerFinish)
    this.frame?.addEventListener('lostpointercapture', this.onCaptureLost)
  }

  private readonly onPointerMove = (e: Event): void => {
    const pe = e as PointerEvent
    const d = this.drag
    if (!d || pe.pointerId !== d.pointerId) return
    if (!d.moved) {
      // 起手判定：按下点起的累计位移达阈值才视为有效拖拽（解析手势模式 + 派发 drag-start）
      const totalDx = pe.clientX - d.startX
      const totalDy = pe.clientY - d.startY
      if (Math.hypot(totalDx, totalDy) < DECIDE_PX) return
      d.moved = true
      d.mode = this.resolveMode(totalDx, totalDy)
      this.emit('drag-start', { value: d.startValue })
    }
    this.applyPointerDelta(pe, pe.clientX - d.lastX, pe.clientY - d.lastY)
  }

  private readonly onPointerFinish = (e: Event): void => {
    this.finishDrag(e as PointerEvent, e.type === 'pointercancel')
  }

  private readonly onCaptureLost = (): void => {
    // 指针捕获被外部夺走：后续 move/up 不再到达本元素，走取消路径防僵尸拖拽
    if (this.drag) this.finishDrag(null, true)
  }

  private readonly onDblClick = (): void => {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    // 拖拽进行中的双击（多指误触）忽略——复位手势不打断进行中的拖拽
    if (this.drag) return
    this.applyReset()
  }

  private readonly onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent
    // Esc 取消拖拽：回滚到起点值（零提交取消路径）
    if (ke.key === 'Escape' && this.drag) {
      ke.preventDefault()
      this.finishDrag(null, true)
      return
    }
    if (this.injectDisabled()) return
    const key = ke.key
    const isArrow = key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
    const isPage = key === 'PageUp' || key === 'PageDown'
    const isBound = key === 'Home' || key === 'End'
    if (!isArrow && !isPage && !isBound) return
    if (this.hasAttr('readonly')) {
      // 只读：拦截一切值键（保留可聚焦）
      ke.preventDefault()
      return
    }
    ke.preventDefault()
    const [min, max] = this.bounds()
    if (key === 'Home') {
      this.applyValue(min)
      return
    }
    if (key === 'End') {
      this.applyValue(max)
      return
    }
    const step = this.stepSize()
    const amount = isPage || (isArrow && ke.shiftKey) ? this.largeStep(step) : step
    this.applyValue(this.displayValue() + this.keySign(key) * amount)
  }

  private readonly onWheel = (e: Event): void => {
    // 滚轮调节默认关闭（wheel 属性显式开启）；readonly/disabled 全封
    if (!this.hasAttr('wheel')) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const we = e as WheelEvent
    // 横向触控板平移（仅 deltaX、deltaY=0）不调值、不抢占滚动
    if (we.deltaY === 0) return
    we.preventDefault()
    const [min, max] = this.bounds()
    const span = max - min || 1
    const step = this.stepSize()
    const unit = step > 0 ? step : span / WHEEL_DIVISOR
    const fine = we.shiftKey ? FINE_FACTOR : 1
    const dir = we.deltaY < 0 ? 1 : -1
    this.applyValue(this.displayValue() + dir * unit * fine)
  }

  // ---------- 生命周期 ----------

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="frame" part="frame">
        <svg class="dial" part="dial" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path class="track" part="track" d=""></path>
          <path class="fill" part="fill" d="" hidden></path>
          <circle class="body" part="knob" cx="50" cy="50" r="30"></circle>
          <g class="pointer" transform="rotate(0 50 50)">
            <line class="indicator" part="indicator" x1="50" y1="36" x2="50" y2="20"></line>
            <circle class="dot" part="indicator" cx="50" cy="24" r="4"></circle>
          </g>
        </svg>
      </div>
      <div class="value" part="value" hidden></div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；拖拽级监听在 pointerdown 时挂） */
  private bind(): void {
    this.frame = this.shadow.querySelector<HTMLElement>('[part="frame"]')
    this.frame?.addEventListener('pointerdown', this.onPointerDown)
    this.frame?.addEventListener('dblclick', this.onDblClick)
    // 键盘与滚轮挂宿主（宿主即 role=slider 焦点元素）
    this.addEventListener('keydown', this.onKeyDown)
    this.addEventListener('wheel', this.onWheel, { passive: false })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（frame 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="frame"]')) return false
    this.bind()
    return true
  }

  /** 拖拽中摘除：走取消路径（回滚起点值、零提交），避免残留 drag 状态阻塞重连后的新手势 */
  override disconnectedCallback(): void {
    if (this.drag) this.finishDrag(null, true)
    super.disconnectedCallback()
  }

  protected override update(): void {
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    // 拖拽中变为禁用/只读：终止手势并回滚起点值（取消路径零提交；finishDrag 先清 drag 再 update，不会递归）
    if (this.drag && (disabled || readonly)) this.finishDrag(null, true)
    // 宿主状态镜像（data-* 非 observed 属性，写入不触发 attributeChangedCallback 循环）
    this.toggleAttribute('data-disabled', disabled)
    this.toggleAttribute('data-readonly', readonly)
    this.setAttribute('data-size', this.normalizeSize())
    this.setAttribute('data-indicator', this.getAttr('indicator', '') === 'dot' ? 'dot' : 'line')

    // ARIA：宿主元素即 slider 角色（role + 值域 + 可访问名）
    this.setAttribute('role', 'slider')
    if (disabled) {
      this.removeAttribute('tabindex')
      this.setAttribute('aria-disabled', 'true')
    } else {
      this.setAttribute('tabindex', '0')
      this.removeAttribute('aria-disabled')
    }
    if (readonly) this.setAttribute('aria-readonly', 'true')
    else this.removeAttribute('aria-readonly')
    const label = this.getAttr('label', '')
    this.setAttribute('aria-label', label || this.t('knob.valueLabel'))

    const [min, max] = this.bounds()
    this.setAttribute('aria-valuemin', String(min))
    this.setAttribute('aria-valuemax', String(max))
    const v = this.displayValue()
    this.setAttribute('aria-valuenow', String(v))
    if (this.hasFormatter()) this.setAttribute('aria-valuetext', this.formatNumber(v))
    else this.removeAttribute('aria-valuetext')

    // 几何同步：轨道弧 / 值弧 / 指示器旋转
    const mirror = this.mirrored()
    const [start, end] = this.sweepRange()
    const angle = this.angleOf(v, mirror)
    const pointer = this.shadow.querySelector<SVGGElement>('.pointer')
    if (pointer) {
      pointer.setAttribute('transform', `rotate(${round2(angle)} 50 50)`)
      pointer.setAttribute('data-angle', String(round2(norm360(angle))))
    }
    const track = this.shadow.querySelector<SVGPathElement>('[part="track"]')
    if (track) track.setAttribute('d', arcPath(start, end))
    const fill = this.shadow.querySelector<SVGPathElement>('[part="fill"]')
    if (fill) {
      // hidden 走属性 + 显式 CSS（[hidden] 兜底），不依赖 SVGElement 的 hidden property（跨引擎差异）
      if (!this.hasAttr('include-arc')) {
        fill.setAttribute('hidden', '')
      } else {
        const a1 = this.angleOf(this.startPointValue(min, max), mirror)
        const lo = Math.min(a1, angle)
        const hi = Math.max(a1, angle)
        if (hi - lo < DEGENERATE_DEG) {
          // 零弧隐藏：round linecap 会把零长弧画成圆点
          fill.setAttribute('hidden', '')
        } else {
          fill.removeAttribute('hidden')
          fill.setAttribute('d', arcPath(lo, hi))
          fill.setAttribute('data-from', String(round2(norm360(lo))))
          fill.setAttribute('data-to', String(round2(norm360(hi))))
        }
      }
    }

    // 值文本（show-value）
    const valueEl = this.shadow.querySelector<HTMLElement>('[part="value"]')
    if (valueEl) {
      if (this.hasAttr('show-value')) {
        valueEl.hidden = false
        valueEl.textContent = this.formatNumber(v)
      } else {
        valueEl.hidden = true
      }
    }
  }

  // ---------- 数值与几何 ----------

  /** 值域：非法/min>max 容错（交换），span 为 0 时退化为 1 防除零 */
  private bounds(): [number, number] {
    let min = Number(this.getAttr('min', '0'))
    let max = Number(this.getAttr('max', '100'))
    if (!Number.isFinite(min)) min = 0
    if (!Number.isFinite(max)) max = 100
    if (min > max) [min, max] = [max, min]
    return [min, max]
  }

  /** step 吸附步长：0/负数/非法视为连续（不吸附） */
  private stepSize(): number {
    const n = Number(this.getAttr('step', '1'))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  /** 键盘大步（Shift+方向 / PageUp·Down）：显式 large-step 优先，缺省 10×step（连续模式 span/10） */
  private largeStep(step: number): number {
    const raw = this.getAttr('large-step', '')
    if (raw !== '') {
      const n = Number(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
    if (step > 0) return step * 10
    const [min, max] = this.bounds()
    return (max - min || 1) / 10
  }

  /** 扫角归一：end<=start 给最小 1°（防除零），sweep 上限 360（多圈渲染延后） */
  private sweepRange(): [number, number] {
    let start = Number(this.getAttr('start-angle', String(DEFAULT_START_ANGLE)))
    let end = Number(this.getAttr('end-angle', String(DEFAULT_END_ANGLE)))
    if (!Number.isFinite(start)) start = DEFAULT_START_ANGLE
    if (!Number.isFinite(end)) end = DEFAULT_END_ANGLE
    if (end - start <= 0) end = start + 1
    else if (end - start > 360) end = start + 360
    return [start, end]
  }

  /** 视觉镜像：reverse 属性 XOR RTL 书写方向（值扫描与圆周手势同步镜像） */
  private mirrored(): boolean {
    return this.hasAttr('reverse') !== isRtl(this)
  }

  /** 值 → 扫角内的角度（mirror 时从 end 端反向映射） */
  private angleOf(v: number, mirror: boolean): number {
    const [min, max] = this.bounds()
    const span = max - min || 1
    const [start, end] = this.sweepRange()
    const t = clampNum((v - min) / span, 0, 1)
    return mirror ? end - t * (end - start) : start + t * (end - start)
  }

  /** start-point（值弧起点）：缺省/非法回落 min；夹取到值域 */
  private startPointValue(min: number, max: number): number {
    const raw = this.getAttr('start-point', '')
    if (raw === '') return min
    const n = Number(raw)
    if (!Number.isFinite(n)) return min
    return clampNum(n, min, max)
  }

  /** 复位目标：default-value 属性（吸附+夹取），缺省回落 min */
  private resolveDefaultValue(): number {
    const [min, max] = this.bounds()
    const raw = this.getAttr('default-value', '')
    if (raw === '') return min
    const n = Number(raw)
    if (!Number.isFinite(n)) return min
    return this.snapNum(n)
  }

  /** 当前显示值：拖拽中取拖拽实时值（吸附后），否则读受控属性（夹取+吸附） */
  private displayValue(): number {
    if (this.drag) return this.snapNum(this.drag.dragValue)
    const raw = Number(this.getAttr('value', '0'))
    return this.snapNum(Number.isFinite(raw) ? raw : 0)
  }

  /** 吸附 + 夹取（浮点尘埃 4 位舍入） */
  private snapNum(v: number): number {
    const [min, max] = this.bounds()
    const step = this.stepSize()
    let out = Number.isFinite(v) ? v : min
    if (step > 0) out = min + Math.round((out - min) / step) * step
    out = clampNum(out, min, max)
    return Math.round(out * 10000) / 10000
  }

  // ---------- 格式化 ----------

  /** 格式化值（show-value 文本 + aria-valuetext 双通道）：函数 property > format 模板串 > unit 后缀 > 裸数字 */
  private formatNumber(v: number): string {
    const fn = this._formatValue
    if (typeof fn === 'function') {
      try {
        const r = fn(v)
        if (r != null) return String(r)
      } catch {
        /* 宿主格式化函数抛错：降级到下一通道（format 模板 / unit 后缀 / 裸数字），渲染与手势不中断 */
      }
    }
    const tpl = this.getAttr('format', '')
    if (tpl) return tpl.replaceAll('${value}', String(v))
    const unit = this.getAttr('unit', '')
    if (unit) return `${v}${unit}`
    return String(v)
  }

  private hasFormatter(): boolean {
    return (
      typeof this._formatValue === 'function' || this.getAttr('format', '') !== '' || this.getAttr('unit', '') !== ''
    )
  }

  // ---------- 手势 ----------

  /**
   * 手势模式解析（起手阈值处判定一次并锁定，拖拽中途不再切换——中途切换会跳值）：
   * cursor → 圆周；axis → 配置轴；auto → 主方向与偏好轴一致走线性、垂直于偏好轴走圆周。
   */
  private resolveMode(totalDx: number, totalDy: number): DragState['mode'] {
    const mode = this.interactionMode()
    if (mode === 'cursor') return 'circular'
    const horizontal = this.axisMode() === 'horizontal'
    if (mode === 'axis') return horizontal ? 'horizontal' : 'vertical'
    const horizontalDominant = Math.abs(totalDx) >= Math.abs(totalDy)
    if (horizontalDominant === horizontal) return horizontal ? 'horizontal' : 'vertical'
    return 'circular'
  }

  private interactionMode(): KnobInteraction {
    const raw = this.getAttr('interaction', 'auto')
    return raw === 'cursor' || raw === 'axis' ? raw : 'auto'
  }

  private axisMode(): KnobAxis {
    return this.getAttr('axis', '') === 'horizontal' ? 'horizontal' : 'vertical'
  }

  /** 单次 move 的增量应用（圆周方位角增量 / 线性轴向增量 → 值增量） */
  private applyPointerDelta(pe: PointerEvent, dx: number, dy: number): void {
    const d = this.drag
    if (!d) return
    const [min, max] = this.bounds()
    const span = max - min || 1
    const fine = pe.shiftKey ? FINE_FACTOR : 1
    let delta = 0
    if (d.mode === 'circular') {
      const a = angleFromCenter(d.cx, d.cy, pe.clientX, pe.clientY)
      let da = a - d.lastAngle
      // 跨 ±180° 边界按最短路径解析（不绕圈跳变）
      if (da > 180) da -= 360
      else if (da < -180) da += 360
      d.lastAngle = a
      if (this.mirrored()) da = -da
      const [start, end] = this.sweepRange()
      delta = (da / (end - start || 360)) * span * fine
    } else if (d.mode === 'vertical') {
      // 竖直向上拖增值（下滑减值）
      delta = (-dy / AXIS_PX) * span * fine
    } else if (d.mode === 'horizontal') {
      let ax = dx
      if (this.mirrored()) ax = -ax
      delta = (ax / AXIS_PX) * span * fine
    }
    d.lastX = pe.clientX
    d.lastY = pe.clientY
    if (delta === 0) return
    d.dragValue = clampNum(d.dragValue + delta, min, max)
    const shown = this.snapNum(d.dragValue)
    if (shown !== d.lastShown) {
      d.lastShown = shown
      // 拖拽实时写回受控属性（宿主可随时 getAttribute 读最新值），同步显示并派发实时事件
      this.setAttribute('value', String(shown))
      this.update()
      this.emit('input', { value: shown })
    }
  }

  /**
   * 拖拽收口（pointerup / pointercancel / Esc）：
   * - 无有效移动：零操作（不派发 drag-end/change）
   * - 取消（cancel/Esc）：回滚到起点值，drag-end cancelled=true，不派发 change
   * - 正常松手且值已变化：最终值落盘 + drag-end + change（提交一次）
   * - 正常松手但值未变化：不提交（拖拽中外部写入的受控值得以保留）
   */
  private finishDrag(pe: PointerEvent | null, cancelled: boolean): void {
    const d = this.drag
    if (!d) return
    if (pe && pe.pointerId !== d.pointerId) return
    this.drag = null
    this.frame?.removeEventListener('pointermove', this.onPointerMove)
    this.frame?.removeEventListener('pointerup', this.onPointerFinish)
    this.frame?.removeEventListener('pointercancel', this.onPointerFinish)
    this.frame?.removeEventListener('lostpointercapture', this.onCaptureLost)
    if (pe) {
      try {
        this.frame?.releasePointerCapture(pe.pointerId)
      } catch {
        /* 已释放 */
      }
    }
    if (!d.moved) {
      this.update()
      return
    }
    if (cancelled) {
      this.setAttribute('value', String(d.startValue))
      this.update()
      this.emit('drag-end', { value: d.startValue, cancelled: true })
      return
    }
    const shown = this.snapNum(d.dragValue)
    if (shown !== d.startValue) {
      this.setAttribute('value', String(shown))
      this.update()
      this.emit('drag-end', { value: shown, cancelled: false })
      this.emit('change', { value: shown })
    } else {
      this.update()
      this.emit('drag-end', { value: shown, cancelled: false })
    }
  }

  // ---------- 键盘方向 ----------

  /** 键 → 值方向：上下键保持值语义（上键从不反转）；左右键随视觉镜像翻转（reverse XOR RTL） */
  private keySign(key: string): number {
    let sign = 0
    if (key === 'ArrowRight' || key === 'ArrowUp' || key === 'PageUp') sign = 1
    else if (key === 'ArrowLeft' || key === 'ArrowDown' || key === 'PageDown') sign = -1
    if ((key === 'ArrowRight' || key === 'ArrowLeft') && this.mirrored()) sign = -sign
    return sign
  }

  /** 键盘/滚轮改值（每次按键即一次完整确认）：夹取吸附 → 同步 → 派发 input + change；值不变则安静 */
  private applyValue(next: number): void {
    const v = this.snapNum(next)
    if (v === this.displayValue()) return
    this.setAttribute('value', String(v))
    this.update()
    const detail = { value: v }
    this.emit('input', detail)
    this.emit('change', detail)
  }

  // ---------- 复位 ----------

  /** 复位到 default-value（缺省 min）：派发 oas-reset（不派发 change——复位不是一次数值确认） */
  private applyReset(): void {
    // 拖拽中复位（程序 reset() 等路径）：先走取消路径终止手势（回滚零提交），再落复位值
    if (this.drag) this.finishDrag(null, true)
    const target = this.resolveDefaultValue()
    this.setAttribute('value', String(target))
    this.update()
    this.emit('reset', { value: target, defaultValue: target })
  }

  // ---------- 公共方法 ----------

  /** 复位到默认值（default-value 缺省 min），派发 oas-reset */
  reset(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.applyReset()
  }

  /** 按 step 步进一格（等价方向键） */
  stepUp(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.applyValue(this.displayValue() + this.stepSize())
  }

  /** 按 step 回退一格（等价方向键） */
  stepDown(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.applyValue(this.displayValue() - this.stepSize())
  }

  /** size 三档归一：接受 sm/md/lg 与 small/medium/large 两套词表（config-provider 注入同构），非法回落 md */
  private normalizeSize(): KnobSize {
    const raw = this.injectValue('size', 'medium').toLowerCase()
    if (raw === 'sm' || raw === 'small') return 'sm'
    if (raw === 'lg' || raw === 'large') return 'lg'
    return 'md'
  }
}
