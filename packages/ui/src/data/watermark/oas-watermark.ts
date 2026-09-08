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

/** 文字水印文本参数（textTileDataUri 可选配置） */
export interface WatermarkTextOptions {
  /** SVG tile 宽（默认 240） */
  width?: number
  /** SVG tile 高（默认 120） */
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

/** color 属性解析（ui-spec §4.1）：预设名 → preset token；其余按 CSS 色值原样注入 */
function resolveColor(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (PRESET_COLORS.has(value)) return `var(--oas-preset-${value})`
  return value
}

/**
 * 生成文字水印平铺单元：SVG tile（rotate 斜纹文字，fill=currentColor 随主题 token）。
 * text 支持 \n 或 JSON 数组多行（多行时按字号 1.4 倍行距垂直排布，整体绕 tile 中心旋转）。
 * 导出供测试校验 data-uri 内容与特殊字符转义。
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

/** 防篡改观察配置：图层增删 + 图层 style/class 篡改（subtree 限定 shadow 内部） */
const TAMPER_OBSERVE: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class'],
}

/**
 * oas-watermark —— 容器水印层。
 *
 * 属性（kebab-case）：
 * - `text`：文字水印内容；支持 \n 或 JSON 数组多行（与 image 二选一，image 优先）
 * - `image`：图片水印 URL
 * - `opacity`：水印层透明度（0–1，夹取边界）
 * - `repeat`：布尔，存在时平铺；缺省单枚居中
 * - `rotate`：文字旋转角度（默认 -30）
 * - `gap`：平铺间隙 JSON `[x,y]`（默认 tile 尺寸 240×120）
 * - `offset`：图案起始偏移 JSON `[x,y]`（默认 gap/2）
 * - `width` / `height`：文字 tile 尺寸（默认 240 / 120）
 * - `font-size` / `font-weight` / `font-family`：文字水印字体
 * - `color`：水印颜色（11 预设名走 --oas-preset-* token 含 dark 变体，或任意 CSS 色值；
 *   缺省 currentColor → --oas-color-text-primary 跟随主题）
 * - `z-index`：水印层层级（默认 2）
 * - `staggered`：布尔，存在时双层背景错位半 tile 排布（仅平铺模式）
 * - `movable`：布尔，存在时可拖拽平移水印（offset 随拖拽更新）
 * - `tamper-proof`：防篡改（默认开；`="false"` 关闭）——水印层被移除或样式被篡改时
 *   自动重挂/恢复，并派发 `oas-remove` 事件（detail.type: 'removed' | 'modified'）。
 *   防君子不防小人：只兜底「随手删除」，不是安全边界。
 *
 * 实现：绝对定位的装饰层（aria-hidden）铺在 slot 内容之上，不拦截任何交互；
 * 容器无内容也照常显示水印。文字水印用 SVG data-uri（fill=currentColor）。
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
      'tamper-proof',
    ]
  }

  /** 防篡改 MutationObserver（shadow 内图层增删/改样式） */
  private tamperObserver: MutationObserver | null = null
  /** 组件自身最近一次写入的图层签名：与 DOM 实际状态比对区分「自家更新」与「外部篡改」 */
  private lastSignature = ''
  /** 拖拽状态（movable）：起步指针位置 + 起步 offset */
  private dragStart: { x: number; y: number; ox: number; oy: number } | null = null

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
    super.disconnectedCallback()
  }

  private layer(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="watermark"]')
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
    const zIndex = normalizeNumber(this.getAttr('z-index', '2'), 2)
    const width = normalizeNumber(this.getAttr('width', '240'), 240, 1)
    const height = normalizeNumber(this.getAttr('height', '120'), 120, 1)
    const color = resolveColor(this.getAttr('color', ''))

    layer.classList.toggle('single', !repeat)

    // 背景图：image 优先；文字走 SVG tile（多行/旋转/字体全参数化）
    let bg = 'none'
    if (image) {
      bg = `url("${image}")`
    } else {
      const uri = textTileDataUri(text, {
        width,
        height,
        rotate: normalizeNumber(this.getAttr('rotate', '-30'), -30),
        fontSize: normalizeNumber(this.getAttr('font-size', '16'), 16, 1),
        fontWeight: this.getAttr('font-weight', '400'),
        fontFamily: this.getAttr('font-family', 'sans-serif'),
      })
      if (uri) bg = `url("${uri}")`
    }

    // 平铺间隙与起始偏移（JSON [x,y]；offset 缺省 gap/2，与旧版 center 视觉等价）
    const gap =
      parseNumberPair(this.getAttr('gap', '')) ?? [width, height]
    const offset =
      parseNumberPair(this.getAttr('offset', '')) ?? [gap[0] / 2, gap[1] / 2]

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
      if (!image) bg = `${bg}, ${bg}`
    }

    // 内联样式整体写入（happy-dom 对超长 data-uri 的 style 解析有限，见测试约定）
    layer.setAttribute(
      'style',
      `background-image: ${bg}; background-repeat: ${backgroundRepeat}; ` +
        `background-size: ${backgroundSize}; background-position: ${backgroundPosition}; ` +
        `opacity: ${opacity}; z-index: ${zIndex}; ` +
        `pointer-events: ${movable ? 'auto' : 'none'};` +
        (color ? ` color: ${color};` : ''),
    )
    this.lastSignature = this.signature(layer)
    this.syncTamperGuard()
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
    const width = normalizeNumber(this.getAttr('width', '240'), 240, 1)
    const height = normalizeNumber(this.getAttr('height', '120'), 120, 1)
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
