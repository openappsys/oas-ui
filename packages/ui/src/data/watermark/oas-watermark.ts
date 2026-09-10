import { OASElement, escapeHtml } from '@oas-ui/core'

const STYLE = `
:host {
  position: relative;
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
/* 空容器兜底：无 slot 内容时宿主在 flex 容器内宽度塌缩为 0（图层 inset:0 随之 0 宽、
   水印不可见）——空态水印的语义即「空白区域满铺」，空宿主默认撑满容器宽 */
:host(:empty) {
  width: 100%;
}
/* fullscreen：宿主 fixed 铺满视口，不拦截任何交互；默认最高层级，可用
   z-index 属性或 --oas-watermark-fullscreen-z-index 变量调整 */
:host([fullscreen]) {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--oas-watermark-fullscreen-z-index, 2147483647);
}
.watermark {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  background-position: center;
  background-repeat: repeat;
  background-size: 240px 120px;
  color: var(--oas-color-text-primary);
}
.watermark.single {
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
}
/* movable：水印层接管指针（拖拽平移图案），grab 光标提示可拖 */
:host([movable]) .watermark {
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
}
.watermark.dragging {
  cursor: grabbing;
}
.content {
  position: relative;
  z-index: 1;
}
`

/** 文字水印文本参数（textTileDataUri / textTileCanvas 共用） */
export interface WatermarkTextOptions {
  /** 单元宽（默认 240） */
  width?: number
  /** 单元高（默认 120） */
  height?: number
  /** 旋转角度（默认 -30） */
  rotate?: number
  /** 字号（默认 16） */
  fontSize?: number
  /** 字重（默认 400） */
  fontWeight?: string
  /** 字体族（默认 sans-serif） */
  fontFamily?: string
}

/** 文字水印 canvas 绘制参数（在文本参数基础上补充已解析色值） */
export interface WatermarkCanvasTextOptions extends WatermarkTextOptions {
  /** 已解析的实际色值（canvas 不认 CSS 变量，由调用方解析 token 后传入） */
  color?: string
}

/** 11 预设色名（ui-spec §4.1 color 协议），解析为 --oas-preset-* token（含 dark 变体） */
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

/** 解析 text 为多行：JSON 数组（'["a","b"]'）或 \n 分隔；去空白行，空内容返回 [] */
export function parseTextLines(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  let items: string[] = [raw]
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) items = parsed.map((v) => String(v))
    } catch {
      // 非法 JSON 按普通文本整体处理
    }
  }
  return items
    .flatMap((item) => item.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** 解析 JSON 数字数组属性（gap/offset）：'[x,y]'；单值视为 [n,n]；非法回退 null */
function parseNumberPair(raw: string): [number, number] | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    const nums = list.map((v) => Number(v)).filter((n) => Number.isFinite(n))
    if (!nums.length) return null
    const first = nums[0] as number
    return [first, nums[1] ?? first]
  } catch {
    return null
  }
}

/** 数值属性归一：有限数回退 fallback，可选正数下限 */
function normalizeNumber(raw: string, fallback: number, min?: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  if (min !== undefined && n < min) return min
  return n
}

/** 文本行宽启发式估算（CJK/全角按 1em，其余按 0.55em）——SSR/无 canvas 环境的 tile 自适应用 */
export function estimateLineWidth(line: string, fontSize: number): number {
  // CJK 统一表意/兼容/全角/中文标点等宽字形按 1em；其余按 0.55em 近似
  const wide = /[⺀-鿿豈-﫿＀-￼　-〿]/
  let w = 0
  for (const ch of line) {
    w += wide.test(ch) ? fontSize : fontSize * 0.55
  }
  return w
}

/**
 * tile 尺寸自适应（width/height 未显式设置时）：按文字旋转后的外接框 + 内边距计算，
 * 使默认密度下每个 tile 完整容纳文字——固定 240×120 大 tile 在窄容器里会让文字中心
 * 落到容器外（边缘 tile 只剩空白衬边，水印残缺不可辨）。
 */
export function resolveTileSize(
  text: string,
  options: { fontSize?: number; rotate?: number; width?: number; height?: number } = {},
): { width: number; height: number } {
  const fontSize = options.fontSize ?? 16
  const rotate = options.rotate ?? -30
  const lines = parseTextLines(text)
  if (!lines.length) return { width: options.width ?? 240, height: options.height ?? 120 }
  const lineHeight = fontSize * 1.4
  const contentW = Math.max(...lines.map((l) => estimateLineWidth(l, fontSize)))
  const contentH = lines.length * lineHeight
  const rad = (Math.abs(rotate) * Math.PI) / 180
  const rotW = contentW * Math.cos(rad) + contentH * Math.sin(rad)
  const rotH = contentW * Math.sin(rad) + contentH * Math.cos(rad)
  // 内边距即密度：padX/padY 决定相邻文字间距（越大越稀疏）
  const padX = Math.max(fontSize * 2.5, 24)
  const padY = Math.max(fontSize * 1.5, 16)
  return {
    width: options.width ?? Math.ceil(rotW + 2 * padX),
    height: options.height ?? Math.ceil(rotH + 2 * padY),
  }
}

/** color 属性解析（ui-spec §4.1）：预设名 → preset token；其余按 CSS 色值原样注入 */
function resolveColor(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (PRESET_COLORS.has(value)) return `var(--oas-preset-${value})`
  return value
}

/**
 * 生成文字水印平铺单元（SSR / 无 canvas 环境回退路径）：SVG tile（rotate 斜纹文字，
 * fill=currentColor 随主题 token）。text 支持 \n 或 JSON 数组多行（多行时按字号 1.4 倍
 * 行距垂直排布，整体绕 tile 中心旋转）。导出供测试校验 data-uri 内容与特殊字符转义。
 */
export function textTileDataUri(text: string, options: WatermarkTextOptions = {}): string {
  const width = options.width ?? 240
  const height = options.height ?? 120
  const rotate = options.rotate ?? -30
  const fontSize = options.fontSize ?? 16
  const fontWeight = options.fontWeight ?? '400'
  const fontFamily = options.fontFamily ?? 'sans-serif'
  const lines = parseTextLines(text)
  if (!lines.length || width <= 0 || height <= 0 || fontSize <= 0) return ''

  const cx = width / 2
  const cy = height / 2
  const lineHeight = fontSize * 1.4
  const texts = lines
    .map((line, i) => {
      const y = cy + (i - (lines.length - 1) / 2) * lineHeight
      return (
        `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="central" ` +
        `font-size="${fontSize}" font-weight="${escapeHtml(fontWeight)}" ` +
        `font-family="${escapeHtml(fontFamily)}" fill="currentColor">${escapeHtml(line)}</text>`
      )
    })
    .join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    `<g transform="rotate(${rotate} ${cx} ${cy})">${texts}</g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * canvas 2d 可用性检测。SSR（无 document）与无 canvas 实现的环境（如 happy-dom）
 * 返回 false，组件自动回退 SVG data-uri 路径，保证两路径渲染结构一致、能力无损。
 */
export function canvasAvailable(): boolean {
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
 * 文字水印 canvas tile（主渲染路径）：与 textTileDataUri 同一套排布规则
 * （多行 1.4 倍行距、整体绕 tile 中心旋转），canvas 尺寸 × DPR 防高分屏模糊，
 * 返回绘制完成的 canvas（由调用方 toDataURL / 复用）；环境无 2d 上下文或无有效
 * 内容时返回 null（调用方回退 SVG 路径）。
 */
export function textTileCanvas(
  text: string,
  options: WatermarkCanvasTextOptions = {},
  dpr = 1,
): HTMLCanvasElement | null {
  const width = options.width ?? 240
  const height = options.height ?? 120
  const rotate = options.rotate ?? -30
  const fontSize = options.fontSize ?? 16
  const fontWeight = options.fontWeight ?? '400'
  const fontFamily = options.fontFamily ?? 'sans-serif'
  const lines = parseTextLines(text)
  if (!lines.length || width <= 0 || height <= 0 || fontSize <= 0) return null
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  canvas.width = Math.max(1, Math.round(width * ratio))
  canvas.height = Math.max(1, Math.round(height * ratio))
  ctx.scale(ratio, ratio)

  const cx = width / 2
  const cy = height / 2
  const lineHeight = fontSize * 1.4
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.translate(-cx, -cy)
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.fillStyle = options.color ?? 'black'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lineHeight
    ctx.fillText(line, cx, y)
  })
  ctx.restore()
  return canvas
}

/** 防篡改观察配置：图层增删 + 图层 style/class 篡改（subtree 限定 shadow 内部） */
const TAMPER_OBSERVE: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class'],
}

/**
 * oas-watermark —— 容器水印层 / 全屏水印层。
 *
 * 属性（kebab-case）：
 * - `text`：文字水印内容；支持 \n 或 JSON 数组多行（与 image 二选一，image 优先）
 * - `image`：图片水印 URL
 * - `opacity`：水印层透明度（0–1，夹取边界）
 * - `repeat`：布尔，存在时平铺；缺省单枚居中
 * - `rotate`：文字旋转角度（默认 -30）
 * - `gap`：平铺间隙 JSON `[x,y]`（默认 tile 尺寸）
 * - `offset`：图案起始偏移 JSON `[x,y]`（默认 gap/2）
 * - `width` / `height`：文字 tile 尺寸。未显式设置时按文字内容自适应
 *   （旋转外接框 + 内边距，保证默认密度下 tile 完整容纳文字、边缘裁切后仍可读）；
 *   图片水印缺省维持 240 / 120
 * - `font-size` / `font-weight` / `font-family`：文字水印字体
 * - `color`：水印颜色（11 预设名走 --oas-preset-* token 含 dark 变体，或任意 CSS 色值；
 *   缺省 currentColor → --oas-color-text-primary 跟随主题）
 * - `z-index`：水印层层级（默认 2；fullscreen 时写到宿主覆盖默认最高层）
 * - `staggered`：布尔，存在时双层背景错位半 tile 排布（仅平铺模式）
 * - `movable`：布尔，存在时可拖拽平移水印（offset 随拖拽更新）
 * - `grayscale`：布尔，图片水印灰阶滤镜（canvas filter: grayscale(1)；
 *   无 canvas 环境回退图层 CSS filter）
 * - `fullscreen`：布尔，宿主 fixed inset:0 铺满视口（pointer-events:none，默认最高层级，
 *   页面滚动水印不动；与 movable/staggered/grayscale 可组合）
 * - `tamper-proof`：防篡改（默认开；`="false"` 关闭）——水印层被移除或样式被篡改时
 *   自动重挂/恢复，并派发 `oas-remove` 事件（detail.type: 'removed' | 'modified'）。
 *   防君子不防小人：只兜底「随手删除」，不是安全边界。
 *
 * 实现：canvas 绘制平铺单元 → toDataURL 作 background-repeat 平铺（DPR 高清）；
 * SSR / 无 canvas 环境回退 SVG data-uri（fill=currentColor），两路径结构严格一致，
 * 真水合校验结构后接管。tile 缓存 dataURL，仅绘制参数（含主题解析色）变化才重绘；
 * 主题切换（html class/data-theme）自动重解析重绘；窗口 resize 由 background-repeat
 * 天然适配，无需重绘。
 */
export class OASWatermark extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'text',
      'image',
      'opacity',
      'repeat',
      'rotate',
      'gap',
      'offset',
      'width',
      'height',
      'font-size',
      'font-weight',
      'font-family',
      'color',
      'z-index',
      'staggered',
      'movable',
      'grayscale',
      'fullscreen',
      'tamper-proof',
    ]
  }

  /** 防篡改 MutationObserver（shadow 内图层增删/改样式） */
  private tamperObserver: MutationObserver | null = null
  /** 组件自身最近一次写入的图层签名：与 DOM 实际状态比对区分「自家更新」与「外部篡改」 */
  private lastSignature = ''
  /** 拖拽状态（movable）：起步指针位置 + 起步 offset */
  private dragStart: { x: number; y: number; ox: number; oy: number } | null = null
  /** canvas tile 缓存：dataURL 与对应绘制参数签名（签名一致跳过重绘） */
  private tileUrl = ''
  private tileKey = ''
  /** 图片异步绘制序号：过期回调直接丢弃（防乱序覆盖） */
  private paintSeq = 0
  /** 主题观察（canvas 路径）：html class/data-theme 变化时重解析 token 色并重绘 */
  private themeObserver: MutationObserver | null = null
  /** fullscreen 宿主 z-index 是否为组件自写（关闭时需清除） */
  private fullscreenZApplied = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="watermark" part="watermark" aria-hidden="true"></div>
      <div class="content" part="content"><slot></slot></div>
    `
  }

  /** 绑定事件（render 与水合路径共用；事件委托在 shadow 根上，图层重建无需重绑） */
  private bind(): void {
    // 拖拽监听挂在 shadow 根（事件委托）：图层可能被防篡改重建，委托天然免重绑
    this.shadow.addEventListener('pointerdown', (e) => this.onPointerDown(e as PointerEvent))
    this.onCleanup(() => this.endDrag())
    this.watchTheme()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（水印层存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="watermark"]')) return false
    this.bind()
    return true
  }

  override disconnectedCallback(): void {
    this.tamperObserver?.disconnect()
    this.tamperObserver = null
    this.themeObserver?.disconnect()
    this.themeObserver = null
    super.disconnectedCallback()
  }

  private layer(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="watermark"]')
  }

  /** 主题观察：仅 canvas 路径需要（SVG 路径 fill=currentColor 天然跟随主题） */
  private watchTheme(): void {
    if (!canvasAvailable()) return
    if (typeof document === 'undefined' || !document.documentElement) return
    this.themeObserver?.disconnect()
    this.themeObserver = new MutationObserver(() => {
      // 属性键含解析色：update 内比对，色值未变则零重绘
      this.update()
    })
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
  }

  /** 生效 tile 尺寸（update 与 movable 起步计算共用）：显式 width/height 优先，文字水印未设置时按内容自适应 */
  private effectiveTileSize(image: string, text: string): { width: number; height: number } {
    const fontSize = normalizeNumber(this.getAttr('font-size', '16'), 16, 1)
    const rotate = normalizeNumber(this.getAttr('rotate', '-30'), -30)
    const widthAttr = this.getAttr('width', '')
    const heightAttr = this.getAttr('height', '')
    const autoSize =
      !image && (!widthAttr || !heightAttr)
        ? resolveTileSize(text, { fontSize, rotate })
        : null
    return {
      width: widthAttr ? normalizeNumber(widthAttr, 240, 1) : (autoSize?.width ?? 240),
      height: heightAttr ? normalizeNumber(heightAttr, 120, 1) : (autoSize?.height ?? 120),
    }
  }

  protected override update(): void {
    let layer = this.layer()
    if (!layer) {
      // 图层缺失（如 tamper-proof=false 时被宿主移除后又改属性）：从模板补回
      layer = this.restoreLayer()
      if (!layer) return
    }

    const image = this.getAttr('image', '')
    const text = this.getAttr('text', '')
    const opacity = this.normalizeOpacity()
    const repeat = this.hasAttr('repeat')
    const movable = this.hasAttr('movable')
    const staggered = this.hasAttr('staggered') && repeat
    const grayscale = this.hasAttr('grayscale')
    const fullscreen = this.hasAttr('fullscreen')
    const zIndex = normalizeNumber(this.getAttr('z-index', '2'), 2)
    const fontSize = normalizeNumber(this.getAttr('font-size', '16'), 16, 1)
    const rotate = normalizeNumber(this.getAttr('rotate', '-30'), -30)
    const { width, height } = this.effectiveTileSize(image, text)
    const color = resolveColor(this.getAttr('color', ''))

    layer.classList.toggle('single', !repeat)

    // fullscreen：宿主 z-index 自写（z-index 属性优先，缺省交给 CSS 变量最高层）
    if (fullscreen) {
      const z = this.getAttr('z-index', '').trim()
      this.style.zIndex = z
      this.fullscreenZApplied = true
    } else if (this.fullscreenZApplied) {
      this.style.zIndex = ''
      this.fullscreenZApplied = false
    }

    // 平铺间隙与起始偏移（JSON [x,y]；offset 缺省 gap/2，与旧版 center 视觉等价）
    const gap = parseNumberPair(this.getAttr('gap', '')) ?? [width, height]
    const offset =
      parseNumberPair(this.getAttr('offset', '')) ?? [gap[0] / 2, gap[1] / 2]

    // 背景图：image 优先；canvas 可用走 canvas tile（DPR 高清），否则 SVG data-uri 回退
    let bg = 'none'
    if (image) {
      bg = this.imageBackground(image, grayscale, repeat, gap)
    } else {
      bg = this.textBackground(text, {
        width,
        height,
        rotate,
        fontSize,
        fontWeight: this.getAttr('font-weight', '400'),
        fontFamily: this.getAttr('font-family', 'sans-serif'),
      }, color, layer)
    }

    let backgroundRepeat = 'repeat'
    let backgroundSize = `${gap[0]}px ${gap[1]}px`
    let backgroundPosition = `${offset[0]}px ${offset[1]}px`
    if (!repeat) {
      // 单枚：contain 居中；显式 offset 时按偏移定位（拖拽单枚水印可用）
      backgroundRepeat = 'no-repeat'
      backgroundSize = 'contain'
      backgroundPosition = this.getAttr('offset', '')
        ? `${offset[0]}px ${offset[1]}px`
        : 'center'
    }
    if (staggered) {
      // 双层背景：第二层偏移半 tile → 奇偶行错位排布
      backgroundSize = `${backgroundSize}, ${backgroundSize}`
      backgroundPosition =
        `${backgroundPosition}, ${offset[0] + gap[0] / 2}px ${offset[1] + gap[1] / 2}px`
      if (bg !== 'none') bg = `${bg}, ${bg}`
    }

    // grayscale 无 canvas 回退：图层 CSS filter 兜底（canvas 路径已在绘制时应用）
    const cssFilter = grayscale && !canvasAvailable() ? ' filter: grayscale(1);' : ''

    // 内联样式整体写入（happy-dom 对超长 data-uri 的 style 解析有限，见测试约定）
    layer.setAttribute(
      'style',
      `background-image: ${bg}; background-repeat: ${backgroundRepeat}; ` +
        `background-size: ${backgroundSize}; background-position: ${backgroundPosition}; ` +
        `opacity: ${opacity}; z-index: ${zIndex}; ` +
        `pointer-events: ${movable ? 'auto' : 'none'};` +
        cssFilter +
        (color ? ` color: ${color};` : ''),
    )
    this.lastSignature = this.signature(layer)
    this.syncTamperGuard()
  }

  /** 文字背景：canvas 主路径（缓存 + DPR + 解析色入签名）；无 canvas 回退 SVG data-uri */
  private textBackground(
    text: string,
    options: WatermarkTextOptions,
    colorCss: string,
    layer: HTMLElement,
  ): string {
    if (!canvasAvailable()) {
      const uri = textTileDataUri(text, options)
      return uri ? `url("${uri}")` : 'none'
    }
    // 先把 token 色挂到图层上，再读解析色供 canvas 绘制（canvas 不认 CSS 变量）
    if (colorCss) layer.style.color = colorCss
    let resolved = ''
    try {
      resolved = getComputedStyle(layer).color
    } catch {
      resolved = ''
    }
    const key = JSON.stringify([options, resolved])
    if (key !== this.tileKey || !this.tileUrl) {
      const canvas = textTileCanvas(text, { ...options, color: resolved || undefined }, devicePixelRatioOf())
      if (!canvas) {
        // canvas 中途不可用（极端环境）：回退 SVG，保证不空白
        this.tileKey = ''
        this.tileUrl = ''
        const uri = textTileDataUri(text, options)
        return uri ? `url("${uri}")` : 'none'
      }
      this.tileUrl = canvas.toDataURL('image/png')
      this.tileKey = key
    }
    return `url("${this.tileUrl}")`
  }

  /** 图片背景：grayscale 走 canvas drawImage（跨域污染/加载失败回退原 URL）；否则直用 URL */
  private imageBackground(
    url: string,
    grayscale: boolean,
    repeat: boolean,
    gap: [number, number],
  ): string {
    if (!grayscale || !canvasAvailable()) return `url("${url}")`
    const key = JSON.stringify(['img', url, grayscale, repeat, gap, devicePixelRatioOf()])
    if (key === this.tileKey && this.tileUrl) return `url("${this.tileUrl}")`
    this.tileKey = key
    this.tileUrl = ''
    const seq = ++this.paintSeq
    const img = new Image()
    // 灰阶需读取像素：匿名跨域；目标站不放行 CORS 时回退原图（灰阶不可用，不空白）
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (seq !== this.paintSeq) return
      try {
        const tw = repeat ? gap[0] : img.naturalWidth
        const th = repeat ? gap[1] : img.naturalHeight
        const dpr = devicePixelRatioOf()
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(tw * dpr))
        canvas.height = Math.max(1, Math.round(th * dpr))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('no 2d context')
        ctx.scale(dpr, dpr)
        ctx.filter = 'grayscale(1)'
        ctx.drawImage(img, 0, 0, tw, th)
        this.tileUrl = canvas.toDataURL('image/png')
      } catch {
        this.tileUrl = ''
      }
      this.update()
    }
    img.onerror = () => {
      if (seq !== this.paintSeq) return
      this.update()
    }
    img.src = url
    // 异步绘制完成前沿用上一次缓存（无缓存则暂回退原 URL，不空白）
    return this.tileUrl ? `url("${this.tileUrl}")` : `url("${url}")`
  }

  /** 图层当前签名：style + class 与组件自身写入比对，识别外部篡改 */
  private signature(layer: HTMLElement): string {
    return `${layer.getAttribute('style') ?? ''}|${layer.getAttribute('class') ?? ''}`
  }

  /** 图层被移除后按模板补回（保持 DOM 结构与水合快照一致） */
  private restoreLayer(): HTMLElement | null {
    if (this.layer()) return this.layer()
    const content = this.shadow.querySelector('[part="content"]')
    if (!content) return null
    const div = document.createElement('div')
    div.className = 'watermark'
    div.setAttribute('part', 'watermark')
    div.setAttribute('aria-hidden', 'true')
    this.shadow.insertBefore(div, content)
    return div
  }

  /** 防篡改开关（默认开；="false" 关闭） */
  private tamperProofEnabled(): boolean {
    return this.getAttr('tamper-proof', 'true') !== 'false'
  }

  /** 按开关启停防篡改观察（update 末尾调用；断开连接时由 disconnectedCallback 清理） */
  private syncTamperGuard(): void {
    if (!this.tamperProofEnabled()) {
      this.tamperObserver?.disconnect()
      this.tamperObserver = null
      return
    }
    if (this.tamperObserver) return
    this.tamperObserver = new MutationObserver(this.handleTamper)
    this.tamperObserver.observe(this.shadow, TAMPER_OBSERVE)
  }

  /** 防篡改回调：图层被移除或 style/class 被外部改写 → 重挂/恢复 + 派 oas-remove */
  private handleTamper = (): void => {
    const layer = this.layer()
    if (layer && this.signature(layer) === this.lastSignature) return
    const type = layer ? 'modified' : 'removed'
    // 先断开再恢复：恢复产生的 DOM 写入不回流触发本回调（防重建循环）
    this.tamperObserver?.disconnect()
    this.restoreLayer()
    this.update()
    this.emit('remove', { type })
    this.tamperObserver?.observe(this.shadow, TAMPER_OBSERVE)
  }

  /** movable：按下起步（记录起步 offset = 当前生效值） */
  private onPointerDown(e: PointerEvent): void {
    if (!this.hasAttr('movable')) return
    if (e.button !== 0) return
    const layer = this.layer()
    if (!layer || !e.composedPath().includes(layer)) return
    e.preventDefault()
    const { width, height } = this.effectiveTileSize(this.getAttr('image', ''), this.getAttr('text', ''))
    const gap = parseNumberPair(this.getAttr('gap', '')) ?? [width, height]
    const offset = parseNumberPair(this.getAttr('offset', '')) ?? [gap[0] / 2, gap[1] / 2]
    this.dragStart = { x: e.clientX, y: e.clientY, ox: offset[0], oy: offset[1] }
    layer.classList.add('dragging')
    document.addEventListener('pointermove', this.onDrag)
    document.addEventListener('pointerup', this.endDrag)
    document.addEventListener('pointercancel', this.endDrag)
  }

  /** movable：拖拽跟随——offset 随指针位移更新（写回属性走受控通道，重建后仍生效） */
  private onDrag = (e: PointerEvent): void => {
    if (!this.dragStart) return
    const nx = Math.round(this.dragStart.ox + (e.clientX - this.dragStart.x))
    const ny = Math.round(this.dragStart.oy + (e.clientY - this.dragStart.y))
    this.setAttribute('offset', `[${nx},${ny}]`)
  }

  private endDrag = (): void => {
    if (!this.dragStart) return
    this.dragStart = null
    this.layer()?.classList.remove('dragging')
    document.removeEventListener('pointermove', this.onDrag)
    document.removeEventListener('pointerup', this.endDrag)
    document.removeEventListener('pointercancel', this.endDrag)
  }

  /** opacity 归一：非数值回退 0.15，夹取 0–1 */
  private normalizeOpacity(): number {
    const n = Number(this.getAttr('opacity', '0.15'))
    if (!Number.isFinite(n)) return 0.15
    return Math.min(1, Math.max(0, n))
  }
}
