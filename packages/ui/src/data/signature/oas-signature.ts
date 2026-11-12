import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

const STYLE = `
:host {
  display: block;
}
:host([hidden]) {
  display: none !important;
}
.pad {
  position: relative;
  width: 100%;
}
canvas {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  /* 笔画手势独占：禁掉浏览器默认平移/缩放，交由 pointer 事件捕获 */
  touch-action: none;
  cursor: crosshair;
}
:host([disabled]) canvas,
:host([readonly]) canvas {
  cursor: default;
}
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  pointer-events: none;
  user-select: none;
}
.clear {
  appearance: none;
  position: absolute;
  top: var(--oas-space-2);
  right: var(--oas-space-2);
  margin: 0;
  padding: var(--oas-space-1) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  line-height: 1.5;
  cursor: pointer;
}
.clear:hover {
  color: var(--oas-color-text-primary);
}
.clear:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
/* 视觉隐藏但可被屏幕阅读器播报的状态区 */
.sr-status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (forced-colors: active) {
  /* 强制色决策（立项评审）：canvas 笔迹不可被系统换色（canvas 像素不进强制色映射），
     v1 不做 DOM 描边副本；签名区 1px 边框（常规态已带）保障边界可见。
     强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .clear:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

/** 颜色属性统一协议（ui-spec §4.1）的预设名 */
const PRESET_COLORS = new Set([
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
])

/** 笔迹点：归一化坐标（0–1，相对画布 CSS 尺寸），resize 后按比例重映射，笔迹不丢 */
interface StrokePoint {
  x: number
  y: number
}

interface Stroke {
  points: StrokePoint[]
}

/** 数字归一：非法/越界回退缺省（与 watermark normalizeNumber 同口径） */
function normalizeNumber(raw: string, fallback: number, min = 0): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < min) return fallback
  return n
}

/** canvas 2d 可用性检测：SSR（无 document）与无 canvas 实现的环境（如 happy-dom）返回 false */
function canvasAvailable(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return document.createElement('canvas').getContext('2d') != null
  } catch {
    return false
  }
}

/** 当前环境 DPR（高清屏 canvas 尺寸倍率），异常回退 1 */
function devicePixelRatioOf(): number {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1
}

/**
 * oas-signature —— canvas 签名板。
 *
 * 属性（kebab-case）：
 * - `value`：签名图像（PNG dataURL）。输出通道：笔画结束自动写入；输入通道：宿主写入
 *   时清空笔迹并加载外部图像（受控闭环——回写组件刚派发的值不触发清空）
 * - `pen-size`：笔迹粗细（px，默认 2，非法回退）
 * - `pen-color`：笔迹颜色（11 预设名走 --oas-preset-* token 含 dark 变体，或任意 CSS 色值；
 *   缺省 var(--oas-color-text-primary) 跟随主题，主题切换自动重解析重绘）
 * - `height`：画布高度（px，默认 160；宽度随宿主 100%），非法回退
 * - `disabled` / `readonly`：在场拦截笔画（readonly 保留既有笔迹展示）
 * - `clearable`：在场显示清空按钮（disabled/readonly 时按钮置灰）
 *
 * 方法：`clear()`（清空画布 + 归空 value + 派发 oas-change，幂等不重复）；
 * `toDataURL()`（当前画布 PNG dataURL；空画布返回空串）。
 *
 * 事件：`oas-change`（detail `{ value }`）——笔画结束（pointerup）或 clear() 派发，
 * 同值指纹不重复。
 *
 * 实现：数据层（归一化笔迹序列）与绘制层（canvas 2d 命令）分离——resize 以归一化坐标
 * 重采样重绘，笔迹保留；DPR 高清（canvas 尺寸 ×DPR + setTransform）；canvas 不可用的
 * 环境（SSR/测试）数据层照常工作、不产生图像值。SSR：template() 纯字符串确定性骨架，
 * hydrate() 结构校验后真水合接管（不进 SSR 白名单，见 packages/ssr 登记）。
 */
export class OASSignature extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'pen-size', 'pen-color', 'height', 'disabled', 'readonly', 'clearable']
  }

  /** 已落定的笔迹（归一化坐标）；进行中的笔画在 drawing，落定后才进 strokes */
  private strokes: Stroke[] = []
  private drawing: Stroke | null = null
  /** 组件自身最近一次写入 value 属性的值（区分「自家回写」与「宿主受控写入」） */
  private lastWrittenValue = ''
  /** 最近一次派发的 value 指纹（oas-change 幂等去重） */
  private lastEmittedValue: string | null = null
  /** 上一次绘制签名：笔迹/颜色/尺寸/DPR 一致则跳过重绘 */
  private paintKey = ''
  /** 外部图像加载序号：过期回调直接丢弃（防乱序覆盖） */
  private imageSeq = 0
  /** 画布上当前展示的是外部图像（toDataURL/clear 的判空依据之一） */
  private hasExternalImage = false
  /** 容器 resize 观察：尺寸变化按归一化坐标重采样重绘 */
  private resizeObserver: ResizeObserver | null = null
  /** 主题观察：html class/data-theme 变化时重解析 token 笔色并重绘 */
  private themeObserver: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="pad" part="pad">
        <canvas part="canvas" role="img" aria-label=""></canvas>
        <span class="placeholder" part="placeholder"></span>
        <button class="clear" part="clear-button" type="button" hidden></button>
        <span class="sr-status" aria-live="polite"></span>
      </div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（canvas/清空按钮骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('canvas')) return false
    if (!this.shadow.querySelector('[part="clear-button"]')) return false
    this.bind()
    return true
  }

  /** 断开重连：监听经 cleanup 摘除后由本钩子幂等恢复 */
  protected override onReconnect(): void {
    this.bind()
  }

  override disconnectedCallback(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.themeObserver?.disconnect()
    this.themeObserver = null
    super.disconnectedCallback()
  }

  /** 画布/按钮监听只绑一次（断开重连不累积）；观察者每次 bind 重挂（断开时被清理） */
  private listenersBound = false
  /** 进行中笔画的 pointerId：第二指/手掌的 move/up 一律过滤，防坐标污染首笔（多指独占） */
  private activePointerId: number | null = null

  /**
   * 绑定事件与观察者（render/水合/重连共用）。
   * 监听以成员 handler 引用只绑一次——addEventListener 对同一引用去重，重连重复 bind 不累积；
   * 观察者（ResizeObserver/MutationObserver）在断开连接时被清理，每次 bind 先断后挂（幂等重入）。
   */
  private bind(): void {
    if (!this.listenersBound) {
      this.listenersBound = true
      const canvas = this.canvasEl()
      if (canvas) {
        canvas.addEventListener('pointerdown', this.handlePointerDown)
        canvas.addEventListener('pointermove', this.handlePointerMove)
        canvas.addEventListener('pointerup', this.handlePointerUp)
        canvas.addEventListener('pointercancel', this.handlePointerUp)
      }
      const btn = this.clearBtnEl()
      if (btn) btn.addEventListener('click', this.handleClearClick)
    }
    this.watchResize()
    this.watchTheme()
  }

  /** 成员 handler 引用（addEventListener 去重的基石；每次新建箭头引用则重连必然累积） */
  private handlePointerDown = (e: Event): void => this.onPointerDown(e as PointerEvent)
  private handlePointerMove = (e: Event): void => this.onPointerMove(e as PointerEvent)
  private handlePointerUp = (e: Event): void => this.onPointerUp(e as PointerEvent)
  private handleClearClick = (): void => {
    const btn = this.clearBtnEl()
    if (btn?.disabled) return
    this.clear()
  }

  /* ---------------- 笔迹数据层 ---------------- */

  private canvasEl(): HTMLCanvasElement | null {
    return this.shadow.querySelector<HTMLCanvasElement>('canvas')
  }

  private clearBtnEl(): HTMLButtonElement | null {
    return this.shadow.querySelector<HTMLButtonElement>('[part="clear-button"]')
  }

  /** 生效禁用态（含 config-provider 注入禁用） */
  private isDisabled(): boolean {
    return this.injectDisabled()
  }

  private isReadonly(): boolean {
    return this.hasAttr('readonly')
  }

  /** 事件坐标 → 归一化笔迹点（相对画布 CSS 尺寸；尺寸未知时返回 null） */
  private pointOf(e: PointerEvent): StrokePoint | null {
    const canvas = this.canvasEl()
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
  }

  private onPointerDown(e: PointerEvent): void {
    // 鼠标只认主键；disabled/readonly 在场语义拦截笔画
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (this.isDisabled() || this.isReadonly()) return
    if (this.drawing) return // 单笔画独占：第二指忽略（首指 capture 已兜底）
    const p = this.pointOf(e)
    if (!p) return
    e.preventDefault()
    try {
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    } catch {
      // 环境不支持 pointer capture（测试/旧 UA）：move/up 仍挂在画布上，笔画可用
    }
    this.drawing = { points: [p] }
    this.activePointerId = e.pointerId
  }

  private onPointerMove(e: PointerEvent): void {
    // 只认首指：第二指/手掌的 move 不污染进行中笔画
    if (!this.drawing || e.pointerId !== this.activePointerId) return
    const p = this.pointOf(e)
    if (!p) return
    const pts = this.drawing.points
    const last = pts[pts.length - 1]!
    // 重复点（无位移的 move 噪声）不入列，指纹稳定
    if (p.x === last.x && p.y === last.y) return
    pts.push(p)
    this.paintSegment(pts[pts.length - 2]!, p)
  }

  /** 笔画收尾（pointerup / pointercancel 共用）：落定笔迹 → 产出 value → 幂等派发 */
  private onPointerUp(e: PointerEvent): void {
    // 只认首指：第二指的 up 不收尾首笔
    if (!this.drawing || e.pointerId !== this.activePointerId) return
    this.activePointerId = null
    const p = this.pointOf(e)
    const stroke = this.drawing
    this.drawing = null
    if (p) {
      const last = stroke.points[stroke.points.length - 1]!
      if (p.x !== last.x || p.y !== last.y) stroke.points.push(p)
    }
    // 单击（无位移单点）未成笔：不入列、不派发——否则空 PNG 配上「已签名」是隐形状态
    if (stroke.points.length < 2) return
    this.strokes.push(stroke)
    this.hasExternalImage = false
    this.syncDerived()
    this.produceValue()
  }

  /* ---------------- 绘制层 ---------------- */

  /** 笔迹颜色（CSS 层）：缺省主题主文字色；预设名走 --oas-preset-*（含 dark 变体） */
  private penColorCss(): string {
    const v = this.getAttr('pen-color', '').trim()
    if (!v) return 'var(--oas-color-text-primary)'
    if (PRESET_COLORS.has(v)) return `var(--oas-preset-${v})`
    return v
  }

  /**
   * 解析笔色供 canvas 绘制（canvas 2d API 不认 CSS 变量）：先把 token/色值挂到画布
   * color 上再读 getComputedStyle 解析实色；无 CSS 级联环境（happy-dom）回退实色——
   * 与 watermark textTileCanvas 的 color ?? 'black' 同先例（canvas API 层面回退，非样式硬编码）
   */
  private resolvedPenColor(): string {
    const canvas = this.canvasEl()
    if (!canvas) return 'black'
    try {
      canvas.style.color = this.penColorCss()
      const resolved = getComputedStyle(canvas).color
      if (resolved) return resolved
    } catch {
      // 无 getComputedStyle 环境：走回退
    }
    return 'black'
  }

  private penSize(): number {
    return normalizeNumber(this.getAttr('pen-size', '2'), 2, 1)
  }

  /** 画布 CSS 尺寸（getBoundingClientRect 优先；无排版环境返回 null，绘制跳过） */
  private canvasSize(): { width: number; height: number } | null {
    const canvas = this.canvasEl()
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return { width: rect.width, height: rect.height }
  }

  /** 全量重绘：签名一致（笔迹/颜色/尺寸/DPR）跳过重绘；canvas 不可用静默跳过 */
  private repaint(): void {
    const size = this.canvasSize()
    if (!size) return
    const color = this.resolvedPenColor()
    const dpr = devicePixelRatioOf()
    const key = JSON.stringify([this.strokes, color, this.penSize(), size, dpr])
    if (key === this.paintKey) return
    const ctx = this.paintContext(size, dpr)
    if (!ctx) return
    this.paintKey = key
    this.paintAll(ctx, size)
  }

  /** 画布 backing store 尺寸 + 变换初始化（DPR 高清），返回 2d 上下文（不可用返回 null） */
  private paintContext(size: { width: number; height: number }, dpr: number): CanvasRenderingContext2D | null {
    const canvas = this.canvasEl()
    if (!canvas || !canvasAvailable()) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    canvas.width = Math.max(1, Math.round(size.width * dpr))
    canvas.height = Math.max(1, Math.round(size.height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return ctx
  }

  /** 全笔画绘制（归一化坐标 → CSS px 映射） */
  private paintAll(ctx: CanvasRenderingContext2D, size: { width: number; height: number }): void {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = this.resolvedPenColor()
    ctx.lineWidth = this.penSize()
    for (const stroke of this.strokes) {
      this.strokePath(ctx, stroke, size)
    }
  }

  /** 单笔绘制（增量路径：moveTo 首点，lineTo 其余点，stroke 收笔） */
  private strokePath(ctx: CanvasRenderingContext2D, stroke: Stroke, size: { width: number; height: number }): void {
    if (stroke.points.length === 0) return
    ctx.beginPath()
    const [first, ...rest] = stroke.points
    ctx.moveTo(first!.x * size.width, first!.y * size.height)
    for (const p of rest) ctx.lineTo(p.x * size.width, p.y * size.height)
    ctx.stroke()
  }

  /** 增量画段（pointermove 热路径）：DPR 变换已在绘制起点建立则直接用，否则先全量 */
  private paintSegment(from: StrokePoint, to: StrokePoint): void {
    if (!canvasAvailable()) return
    const size = this.canvasSize()
    const canvas = this.canvasEl()
    if (!size || !canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null
    if (!ctx) return
    if (this.paintKey === '') {
      // 无绘制起点（极端：首点 down 后画布才就绪）——退全量
      this.repaint()
      return
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = this.resolvedPenColor()
    ctx.lineWidth = this.penSize()
    ctx.beginPath()
    ctx.moveTo(from.x * size.width, from.y * size.height)
    ctx.lineTo(to.x * size.width, to.y * size.height)
    ctx.stroke()
  }

  /* ---------------- value 契约 ---------------- */

  /** 自家回写 value 属性（同步触发 attributeChangedCallback，用 lastWrittenValue 区分外部写入） */
  private syncValue(url: string): void {
    this.lastWrittenValue = url
    if (this.getAttribute('value') !== url) this.setAttribute('value', url)
  }

  /** 笔画落定 / 外部图像加载完成：产出 dataURL 并按指纹幂等派发 oas-change */
  private produceValue(): void {
    if (!canvasAvailable()) return
    const canvas = this.canvasEl()
    if (!canvas) return
    let url = ''
    try {
      url = canvas.toDataURL('image/png')
    } catch {
      url = ''
    }
    this.syncValue(url)
    if (url !== this.lastEmittedValue) {
      this.lastEmittedValue = url
      this.emit('change', { value: url })
    }
  }

  /** 宿主受控写入：清空笔迹，加载外部图像（异步 contain 居中绘制） */
  private loadExternalImage(url: string): void {
    this.strokes = []
    this.drawing = null
    this.hasExternalImage = false
    this.paintKey = ''
    this.repaint()
    this.syncDerived()
    if (!url) return
    const seq = ++this.imageSeq
    const img = new Image()
    img.onload = () => {
      if (seq !== this.imageSeq || !this.isConnected) return
      const size = this.canvasSize()
      const canvas = this.canvasEl()
      if (!size || !canvas || !canvasAvailable()) return
      const dpr = devicePixelRatioOf()
      const ctx = this.paintContext(size, dpr)
      if (!ctx) return
      const scale = Math.min(size.width / img.width, size.height / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size.width - w) / 2, (size.height - h) / 2, w, h)
      this.hasExternalImage = true
      this.paintKey = JSON.stringify([this.strokes, 'external', size, dpr])
    }
    img.onerror = () => {
      if (seq !== this.imageSeq) return
      devWarn('[oas-signature] 外部签名图像加载失败，画布已清空')
    }
    img.src = url
  }

  /* ---------------- 观察者 ---------------- */

  /** 容器 resize：归一化坐标重采样重绘，笔迹保留（值指纹不变不重复派发） */
  private watchResize(): void {
    if (typeof ResizeObserver === 'undefined') return
    this.resizeObserver?.disconnect()
    this.resizeObserver = new ResizeObserver(() => this.repaint())
    if (this.isConnected) this.resizeObserver.observe(this)
  }

  /** 主题观察：html class/data-theme 变化 → 重解析 token 笔色 → 签名变化触发重绘 */
  private watchTheme(): void {
    if (!canvasAvailable()) return
    if (typeof document === 'undefined' || !document.documentElement) return
    this.themeObserver?.disconnect()
    this.themeObserver = new MutationObserver(() => this.repaint())
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
  }

  /* ---------------- 公共 API ---------------- */

  /**
   * 清空画布与笔迹，value 归空并按指纹派发 oas-change。
   * 幂等：已空（无笔迹且 value 为空）时零操作不派发。
   */
  clear(): void {
    if (this.drawing) {
      this.drawing = null
      this.activePointerId = null
    }
    if (this.strokes.length === 0 && this.getAttr('value', '') === '' && !this.hasExternalImage) {
      return
    }
    this.imageSeq += 1 // 使在途外部图像加载失效
    this.strokes = []
    this.hasExternalImage = false
    this.paintKey = ''
    this.repaint()
    this.syncDerived()
    this.syncValue('')
    if (this.lastEmittedValue !== '') {
      this.lastEmittedValue = ''
      this.emit('change', { value: '' })
    }
  }

  /**
   * 当前画布 PNG dataURL。空画布（无笔迹且无外部图像）返回空串；
   * 无 canvas 环境同样返回空串。
   */
  toDataURL(): string {
    if (this.strokes.length === 0 && !this.hasExternalImage) return ''
    if (!canvasAvailable()) return ''
    const canvas = this.canvasEl()
    if (!canvas) return ''
    try {
      return canvas.toDataURL('image/png')
    } catch {
      return ''
    }
  }

  /* ---------------- 增量同步 ---------------- */

  /** 状态类派生同步：占位显隐、清空按钮、aria 标签与 aria-live 播报（不触碰 value） */
  private syncDerived(): void {
    const canvas = this.canvasEl()
    const btn = this.clearBtnEl()
    const placeholder = this.shadow.querySelector<HTMLElement>('[part="placeholder"]')
    const live = this.shadow.querySelector<HTMLElement>('.sr-status')
    if (!canvas || !btn || !placeholder || !live) return

    const signed = this.strokes.length > 0 || this.hasExternalImage
    const status = this.t(signed ? 'signature.signed' : 'signature.unsigned')
    canvas.setAttribute('aria-label', this.t('signature.aria', { status }))
    canvas.setAttribute('aria-disabled', this.isDisabled() || this.isReadonly() ? 'true' : 'false')
    if (live.textContent !== status) live.textContent = status

    placeholder.textContent = this.t('signature.placeholder')
    if (signed) placeholder.setAttribute('hidden', '')
    else placeholder.removeAttribute('hidden')

    const clearable = this.hasAttr('clearable')
    if (clearable) btn.removeAttribute('hidden')
    else btn.setAttribute('hidden', '')
    btn.textContent = this.t('signature.clear')
    btn.disabled = this.isDisabled() || this.isReadonly()
  }

  protected override update(): void {
    const canvas = this.canvasEl()
    if (!canvas) return

    // 高度：写画布 CSS 高度（默认 160）
    const height = normalizeNumber(this.getAttr('height', '160'), 160, 1)
    canvas.style.height = `${height}px`

    // value 双通道：属性值与自家回写不一致 → 宿主受控写入
    const attr = this.getAttr('value', '')
    if (attr !== this.lastWrittenValue) {
      this.lastWrittenValue = attr
      this.loadExternalImage(attr)
      return
    }

    this.syncDerived()
    this.repaint()
  }
}
