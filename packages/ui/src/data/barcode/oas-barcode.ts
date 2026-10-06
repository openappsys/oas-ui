import { OASElement } from '@oas-ui/core'
import { encodeBarcode, BarcodeEncodeError, type BarcodeFormat, type EncodeResult } from './encoders.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  line-height: 1;
  /* 条码是有方向性的图形：HRI 文字与条序恒 LTR（isolate 隔离宿主 dir=rtl 继承，
     否则 RTL 上下文里 HRI 中性字符——连字符/空格/符号——会视觉错位）。同 code/color-picker 惯例 */
  direction: ltr;
  unicode-bidi: isolate;
}
:host([hidden]) {
  display: none;
}
.wrapper {
  position: relative;
  display: inline-block;
  line-height: 0;
}
svg {
  display: block;
}
[hidden] {
  display: none !important;
}
.empty,
.error {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  align-items: center;
  justify-content: center;
  min-width: 128px;
  min-height: 64px;
  padding: var(--oas-space-3);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  text-align: center;
  line-height: 1.5;
  word-break: break-all;
}
`

/** 颜色属性统一协议（ui-spec §4.1）的预设名（与 oas-qrcode 同表） */
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

const VALID_FORMATS = new Set(['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf14'])

/**
 * oas-barcode —— 一维条码组件。
 *
 * 属性（kebab-case）：
 * - `value`：条码内容；空值走空态占位
 * - `format`：码制 `code128`（默认，auto A/B/C 子集切换）/ `ean13` / `ean8` / `upca` /
 *   `code39` / `itf14`；非法值静默回退 code128
 * - `bar-width`：X-dimension 条宽（px，默认 2，下限 clamp ≥1）
 * - `height`：条高（px，默认 100，不含文字区与护条延伸）
 * - `display-value`：人读文字显隐（默认显示；显式 `display-value="false"` 关闭）
 * - `text-position`：`bottom`（默认）/ `top`
 * - `font-size`：文字字号（px，默认 16）
 * - `text-margin`：文字与条间距（px，默认 4）
 * - `margin`：左右静区（px，默认 10）；**显式值低于 `10 × bar-width` 时收敛到下限并
 *   console.warn 一次**（扫码枪静区硬约束，宿主可加大不可破坏）
 * - `color`：条色（CSS 色值或 11 预设名；缺省固定深色 `#18181b`，`--oas-barcode-color` 可覆）
 * - `bg-color`：静区底色（默认固定白 #fff——可扫性优先于主题一致性，dark 下同样可扫；
 *   `--oas-barcode-bg` 变量可覆）
 * - `aria-label`：可访问名（缺省走 i18n `barcode.image`）
 *
 * ⚠️ 可扫性内建：EAN/UPC 护条按标准向下延伸；整体宽度由内容决定
 * （位数 × 码制 × bar-width + 静区），组件不设 `size`/`width` 属性。
 *
 * 方法：`download()` 离屏 4× rasterize 当前码为 PNG 并触发下载（SVG-only 渲染）。
 *
 * 事件：`oas-invalid`（detail: `{ reason: 'charset' | 'length' | 'checksum' }`）——
 * 非法输入（字符集/位数/校验位不符）渲染错误占位时派发；同一非法输入只派发一次。
 *
 * 渲染：纯 TS 编码器（零依赖）产出条/空宽度序列，输出内联 SVG（crispEdges 锐利缩放）。
 * ARIA：图形元素挂 role="img" + aria-label（组件属性优先，缺省走 i18n）。
 */
export class OASBarcode extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'format',
      'bar-width',
      'height',
      'display-value',
      'text-position',
      'font-size',
      'text-margin',
      'margin',
      'color',
      'bg-color',
      'aria-label',
    ]
  }

  /** margin 下限告警一次性标记（每次连接内只告警一次，避免属性抖动刷屏） */
  private marginWarned = false
  /** 已派发过 oas-invalid 的输入指纹（同一非法输入只派发一次） */
  private invalidKey: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <svg class="barcode" part="barcode" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="" focusable="false"></svg>
        <div class="empty" part="empty" hidden></div>
        <div class="error" part="error" hidden></div>
      </div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.marginWarned = false
    this.update()
  }

  protected override update(): void {
    const svg = this.shadow.querySelector<SVGSVGElement>('svg')
    const emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    const errorEl = this.shadow.querySelector<HTMLElement>('[part="error"]')
    if (!svg || !emptyEl || !errorEl) return

    const value = this.getAttr('value', '')

    // aria-label：组件属性优先，缺省走 i18n（挂在图形元素上；容器保持普通容器语义）
    const custom = this.getAttribute('aria-label')
    svg.setAttribute('aria-label', custom ?? this.t('barcode.image'))

    if (!value) {
      svg.setAttribute('hidden', '')
      errorEl.setAttribute('hidden', '')
      emptyEl.removeAttribute('hidden')
      emptyEl.textContent = this.t('barcode.empty')
      this.invalidKey = null
      return
    }

    try {
      const result = encodeBarcode(value, this.normalizeFormat())
      const { inner, width, height } = this.renderInner(result)

      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', String(width))
      svg.setAttribute('height', String(height))
      svg.innerHTML = inner
      svg.removeAttribute('hidden')
      emptyEl.setAttribute('hidden', '')
      errorEl.setAttribute('hidden', '')
      this.invalidKey = null
    } catch (e) {
      if (e instanceof BarcodeEncodeError) {
        svg.setAttribute('hidden', '')
        emptyEl.setAttribute('hidden', '')
        errorEl.removeAttribute('hidden')
        errorEl.textContent = `${this.t('barcode.invalid')}：${this.t(`barcode.invalid${cap(e.reason)}`)}`
        // 同一非法输入（归一码制 + value 指纹）只派发一次；修正后重新允许
        const key = `${this.normalizeFormat()}\u0000${value}`
        if (this.invalidKey !== key) {
          this.invalidKey = key
          this.emit('invalid', { reason: e.reason })
        }
      } else {
        throw e
      }
    }
  }

  /* ---------------- 属性归一 ---------------- */

  /** 码制归一：非法值静默回退 code128（通用性最强的缺省） */
  private normalizeFormat(): BarcodeFormat {
    const v = this.getAttr('format', 'code128').toLowerCase()
    return VALID_FORMATS.has(v) ? (v as BarcodeFormat) : 'code128'
  }

  /** 条宽归一：默认 2，clamp ≥1（可扫性 X-dimension 下限） */
  private normalizeBarWidth(): number {
    const n = Number(this.getAttr('bar-width', '2'))
    if (!Number.isFinite(n) || n <= 0) return 2
    return Math.max(1, n)
  }

  /**
   * 静区归一：缺省 10；显式值低于 10×bar-width 时收敛到下限并告警一次
   * （默认值豁免——下限是给「显式调小」的宿主的护栏，不是给默认值的）
   */
  private normalizeMargin(barWidth: number): number {
    const raw = this.getAttribute('margin')
    const fallback = 10
    if (raw == null || raw.trim() === '') return fallback
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return fallback
    const min = 10 * barWidth
    if (n < min) {
      if (!this.marginWarned) {
        this.marginWarned = true
        console.warn(
          `[oas-barcode] margin ${n} 低于可扫性下限（10 × bar-width = ${min}），已收敛为 ${min}；静区不足会被扫码枪拒读`,
        )
      }
      return min
    }
    return n
  }

  /** 条高归一：默认 100（扫码枪线扫需要足够条高），非法值回退 */
  private normalizeHeight(): number {
    const n = Number(this.getAttr('height', '100'))
    if (!Number.isFinite(n) || n <= 0) return 100
    return n
  }

  private normalizeFontSize(): number {
    const n = Number(this.getAttr('font-size', '16'))
    if (!Number.isFinite(n) || n <= 0) return 16
    return n
  }

  private normalizeTextMargin(): number {
    const n = Number(this.getAttr('text-margin', '4'))
    if (!Number.isFinite(n) || n < 0) return 4
    return n
  }

  /** 人读文字显隐：缺省显示；显式 "false" 关闭（index-bar sticky 同款值布尔惯例） */
  private normalizeDisplayValue(): boolean {
    return this.getAttr('display-value', '').trim().toLowerCase() !== 'false'
  }

  private normalizeTextPosition(): 'bottom' | 'top' {
    return this.getAttr('text-position', 'bottom').trim().toLowerCase() === 'top' ? 'top' : 'bottom'
  }

  /* ---------------- 渲染核心（屏幕渲染与离屏下载共用） ---------------- */

  /**
   * 渲染核心：返回「px 坐标」的 SVG 内容与总宽高（含静区与文字/护条延伸区）。
   * 整体宽度由内容决定：静区 ×2 + 护条外侧沟槽 + 总模数 × bar-width。
   */
  private renderInner(
    result: EncodeResult,
    opts?: { fg: string; bg: string },
  ): { inner: string; width: number; height: number } {
    const barWidth = this.normalizeBarWidth()
    const margin = this.normalizeMargin(barWidth)
    const barH = this.normalizeHeight()
    const fontSize = this.normalizeFontSize()
    const textMargin = this.normalizeTextMargin()
    const showText = this.normalizeDisplayValue()
    const textTop = this.normalizeTextPosition() === 'top'
    const fg = opts?.fg ?? this.fgColor()
    const bg = opts?.bg ?? this.bgColor()

    // EAN/UPC 护条外侧数字沟槽（不吃静区：在 margin 之外加宽，保证静区完整）
    const gutter = showText && (result.outside.left || result.outside.right) ? Math.ceil(fontSize * 0.7) : 0
    const gutterL = showText && result.outside.left ? gutter : 0
    const gutterR = showText && result.outside.right ? gutter : 0

    const codeW = result.modules * barWidth
    const width = margin * 2 + gutterL + codeW + gutterR

    // 护条延伸（EAN/UPC 标准结构，向下 5X）恒绘制：
    // 顶部文字把条体整体下移给文字留区，护条延伸留在条体下方——两者叠加都必须计入总高，
    // 否则 viewBox 会截断护条延伸（text-position="top" + EAN/UPC 的经典错位）。
    const guardExtPx = result.guardExtend * barWidth
    const guardExt = result.guards.length ? guardExtPx : 0
    const textH = textMargin + fontSize
    const topZone = showText && textTop ? textH : 0
    const bottomZone = showText && !textTop ? textH : 0
    const barsTop = topZone
    const height = topZone + barH + Math.max(guardExt, bottomZone)

    // 条形 path：普通条与护条延伸条分两条（延伸条更高）
    const guardSet = new Set(result.guards)
    const x0 = margin + gutterL
    let dBars = ''
    let dGuards = ''
    let x = x0
    for (let k = 0; k < result.runs.length; k++) {
      const w = result.runs[k]! * barWidth
      if (k % 2 === 0) {
        const d = `M${round2(x)} ${round2(barsTop)}h${round2(w)}`
        if (guardSet.has(k / 2)) dGuards += `${d}v${round2(barH + guardExtPx)}h-${round2(w)}z`
        else dBars += `${d}v${round2(barH)}h-${round2(w)}z`
      }
      x += w
    }

    let inner = `<rect width="${round2(width)}" height="${round2(height)}" fill="${escapeAttr(bg)}"/>`
    if (dBars) inner += `<path d="${dBars}" fill="${escapeAttr(fg)}" shape-rendering="crispEdges"/>`
    if (dGuards) inner += `<path d="${dGuards}" fill="${escapeAttr(fg)}" shape-rendering="crispEdges"/>`

    // HRI 文字（generic sans；OCR-B 无自由许可，宿主可经 @font-face 自接后覆盖 font-family）
    const baseline = (v: number): number => v + textMargin + Math.round(fontSize * 0.8)
    const seg = (value: string, cx: number): string =>
      `<text x="${round2(cx)}" y="${round2(textTop ? baseline(0) : baseline(barH))}" text-anchor="middle" font-size="${round2(fontSize)}" font-family="sans-serif" fill="${escapeAttr(fg)}" part="text">${escapeAttr(value)}</text>`
    if (showText) {
      for (const t of result.text) {
        inner += seg(t.value, x0 + (t.start + t.width / 2) * barWidth)
      }
      if (result.outside.left) inner += seg(result.outside.left, margin + gutterL / 2)
      if (result.outside.right) inner += seg(result.outside.right, width - margin - gutterR / 2)
    }
    return { inner, width, height }
  }

  /* ---------------- 颜色 ---------------- */

  /** 条色：属性（CSS 色值 / 预设名）优先；缺省固定深色（dark 下与固定白底配套可扫） */
  private fgColor(): string {
    const v = this.getAttr('color', '').trim()
    if (!v) return 'var(--oas-barcode-color, #18181b)'
    if (PRESET_COLORS.has(v)) return `var(--oas-preset-${v})`
    return v
  }

  /** 静区底色：默认固定白（可扫性优先于主题一致性）；属性 / 变量双通道覆盖 */
  private bgColor(): string {
    const v = this.getAttr('bg-color', '').trim()
    if (v) return v
    return 'var(--oas-barcode-bg, #ffffff)'
  }

  /** canvas/独立 SVG 用解析后的背景色：属性优先，缺省固定白（与屏幕渲染的 var fallback 一致） */
  private resolveBgForCanvas(): string {
    const v = this.getAttr('bg-color', '').trim()
    return v || '#ffffff'
  }

  /** canvas/独立 SVG 用解析后的条色：currentColor/预设名解析为具体色值（不可解析时回退） */
  private resolveFgForCanvas(): string {
    const v = this.getAttr('color', '').trim()
    try {
      if (v) {
        if (PRESET_COLORS.has(v)) {
          const token = getComputedStyle(this).getPropertyValue(`--oas-preset-${v}`).trim()
          return token || `var(--oas-preset-${v})`
        }
        return v
      }
      const computed = getComputedStyle(this).getPropertyValue('--oas-barcode-color').trim()
      if (computed) return computed
    } catch {
      // happy-dom 等无布局环境：走回退
    }
    return v ? (PRESET_COLORS.has(v) ? `var(--oas-preset-${v})` : v) : '#18181b'
  }

  /* ---------------- 下载（离屏 rasterize） ---------------- */

  /**
   * 下载当前条码为 PNG（离屏 rasterize：SVG-only 渲染架构不引入常驻 canvas）。
   * 静区/颜色/文字与屏幕渲染一致；非法或空值静默返回（不产出不可扫的图）。
   */
  async download(filename = 'barcode.png'): Promise<void> {
    const value = this.getAttr('value', '')
    if (!value) return
    let result: EncodeResult
    try {
      result = encodeBarcode(value, this.normalizeFormat())
    } catch (e) {
      if (e instanceof BarcodeEncodeError) return
      throw e
    }
    const svgUrl = this.buildSvgDataUrl(result, 4)

    const img = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Barcode SVG rasterize failed'))
    })
    img.src = svgUrl
    await loaded

    const { width, height } = this.renderInner(result)
    const scale = 4
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  /** 生成独立 SVG 数据 URL（显式色值，避免 var()/继承序列化丢失；与屏幕渲染同一渲染核心） */
  private buildSvgDataUrl(result: EncodeResult, scale: number): string {
    const { inner, width, height } = this.renderInner(result, {
      fg: this.resolveFgForCanvas(),
      bg: this.resolveBgForCanvas(),
    })
    // 内容整体缩放（不改内部坐标）；等比以最长边为准（一维条码宽远大于高）
    const w = width * scale
    const h = height * scale
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${width} ${height}"><g transform="scale(${scale})">${inner}</g></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
}

/** 坐标收敛两位小数：避免浮点噪声进路径/属性（体积 + 可读性） */
function round2(v: number): number {
  return Number(v.toFixed(2))
}

/** HTML 属性值转义（注入模板字符串前防断链） */
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 错误原因 → i18n 键尾（charset → Charset） */
function cap(reason: string): string {
  return reason.charAt(0).toUpperCase() + reason.slice(1)
}
