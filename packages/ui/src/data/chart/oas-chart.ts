import { OASElement } from '@oas-ui/core'

export type ChartType = 'line' | 'bar' | 'pie'

export interface ChartDatum {
  label: string
  value: number
}

export interface ChartSeries {
  name: string
  data: number[]
}

export interface ChartData {
  labels: string[]
  series: ChartSeries[]
}

export interface ChartOptions {
  /** 折线平滑曲线（默认 false） */
  smooth?: boolean
  /** 自定义系列配色（覆盖默认 token 色，可传 CSS 变量或任意色值） */
  colors?: string[]
  /** 是否显示图例（默认多系列时显示） */
  showLegend?: boolean
}

/** 默认系列配色（只用 token，含暗色变体） */
const PALETTE = [
  'var(--oas-color-primary)',
  'var(--oas-color-success)',
  'var(--oas-color-warning)',
  'var(--oas-color-danger)',
]

/** 折线图配色类：color 继承 → 元素 stroke/fill 用 currentColor */
const SWATCH_CLASSES = ['c0', 'c1', 'c2', 'c3']

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
[part='wrapper'] {
  display: block;
}
svg {
  display: block;
  width: 100%;
  height: auto;
}
[hidden] {
  display: none !important;
}
.axis-line {
  stroke: var(--oas-color-border);
}
.axis-text {
  fill: var(--oas-color-text-secondary);
  font-size: 12px;
}
.axis-label {
  fill: var(--oas-color-text-secondary);
  font-size: 12px;
  text-anchor: middle;
}
/* 系列配色：通过 color 继承到 SVG 元素（stroke/fill 用 currentColor） */
.c0 { color: var(--oas-color-primary); }
.c1 { color: var(--oas-color-success); }
.c2 { color: var(--oas-color-warning); }
.c3 { color: var(--oas-color-danger); }
/* 折线 */
.line-path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.dot {
  fill: currentColor;
  stroke: var(--oas-color-bg);
  stroke-width: 1.5;
}
/* 柱状 */
.bar {
  fill: currentColor;
}
/* 饼图 */
.slice {
  fill: currentColor;
  stroke: var(--oas-color-bg);
  stroke-width: 1;
}
/* 图例 */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-3);
  margin-top: var(--oas-space-2);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}
/* 空态 */
.empty {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
/* 数据更新动画：prefers-reduced-motion 时全局/局部关闭 */
@media (prefers-reduced-motion: no-preference) {
  .bar.animate {
    transform-box: fill-box;
    transform-origin: bottom;
    animation: oas-chart-grow 0.5s var(--oas-ease-out);
  }
  .slice.animate,
  .line-path.animate,
  .dot.animate {
    animation: oas-chart-fade 0.5s var(--oas-ease-out);
  }
}
@keyframes oas-chart-grow {
  from { transform: scaleY(0); }
}
@keyframes oas-chart-fade {
  from { opacity: 0; }
}
`

// 内部坐标系（viewBox），width:100% 等比缩放
const W = 520
const H = 280
const PAD = { l: 42, r: 12, t: 16, b: 30 }

/**
 * oas-chart —— 自研 SVG 图表（零第三方引擎）。
 *
 * 属性（kebab-case）：
 * - `type`：line / bar / pie，默认 line
 * - `data`：JSON 字符串（数组单系列 `[{label,value}]` 或对象多系列
 *   `{labels:[...], series:[{name,data:[...]}]}`），property `data` 优先
 * - `options`：JSON 字符串（smooth / colors / showLegend）
 *
 * 渲染：SVG path/rect/circle 手写折线/柱状/饼图；坐标轴刻度 + 网格线；
 * 每个数据点带原生 `<title>` 悬停显示数值；数据更新整体重绘（qrcode 同模式）。
 * 颜色只用 token（primary/success/warning/danger 系列，可 options.colors 覆盖）。
 * ARIA：容器 role="img" + aria-label（组件属性优先，缺省按类型走 i18n）。
 * 空态：无/非法数据 → 空态占位。
 */
export class OASChart extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'data', 'options', 'aria-label']
  }

  private dataProp: ChartData | null = null
  private optionsProp: ChartOptions | null = null

  get data(): unknown {
    return this.dataProp
  }

  set data(value: unknown) {
    this.dataProp = this.normalizeData(value)
    if (this.isConnected) this.update()
  }

  get options(): unknown {
    return this.optionsProp
  }

  set options(value: unknown) {
    this.optionsProp = this.normalizeOptions(value)
    if (this.isConnected) this.update()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper" role="img" aria-label="">
        <svg class="chart" part="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="presentation" focusable="false"></svg>
        <div class="legend" part="legend" hidden></div>
        <div class="empty" part="empty" hidden></div>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const wrapper = this.shadow.querySelector<HTMLElement>('[part="wrapper"]')
    const svg = this.shadow.querySelector<SVGSVGElement>('svg')
    const legend = this.shadow.querySelector<HTMLElement>('[part="legend"]')
    const empty = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    if (!wrapper || !svg || !legend || !empty) return

    const type = this.getAttr('type', 'line') as ChartType
    const data = this.resolveData()
    const options = this.resolveOptions()

    // aria-label：组件属性优先，缺省按类型走 i18n
    wrapper.setAttribute('aria-label', this.getAttribute('aria-label') ?? this.t(`chart.${type}`))

    if (!data || data.series.length === 0 || data.labels.length === 0) {
      svg.setAttribute('hidden', '')
      legend.setAttribute('hidden', '')
      empty.removeAttribute('hidden')
      empty.textContent = this.t('chart.empty')
      return
    }
    svg.removeAttribute('hidden')
    empty.setAttribute('hidden', '')

    const maxPoints = Math.max(...data.series.map((s) => s.data.length), 0)
    if (maxPoints === 0) {
      svg.setAttribute('hidden', '')
      legend.setAttribute('hidden', '')
      empty.removeAttribute('hidden')
      empty.textContent = this.t('chart.empty')
      return
    }

    svg.innerHTML = this.renderBody(type, data, options)
    this.renderLegend(legend, data, options)
  }

  /** 渲染主体图形（line/bar/pie 三型） */
  private renderBody(type: ChartType, data: ChartData, options: ChartOptions): string {
    if (type === 'pie') return this.renderPie(data, options)
    return type === 'bar' ? this.renderBars(data, options) : this.renderLine(data, options)
  }

  /** 折线图：网格 + y 刻度 + x 分类 + 每系列 path + 数据点 title */
  private renderLine(data: ChartData, options: ChartOptions): string {
    const plotW = W - PAD.l - PAD.r
    const plotH = H - PAD.t - PAD.b
    const maxVal = this.maxValue(data)
    const ticks = this.niceTicks(maxVal)
    const n = data.labels.length

    let out = this.renderGrid(ticks, plotH)
    out += this.renderXLabels(data.labels, plotW, 'top')

    const stepX = n > 1 ? plotW / (n - 1) : plotW / 2
    const xAt = (i: number): number => PAD.l + (n > 1 ? i * stepX : stepX)
    const yAt = (v: number): number => PAD.t + plotH - (ticks.max > 0 ? (v / ticks.max) * plotH : 0)

    data.series.forEach((series, si) => {
      const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
      const color = options.colors?.[si]
      const pts = series.data.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
      const path = options.smooth
        ? this.smoothPath(pts)
        : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      out += `<path class="line-path ${cls} animate" d="${path}"${color ? ` style="color:${color}"` : ''}></path>`
      pts.forEach((p, i) => {
        const label = this.datumLabel(data.labels[i] ?? '', series.data[i] ?? 0)
        out += `<circle class="dot ${cls} animate" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"><title>${this.escapeAttr(label)}</title></circle>`
      })
    })
    return out
  }

  /** 柱状图：网格 + 分组柱 rect + x 分类 + title */
  private renderBars(data: ChartData, options: ChartOptions): string {
    const plotW = W - PAD.l - PAD.r
    const plotH = H - PAD.t - PAD.b
    const maxVal = this.maxValue(data)
    const ticks = this.niceTicks(maxVal)
    const n = data.labels.length
    const m = data.series.length

    let out = this.renderGrid(ticks, plotH)
    out += this.renderXLabels(data.labels, plotW, 'middle')

    const bandW = plotW / n
    const barW = m > 1 ? (bandW * 0.72) / m : bandW * 0.45
    const groupGap = m > 1 ? bandW * 0.14 : 0

    data.series.forEach((series, si) => {
      const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
      const color = options.colors?.[si]
      series.data.forEach((v, i) => {
        const h = ticks.max > 0 ? Math.max(0, (v / ticks.max) * plotH) : 0
        const x = PAD.l + i * bandW + groupGap / 2 + si * (barW + (m > 1 ? 1 : 0))
        const y = PAD.t + plotH - h
        const label = this.datumLabel(data.labels[i] ?? '', v)
        out += `<rect class="bar ${cls} animate" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, barW).toFixed(1)}" height="${h.toFixed(1)}" rx="2"${color ? ` style="color:${color}"` : ''}><title>${this.escapeAttr(label)}</title></rect>`
      })
    })
    return out
  }

  /** 饼图：每数据一段扇区 path + 百分比 title */
  private renderPie(data: ChartData, options: ChartOptions): string {
    const values = data.series[0]?.data ?? []
    const total = values.reduce((a, b) => a + Math.max(0, b), 0)
    if (total <= 0) return ''

    const cx = W / 2
    const cy = H / 2
    const r = Math.min(W, H) / 2 - 24

    let out = ''
    let angle = -90
    values.forEach((raw, i) => {
      const v = Math.max(0, raw)
      const sweep = (v / total) * 360
      const a1 = (angle * Math.PI) / 180
      const a2 = ((angle + sweep) * Math.PI) / 180
      const large = sweep > 180 ? 1 : 0
      const x1 = cx + r * Math.cos(a1)
      const y1 = cy + r * Math.sin(a1)
      const x2 = cx + r * Math.cos(a2)
      const y2 = cy + r * Math.sin(a2)
      const cls = SWATCH_CLASSES[i % SWATCH_CLASSES.length]!
      const color = options.colors?.[i]
      const label = `${this.datumLabel(data.labels[i] ?? '', v)} (${Math.round((v / total) * 100)}%)`
      out += `<path class="slice ${cls} animate" d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z"${color ? ` style="color:${color}"` : ''}><title>${this.escapeAttr(label)}</title></path>`
      angle += sweep
    })
    return out
  }

  /** 水平网格线 + y 轴刻度文字 */
  private renderGrid(ticks: { max: number; step: number; values: number[] }, plotH: number): string {
    let out = ''
    const lines = 5
    for (let i = 0; i < lines; i++) {
      const ratio = i / (lines - 1)
      const y = PAD.t + plotH - ratio * plotH
      const value = ticks.step * i
      out += `<line class="axis-line" x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}"></line>`
      out += `<text class="axis-text" x="${PAD.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${Math.round(value)}</text>`
    }
    void ticks.values
    return out
  }

  /** x 轴分类文字（折线对齐点、柱状对齐柱组中线） */
  private renderXLabels(labels: string[], plotW: number, anchor: 'top' | 'middle'): string {
    let out = ''
    const n = labels.length
    const bandW = plotW / n
    for (let i = 0; i < n; i++) {
      const cx =
        anchor === 'middle'
          ? PAD.l + i * bandW + bandW / 2
          : n > 1
            ? PAD.l + (i * plotW) / (n - 1)
            : PAD.l + plotW / 2
      out += `<text class="axis-label" x="${cx.toFixed(1)}" y="${H - 8}">${this.escapeText(labels[i] ?? '')}</text>`
    }
    return out
  }

  private renderLegend(legend: HTMLElement, data: ChartData, options: ChartOptions): void {
    const show = data.series.length > 1 && options.showLegend !== false
    legend.hidden = !show
    if (!show) return
    legend.innerHTML = data.series
      .map((s, i) => {
        const cls = SWATCH_CLASSES[i % SWATCH_CLASSES.length]!
        const color = options.colors?.[i]
        return `<span class="legend-item"><i class="legend-dot ${cls}"${color ? ` style="color:${color}"` : ''}></i><span class="legend-name">${this.escapeText(s.name)}</span></span>`
      })
      .join('')
  }

  private datumLabel(label: string, value: number): string {
    return `${label}: ${value}`
  }

  private maxValue(data: ChartData): number {
    let max = 0
    for (const s of data.series) for (const v of s.data) max = Math.max(max, Number(v) || 0)
    return max
  }

  /** 生成 nice 刻度：max 上取整为 4 等分的整步长 */
  private niceTicks(rawMax: number): { max: number; step: number; values: number[] } {
    const max = Math.max(0, rawMax)
    if (max === 0) return { max: 0, step: 0, values: [0, 0, 0, 0, 0] }
    const step = Math.ceil(max / 4)
    const top = step * 4
    return { max: top, step, values: [0, 1, 2, 3, 4].map((i) => i * step) }
  }

  /** 折线平滑：相邻点中点作控制点的二次贝塞尔序列 */
  private smoothPath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length < 2) return pts.length === 1 ? `M ${pts[0]!.x} ${pts[0]!.y}` : ''
    let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]!
      const prev = pts[i - 1]!
      const mx = (prev.x + p.x) / 2
      d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${mx.toFixed(1)} ${p.y.toFixed(1)}`
    }
    return d
  }

  private resolveData(): ChartData | null {
    if (this.dataProp) return this.dataProp
    return this.normalizeData(this.getAttr('data', ''))
  }

  private normalizeData(value: unknown): ChartData | null {
    if (value == null || value === '') return null
    let parsed: unknown = value
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value)
      } catch {
        return null
      }
    }
    if (Array.isArray(parsed)) {
      const labels: string[] = []
      const data: number[] = []
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue
        const rec = item as Record<string, unknown>
        const label = rec.label != null ? String(rec.label) : ''
        const num = Number(rec.value)
        if (label === '') continue
        labels.push(label)
        data.push(Number.isFinite(num) ? num : 0)
      }
      if (labels.length === 0) return null
      return { labels, series: [{ name: '', data }] }
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const labels = Array.isArray(obj.labels)
        ? obj.labels.map((l) => String(l))
        : []
      const series = Array.isArray(obj.series)
        ? obj.series
            .map((s): ChartSeries | null => {
              if (!s || typeof s !== 'object') return null
              const rec = s as Record<string, unknown>
              const data = Array.isArray(rec.data)
                ? rec.data.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
                : []
              if (data.length === 0) return null
              return { name: rec.name != null ? String(rec.name) : '', data }
            })
            .filter((s): s is ChartSeries => s !== null)
        : []
      if (labels.length === 0 || series.length === 0) return null
      return { labels, series }
    }
    return null
  }

  private resolveOptions(): ChartOptions {
    if (this.optionsProp) return this.optionsProp
    return this.normalizeOptions(this.getAttr('options', ''))
  }

  private normalizeOptions(value: unknown): ChartOptions {
    if (value == null || value === '') return {}
    let parsed: unknown = value
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value)
      } catch {
        return {}
      }
    }
    if (!parsed || typeof parsed !== 'object') return {}
    const obj = parsed as Record<string, unknown>
    const out: ChartOptions = {}
    if (typeof obj.smooth === 'boolean') out.smooth = obj.smooth
    if (typeof obj.showLegend === 'boolean') out.showLegend = obj.showLegend
    if (Array.isArray(obj.colors)) out.colors = obj.colors.map((c) => String(c))
    return out
  }

  private escapeText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  private escapeAttr(text: string): string {
    return this.escapeText(text).replace(/"/g, '&quot;')
  }
}
