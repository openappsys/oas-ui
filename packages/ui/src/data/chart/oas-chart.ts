import { OASElement, escapeText, escapeAttr } from '@oas-ui/core'

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'stacked-bar' | 'radar' | 'polar-area'

export interface ChartDatum {
  label: string
  value: number
}

export interface ChartSeries {
  name: string
  data: number[]
  /** 系列绑定的 y 轴下标（双轴）：0 左（默认）| 1 右；仅直角坐标系图型消费 */
  yAxisIndex?: 0 | 1
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
  /** 面积图垂直渐变填充（默认 false 纯色半透明；true 时顶部系列色 0.35 → 底部全透明） */
  gradient?: boolean
  /** radar 全局量程上限（缺省取全系列 max 走 niceTicks；v1 全局统一量程，不做 per-dim） */
  max?: number
  /** radar 网格形态：'polygon' 同心多边形（默认）| 'circle' 同心圆 */
  radarShape?: 'polygon' | 'circle'
  /** 双轴：y 轴数组。长度 ≥2 且第 2 项存在即启用右轴；name 为轴名（渲染在轴顶） */
  yAxis?: [{ name?: string }, { name?: string }?]
}

/** 默认系列配色（只用 token，含暗色变体） */
const PALETTE = [
  'var(--oas-color-primary)',
  'var(--oas-color-success)',
  'var(--oas-color-warning)',
  'var(--oas-color-danger)',
]

/** 面积图渐变 id 计数器（同页多组件实例防 id 冲突） */
let areaGradSeq = 0

/** 折线图配色类：color 继承 → 元素 stroke/fill 用 currentColor */
const SWATCH_CLASSES = ['c0', 'c1', 'c2', 'c3']

/** 环形图镂空比例（内半径 = 外半径 × 该值） */
const DONUT_HOLE_RATIO = 0.62

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
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
/* 双轴轴名（轴顶标注，text-anchor 由渲染按左右归属给出） */
.axis-name {
  fill: var(--oas-color-text-secondary);
  font-size: 11px;
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
/* 面积图填充：折线下方半透明区域（多系列叠加时仍可读） */
.area-path {
  fill: currentColor;
  opacity: 0.18;
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
/* 径向网格参考圈（polar-area 同心圈 / radar 圆形网格）：token 描边、无填充 */
.grid-ring {
  fill: none;
  stroke: var(--oas-color-border);
}
/* 雷达图：维度轴线和量程网格同 token，系列轮廓走折线描边规格 */
.radar-axis {
  stroke: var(--oas-color-border);
}
.radar-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.radar-area {
  fill: currentColor;
  opacity: 0.18;
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
  .dot.animate,
  .area-path.animate,
  .radar-area.animate,
  .radar-line.animate {
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
/** 双轴模式右缘留白（对称左轴刻度列宽） */
const PAD_R_DUAL = 42

/**
 * oas-chart —— 自研 SVG 图表（零第三方引擎）。
 *
 * 属性（kebab-case）：
 * - `type`：line / bar / pie / area / donut / stacked-bar，默认 line
 * - `data`：JSON 字符串（数组单系列 `[{label,value}]` 或对象多系列
 *   `{labels:[...], series:[{name,data:[...]}]}`），property `data` 优先
 * - `options`：JSON 字符串（smooth / colors / showLegend）
 *
 * 渲染：SVG path/rect/circle 手写折线/柱状/饼图/面积/环形/堆叠柱状；坐标轴刻度 + 网格线；
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

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper" role="img" aria-label="">
        <svg class="chart" part="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="presentation" focusable="false"></svg>
        <div class="legend" part="legend" hidden></div>
        <div class="empty" part="empty" hidden></div>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；chart 无事件绑定，图形渲染由 update 驱动） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（svg 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('svg')) return false
    this.bind()
    return true
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

  /** 渲染主体图形（line/bar/pie/area/donut/stacked-bar/radar/polar-area 八型） */
  private renderBody(type: ChartType, data: ChartData, options: ChartOptions): string {
    if (type === 'pie') return this.renderPie(data, options)
    if (type === 'donut') return this.renderDonut(data, options)
    if (type === 'stacked-bar') return this.renderStackedBars(data, options)
    if (type === 'polar-area') return this.renderPolarArea(data, options)
    if (type === 'radar') return this.renderRadar(data, options)
    if (type === 'area') return this.renderArea(data, options)
    return type === 'bar' ? this.renderBars(data, options) : this.renderLine(data, options)
  }

  /**
   * 雷达图：labels 即维度名（与折线/柱状共享同一数据心智），每维度等角（顶轴 12 点方向起、顺时针）。
   * 量程：options.max 全局统一量程（缺省取全系列 max 走 niceTicks）；网格默认同心多边形，
   * options.radarShape='circle' 换同心圆；刻度值沿顶轴标注；维度名在顶点外侧。
   * 每系列一个半透明填充多边形 + 描边轮廓，顶点数据点带原生 `<title>`（维度名: 值）。
   */
  private renderRadar(data: ChartData, options: ChartOptions): string {
    const dims = data.labels.length
    if (dims === 0) return ''

    const cx = W / 2
    const cy = H / 2
    const r = Math.min(W, H) / 2 - 40

    // 量程：options.max 优先（全局统一量程，4 等分）；缺省 niceTicks
    let scaleMax: number
    let step: number
    if (options.max != null && options.max > 0) {
      scaleMax = options.max
      step = options.max / 4
    } else {
      const ticks = this.niceTicks(this.maxValue(data))
      scaleMax = ticks.max
      step = ticks.step
    }

    const angleAt = (k: number): number => ((-90 + (k * 360) / dims) * Math.PI) / 180
    const pointAt = (k: number, ratio: number): { x: number; y: number } => ({
      x: cx + r * ratio * Math.cos(angleAt(k)),
      y: cy + r * ratio * Math.sin(angleAt(k)),
    })
    const polygonAt = (ratio: number): string =>
      Array.from({ length: dims }, (_, k) => {
        const p = pointAt(k, ratio)
        return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      }).join(' ')

    let out = ''

    // 同心网格：4 层（不含中心点）；radarShape=circle 用同心圆，缺省同心多边形
    const circle = options.radarShape === 'circle'
    for (let i = 1; i <= 4; i++) {
      const ratio = i / 4
      if (circle) {
        out += `<circle class="grid-ring" cx="${cx}" cy="${cy}" r="${(r * ratio).toFixed(1)}"></circle>`
      } else {
        out += `<polygon class="grid-ring" points="${polygonAt(ratio)}"></polygon>`
      }
    }

    // 维度轴线：中心 → 顶点
    for (let k = 0; k < dims; k++) {
      const p = pointAt(k, 1)
      out += `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"></line>`
    }

    // 刻度值沿顶轴标注（i=1..4 档）
    for (let i = 1; i <= 4; i++) {
      const y = cy - r * (i / 4)
      out += `<text class="axis-text" x="${cx + 5}" y="${(y + 3).toFixed(1)}" text-anchor="start">${Math.round(step * i)}</text>`
    }

    // 维度名：顶点外侧（按方位选 text-anchor 与基线偏移）
    for (let k = 0; k < dims; k++) {
      const p = pointAt(k, 1)
      const dx = Math.cos(angleAt(k))
      const dy = Math.sin(angleAt(k))
      const anchor = Math.abs(dx) < 0.3 ? 'middle' : dx > 0 ? 'start' : 'end'
      const labelY = p.y + (dy < -0.3 ? -6 : dy > 0.3 ? 12 : 4)
      const labelX = p.x + (Math.abs(dx) < 0.3 ? 0 : dx > 0 ? 6 : -6)
      out += `<text class="axis-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}">${this.escapeText(data.labels[k] ?? '')}</text>`
    }

    // 系列多边形：填充（半透明）+ 描边 + 顶点 title
    data.series.forEach((series, si) => {
      const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
      const color = options.colors?.[si]
      const pts = series.data.map((v, k) => pointAt(k, Math.max(0, (Number(v) || 0) / (scaleMax || 1))))
      const d = pts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
      const points = pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      const style = color ? ` style="color:${color}"` : ''
      out += `<polygon class="radar-area ${cls} animate" points="${points}"${style}></polygon>`
      out += `<path class="radar-line ${cls} animate" d="${d}" fill="none"${style}></path>`
      pts.forEach((p, k) => {
        const label = this.datumLabel(data.labels[k] ?? '', series.data[k] ?? 0)
        out += `<circle class="dot ${cls} animate" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"${style}><title>${this.escapeAttr(label)}</title></circle>`
      })
    })
    return out
  }

  /**
   * 直角坐标系轴上下文（renderLine/renderBars/renderArea 共用）：
   * 单轴=全系列左轴 niceTicks；双轴=按 series.yAxisIndex 分组各算量程，
   * 副轴以主轴档数为锚 alignTicks 重算 niceStep（刻度错位误读根治）。
   */
  private axisContext(
    data: ChartData,
    options: ChartOptions,
  ): {
    padR: number
    plotW: number
    dual: boolean
    ticksFor: (axis: 0 | 1) => { max: number; step: number; values: number[] }
    yAt: (axis: 0 | 1, v: number) => number
    grid: (plotH: number) => string
  } {
    const plotH = H - PAD.t - PAD.b
    const dual = this.isDualAxis(options)
    const padR = dual ? PAD_R_DUAL : PAD.r
    const plotW = W - PAD.l - padR
    const left = dual ? this.alignTicksTo(this.maxForAxis(data, 0), 4) : this.niceTicks(this.maxValue(data))
    // alignTicks：以主轴档数（左轴刻度数 - 1 段）为锚，副轴同档数重算 niceStep
    const right = dual ? this.alignTicksTo(this.maxForAxis(data, 1), left.values.length - 1) : null
    const ticksFor = (axis: 0 | 1): { max: number; step: number; values: number[] } =>
      axis === 1 && right ? right : left
    const yAt = (axis: 0 | 1, v: number): number => {
      const t = ticksFor(axis)
      return PAD.t + plotH - (t.max > 0 ? (v / t.max) * plotH : 0)
    }
    const grid = (ph: number): string =>
      dual
        ? this.renderGrid(left, ph, {
            padR,
            rightTicks: right,
            names: [options.yAxis?.[0]?.name, options.yAxis?.[1]?.name],
          })
        : this.renderGrid(left, ph)
    return { padR, plotW, dual, ticksFor, yAt, grid }
  }

  /** 折线图：网格 + y 刻度 + x 分类 + 每系列 path + 数据点 title */
  private renderLine(data: ChartData, options: ChartOptions): string {
    const { plotW, yAt, grid } = this.axisContext(data, options)
    const plotH = H - PAD.t - PAD.b
    const n = data.labels.length

    let out = grid(plotH)
    out += this.renderXLabels(data.labels, plotW, 'top')

    const stepX = n > 1 ? plotW / (n - 1) : plotW / 2
    const xAt = (i: number): number => PAD.l + (n > 1 ? i * stepX : stepX)

    data.series.forEach((series, si) => {
      const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
      const color = options.colors?.[si]
      const axis = this.axisOf(series)
      const pts = series.data.map((v, i) => ({ x: xAt(i), y: yAt(axis, v) }))
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

  /** 面积图：折线 + 闭合到基线的半透明填充（多系列叠加显示） */
  private renderArea(data: ChartData, options: ChartOptions): string {
    const { plotW, yAt, grid } = this.axisContext(data, options)
    const plotH = H - PAD.t - PAD.b
    const n = data.labels.length

    let out = grid(plotH)
    out += this.renderXLabels(data.labels, plotW, 'top')

    // 渐变填充（可选）：每系列一个垂直 linearGradient（顶部系列色 0.35 → 底部全透明），
    // id 模块级递增防同页多实例冲突；area-path 用内联 style 覆盖 CSS 的 currentColor+opacity
    const useGrad = options.gradient === true
    let defs = ''

    const stepX = n > 1 ? plotW / (n - 1) : plotW / 2
    const xAt = (i: number): number => PAD.l + (n > 1 ? i * stepX : stepX)
    const baseY = PAD.t + plotH

    data.series.forEach((series, si) => {
      const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
      const color = options.colors?.[si]
      const axis = this.axisOf(series)
      const pts = series.data.map((v, i) => ({ x: xAt(i), y: yAt(axis, v) }))
      const path = options.smooth
        ? this.smoothPath(pts)
        : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      // 填充：折线 + 末点垂线到底 + 沿基线回到首点 + 闭合
      const lastI = Math.min(n, series.data.length) - 1
      const fill = `${path} L ${xAt(lastI).toFixed(1)} ${baseY.toFixed(1)} L ${xAt(0).toFixed(1)} ${baseY.toFixed(1)} Z`
      let areaStyle = color ? ` style="color:${color}"` : ''
      if (useGrad) {
        const gid = `oas-chart-ag-${++areaGradSeq}`
        const col = color ?? PALETTE[si % PALETTE.length]
        defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="0.35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`
        areaStyle = ` style="fill:url(#${gid});opacity:1"`
      }
      out += `<path class="area-path ${cls} animate" d="${fill}"${areaStyle}></path>`
      out += `<path class="line-path ${cls} animate" d="${path}"${color ? ` style="color:${color}"` : ''}></path>`
      pts.forEach((p, i) => {
        const label = this.datumLabel(data.labels[i] ?? '', series.data[i] ?? 0)
        out += `<circle class="dot ${cls} animate" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"><title>${this.escapeAttr(label)}</title></circle>`
      })
    })
    return defs + out
  }

  /** 柱状图：网格 + 分组柱 rect + x 分类 + title */
  private renderBars(data: ChartData, options: ChartOptions): string {
    const { plotW, ticksFor, grid } = this.axisContext(data, options)
    const plotH = H - PAD.t - PAD.b
    const n = data.labels.length
    const m = data.series.length

    let out = grid(plotH)
    out += this.renderXLabels(data.labels, plotW, 'middle')

    const bandW = plotW / n
    const barW = m > 1 ? (bandW * 0.72) / m : bandW * 0.45
    const groupGap = m > 1 ? bandW * 0.14 : 0

    data.series.forEach((series, si) => {
      const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
      const color = options.colors?.[si]
      const ticks = ticksFor(this.axisOf(series))
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

  /** 堆叠柱状图：每分类各系列自底向上堆叠，柱高=分类合计，刻度按合计计算 */
  private renderStackedBars(data: ChartData, options: ChartOptions): string {
    const plotW = W - PAD.l - PAD.r
    const plotH = H - PAD.t - PAD.b
    const n = data.labels.length
    const m = data.series.length

    // 堆叠基准：每分类各系列之和的最大值
    const stackMax = Math.max(
      0,
      ...data.labels.map((_, i) => data.series.reduce((acc, s) => acc + Math.max(0, s.data[i] ?? 0), 0)),
    )
    const ticks = this.niceTicks(stackMax)
    const bandW = plotW / n
    const barW = bandW * 0.6

    let out = this.renderGrid(ticks, plotH)
    out += this.renderXLabels(data.labels, plotW, 'middle')

    data.labels.forEach((_, i) => {
      let acc = 0
      data.series.forEach((series, si) => {
        const v = Math.max(0, series.data[i] ?? 0)
        const cls = SWATCH_CLASSES[si % SWATCH_CLASSES.length]!
        const color = options.colors?.[si]
        const h = ticks.max > 0 ? (v / ticks.max) * plotH : 0
        const y = PAD.t + plotH - acc - h
        const x = PAD.l + i * bandW + (bandW - barW) / 2
        const title = this.datumLabel(data.labels[i] ?? '', v)
        out += `<rect class="bar ${cls} animate" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, barW).toFixed(1)}" height="${h.toFixed(1)}" rx="2"${color ? ` style="color:${color}"` : ''}><title>${this.escapeAttr(title)}</title></rect>`
        acc += h
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

  /** 环形图：饼图镂空（内半径 = 外半径 × DONUT_HOLE_RATIO），每段环带 arc + 百分比 title */
  private renderDonut(data: ChartData, options: ChartOptions): string {
    const values = data.series[0]?.data ?? []
    const total = values.reduce((a, b) => a + Math.max(0, b), 0)
    if (total <= 0) return ''

    const cx = W / 2
    const cy = H / 2
    const r = Math.min(W, H) / 2 - 24
    const ir = r * DONUT_HOLE_RATIO

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
      const ix1 = cx + ir * Math.cos(a2)
      const iy1 = cy + ir * Math.sin(a2)
      const ix2 = cx + ir * Math.cos(a1)
      const iy2 = cy + ir * Math.sin(a1)
      const cls = SWATCH_CLASSES[i % SWATCH_CLASSES.length]!
      const color = options.colors?.[i]
      const label = `${this.datumLabel(data.labels[i] ?? '', v)} (${Math.round((v / total) * 100)}%)`
      out += `<path class="slice ${cls} animate" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix1.toFixed(1)} ${iy1.toFixed(1)} A ${ir} ${ir} 0 ${large} 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)} Z"${color ? ` style="color:${color}"` : ''}><title>${this.escapeAttr(label)}</title></path>`
      angle += sweep
    })
    return out
  }

  /**
   * 极坐标面积图（玫瑰图）：每分类等角扇区（跨度 = 360/n），半径编码数值（最大值满半径）。
   * 单系列（取 series[0]，与 pie/donut 同心智）；不显示占比百分比（半径是量级刻度不是份额）。
   * 同心参考圈（1/3、2/3、满半径）提供径向读数依据，不标刻度数字。
   */
  private renderPolarArea(data: ChartData, options: ChartOptions): string {
    const values = data.series[0]?.data ?? []
    const maxV = Math.max(0, ...values.map((v) => Number(v) || 0))
    if (maxV <= 0) return ''

    const cx = W / 2
    const cy = H / 2
    const r = Math.min(W, H) / 2 - 24

    // 同心参考圈：径向量级读数依据（token 描边、无填充）
    let out = ''
    for (const ratio of [1 / 3, 2 / 3, 1]) {
      out += `<circle class="grid-ring" cx="${cx}" cy="${cy}" r="${(r * ratio).toFixed(1)}"></circle>`
    }

    const n = values.length
    const sweep = 360 / n
    let angle = -90
    values.forEach((raw, i) => {
      const v = Math.max(0, Number(raw) || 0)
      const ri = (v / maxV) * r
      const a1 = (angle * Math.PI) / 180
      const a2 = ((angle + sweep) * Math.PI) / 180
      const large = sweep > 180 ? 1 : 0
      const x1 = cx + ri * Math.cos(a1)
      const y1 = cy + ri * Math.sin(a1)
      const x2 = cx + ri * Math.cos(a2)
      const y2 = cy + ri * Math.sin(a2)
      const cls = SWATCH_CLASSES[i % SWATCH_CLASSES.length]!
      const color = options.colors?.[i]
      const label = this.datumLabel(data.labels[i] ?? '', v)
      out += `<path class="slice ${cls} animate" d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${ri.toFixed(1)} ${ri.toFixed(1)} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z"${color ? ` style="color:${color}"` : ''}><title>${this.escapeAttr(label)}</title></path>`
      angle += sweep
    })
    return out
  }

  /**
   * 水平网格线 + y 轴刻度文字（单轴：左轴；双轴：网格线按左轴画、右轴刻度贴右缘标注，
   * 避免双网格视觉混乱；轴名渲染在轴顶。刻度档数两轴一致（alignTicks 锚定））
   */
  private renderGrid(
    ticks: { max: number; step: number; values: number[] },
    plotH: number,
    opts?: { padR?: number; rightTicks?: { max: number; step: number } | null; names?: [string?, string?] },
  ): string {
    const padR = opts?.padR ?? PAD.r
    const right = opts?.rightTicks ?? null
    const names = opts?.names
    let out = ''
    const lines = ticks.values.length
    for (let i = 0; i < lines; i++) {
      const ratio = i / (lines - 1)
      const y = PAD.t + plotH - ratio * plotH
      out += `<line class="axis-line" x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"></line>`
      out += `<text class="axis-text" x="${PAD.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${Math.round(ticks.step * i)}</text>`
      if (right) {
        out += `<text class="axis-text" x="${W - padR + 8}" y="${(y + 4).toFixed(1)}" text-anchor="start">${Math.round(right.step * i)}</text>`
      }
    }
    if (names?.[0]) {
      out += `<text class="axis-name" x="${PAD.l}" y="10" text-anchor="start">${this.escapeText(names[0])}</text>`
    }
    if (names?.[1]) {
      out += `<text class="axis-name" x="${W - padR}" y="10" text-anchor="end">${this.escapeText(names[1])}</text>`
    }
    return out
  }

  /** x 轴分类文字（折线对齐点、柱状对齐柱组中线） */
  private renderXLabels(labels: string[], plotW: number, anchor: 'top' | 'middle'): string {
    let out = ''
    const n = labels.length
    const bandW = plotW / n
    for (let i = 0; i < n; i++) {
      const cx =
        anchor === 'middle' ? PAD.l + i * bandW + bandW / 2 : n > 1 ? PAD.l + (i * plotW) / (n - 1) : PAD.l + plotW / 2
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
    return this.alignTicksTo(rawMax, 4)
  }

  /** 以段数为锚重算 nice 刻度（双轴 alignTicks：副轴按主轴档数同档重算，消除刻度错位误读） */
  private alignTicksTo(rawMax: number, segments: number): { max: number; step: number; values: number[] } {
    const max = Math.max(0, rawMax)
    if (max === 0) return { max: 0, step: 0, values: Array.from({ length: segments + 1 }, () => 0) }
    const step = Math.ceil(max / segments)
    const top = step * segments
    return { max: top, step, values: Array.from({ length: segments + 1 }, (_, i) => i * step) }
  }

  /** 双轴模式：options.yAxis 声明了右轴（第 2 项存在）即启用；仅直角坐标系图型消费 */
  private isDualAxis(options: ChartOptions): boolean {
    return Array.isArray(options.yAxis) && options.yAxis.length > 1 && options.yAxis[1] != null
  }

  /** 系列绑定的 y 轴（缺省/非法值归左轴 0） */
  private axisOf(series: ChartSeries): 0 | 1 {
    return series.yAxisIndex === 1 ? 1 : 0
  }

  /** 指定轴的量程基准：该轴绑定系列的 max（无绑定系列 → 0） */
  private maxForAxis(data: ChartData, axis: 0 | 1): number {
    let max = 0
    for (const s of data.series) {
      if (this.axisOf(s) !== axis) continue
      for (const v of s.data) max = Math.max(max, Number(v) || 0)
    }
    return max
  }

  /** 折线平滑：Catmull-Rom 转三次贝塞尔——曲线经过每个数据点（端点处重用端点；控制点由相邻点 1/6 张力算出）。
      此前中点二次贝塞尔（midpoint smoothing）曲线在点间中点穿过、不过数据点，dot 偏离（实测"点不在线上"） */
  private smoothPath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length < 2) return pts.length === 1 ? `M ${pts[0]!.x} ${pts[0]!.y}` : ''
    const f = (n: number): string => n.toFixed(1)
    const n = pts.length
    let d = `M ${f(pts[0]!.x)} ${f(pts[0]!.y)}`
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]! // 前前点（首段重用首点）
      const p1 = pts[i]!
      const p2 = pts[i + 1]!
      const p3 = pts[Math.min(n - 1, i + 2)]! // 后后点（末段重用末点）
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`
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
      const labels = Array.isArray(obj.labels) ? obj.labels.map((l) => String(l)) : []
      const series = Array.isArray(obj.series)
        ? obj.series
            .map((s): ChartSeries | null => {
              if (!s || typeof s !== 'object') return null
              const rec = s as Record<string, unknown>
              const data = Array.isArray(rec.data)
                ? rec.data.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
                : []
              if (data.length === 0) return null
              const yAxisIndex = rec.yAxisIndex === 1 ? 1 : rec.yAxisIndex === 0 ? 0 : undefined
              return yAxisIndex === 1
                ? { name: rec.name != null ? String(rec.name) : '', data, yAxisIndex }
                : { name: rec.name != null ? String(rec.name) : '', data }
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
    if (typeof obj.gradient === 'boolean') out.gradient = obj.gradient
    if (typeof obj.max === 'number' && Number.isFinite(obj.max)) out.max = obj.max
    if (obj.radarShape === 'circle' || obj.radarShape === 'polygon') out.radarShape = obj.radarShape
    if (Array.isArray(obj.colors)) out.colors = obj.colors.map((c) => String(c))
    if (Array.isArray(obj.yAxis)) {
      const axes = obj.yAxis
        .slice(0, 2)
        .map((a) =>
          a && typeof a === 'object' && typeof (a as Record<string, unknown>).name === 'string'
            ? { name: String((a as Record<string, unknown>).name) }
            : null,
        )
      if (axes[0]) out.yAxis = [axes[0], axes[1] ?? undefined]
    }
    return out
  }

  private escapeText(text: string): string {
    return escapeText(text)
  }

  private escapeAttr(text: string): string {
    return escapeAttr(text)
  }
}
