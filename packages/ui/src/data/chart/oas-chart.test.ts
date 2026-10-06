import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASChart } from './index.js'

const SINGLE = JSON.stringify([
  { label: '一月', value: 10 },
  { label: '二月', value: 20 },
  { label: '三月', value: 15 },
])

const MULTI = JSON.stringify({
  labels: ['一月', '二月', '三月'],
  series: [
    { name: 'A', data: [10, 20, 15] },
    { name: 'B', data: [5, 8, 12] },
  ],
})

function mount(attrs: Record<string, string> = {}): OASChart {
  const el = new OASChart()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function svgOf(el: OASChart): SVGSVGElement {
  return el.shadowRoot!.querySelector('svg')!
}

function wrapperOf(el: OASChart): HTMLElement {
  return el.shadowRoot!.querySelector('[part="wrapper"]')!
}

function emptyOf(el: OASChart): HTMLElement {
  return el.shadowRoot!.querySelector('[part="empty"]')!
}

describe('OASChart', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('默认 line 类型渲染折线 SVG（path + 数据点）', () => {
    const el = mount({ data: SINGLE })
    const svg = svgOf(el)
    expect(svg.querySelector('.line-path')).not.toBeNull()
    expect(svg.querySelectorAll('.dot').length).toBe(3)
  })

  it('type=bar 渲染柱状 rect', () => {
    const el = mount({ type: 'bar', data: SINGLE })
    expect(svgOf(el).querySelectorAll('.bar').length).toBe(3)
  })

  it('type=pie 渲染扇区 path 且带数值 title', () => {
    const el = mount({ type: 'pie', data: SINGLE })
    const slices = svgOf(el).querySelectorAll('.slice')
    expect(slices.length).toBe(3)
    expect(slices[0]!.querySelector('title')!.textContent).toContain('一月')
  })

  it('type=area 渲染面积图：折线 + 填充 path（填充闭合到基线）', () => {
    const el = mount({ type: 'area', data: SINGLE })
    const svg = svgOf(el)
    expect(svg.querySelectorAll('.line-path').length).toBe(1)
    expect(svg.querySelectorAll('.dot').length).toBe(3)
    const d = svg.querySelector('.area-path')!.getAttribute('d')!
    expect(d.startsWith('M')).toBe(true)
    // 基线 y = PAD.t + plotH = 16 + 234 = 250，填充必须闭合到基线
    expect(d).toContain('250.0')
    expect(d.endsWith('Z')).toBe(true)
  })

  it('type=area smooth：折线 path 收尾到最后数据点（不与末点脱节）', () => {
    const el = mount({ type: 'area', options: '{"smooth":true}', data: MULTI })
    const svg = svgOf(el)
    const dots = [...svg.querySelectorAll('.dot')]
    const lastDot = dots[dots.length - 1]! // 末系列末点
    const lx = lastDot.getAttribute('cx')!
    const ly = lastDot.getAttribute('cy')!
    const d = svg.querySelectorAll('.line-path')[1]!.getAttribute('d')!
    // path 末尾必须含末点坐标（收尾段连接末点），不得脱节
    expect(d).toContain(lx)
    expect(d).toContain(ly)
  })

  // 缺陷回归：中点二次贝塞尔（midpoint smoothing）曲线在点间中点穿过、不过数据点致 dot 偏离。
  // smooth 改用 Catmull-Rom 转三次贝塞尔，曲线经过每个数据点（ECharts/Chart.js 同模式）
  it('type=line smooth：曲线经过每个数据点（dot 落在线上）', () => {
    const el = mount({ type: 'line', options: '{"smooth":true}', data: MULTI })
    const svg = svgOf(el)
    const d = svg.querySelectorAll('.line-path')[1]!.getAttribute('d')!
    // Catmull-Rom 转三次贝塞尔：path 用 C 命令（中点法是 Q，曲线不过点致 dot 偏离）
    expect(d, 'smooth 应用三次贝塞尔（C）而非中点法（Q）').toContain(' C ')
    const dots = [...svg.querySelectorAll('.dot')].slice(3) // 系列 B 的 3 个数据点
    for (const dot of dots) {
      const xy = `${dot.getAttribute('cx')} ${dot.getAttribute('cy')}`
      expect(d, `曲线应经过数据点 (${xy})`).toContain(xy)
    }
  })

  it('type=area 默认无渐变：无 linearGradient，填充走 swatch 半透明', () => {
    const el = mount({ type: 'area', data: SINGLE })
    const svg = svgOf(el)
    expect(svg.querySelector('linearGradient')).toBeNull()
    expect(svg.querySelector('.area-path')!.getAttribute('style')).toBeNull()
  })

  it('type=area options.gradient=true：填充用垂直渐变（顶部系列色→底部透明）', () => {
    const el = mount({ type: 'area', options: '{"gradient":true}', data: MULTI })
    const svg = svgOf(el)
    const grads = svg.querySelectorAll('linearGradient')
    expect(grads.length).toBe(2) // 每系列一个
    const area = svg.querySelectorAll('.area-path')[0]!
    expect(area.getAttribute('style')).toMatch(/fill:\s*url\(#oas-chart-ag-\d+\)/)
    const stops = grads[0]!.querySelectorAll('stop')
    expect(stops.length).toBe(2)
    expect(stops[0]!.getAttribute('stop-opacity')).toBe('0.35') // 顶实
    expect(stops[1]!.getAttribute('stop-opacity')).toBe('0') // 底透明
  })

  it('type=donut 渲染镂空扇区（内弧半径小于外弧半径）', () => {
    const el = mount({ type: 'donut', data: SINGLE })
    const slices = svgOf(el).querySelectorAll('.slice')
    expect(slices.length).toBe(3)
    const d = slices[0]!.getAttribute('d')!
    const radii = [...d.matchAll(/A ([\d.]+) ([\d.]+)/g)].map((m) => Number(m[1]))
    expect(radii.length).toBe(2)
    expect(radii[0]!).toBe(116) // 外半径 = min(520,280)/2 - 24
    expect(radii[1]!).toBeGreaterThan(0)
    expect(radii[1]!).toBeLessThan(radii[0]!)
  })

  it('type=polar-area 渲染等角扇区：扇区数 = 分类数，title 带数值（半径编码不显示占比）', () => {
    const el = mount({ type: 'polar-area', data: SINGLE })
    const slices = svgOf(el).querySelectorAll('.slice')
    expect(slices.length).toBe(3)
    expect(slices[0]!.querySelector('title')!.textContent).toBe('一月: 10')
    // 半径编码（玫瑰图）≠ 占比心智：title 不含百分比
    expect(slices[0]!.querySelector('title')!.textContent).not.toContain('%')
  })

  it('type=polar-area 半径随值线性缩放（最大值满半径）', () => {
    const el = mount({
      type: 'polar-area',
      data: JSON.stringify({ labels: ['a', 'b', 'c'], series: [{ name: 'S', data: [10, 20, 30] }] }),
    })
    const slices = svgOf(el).querySelectorAll('.slice')
    const radii = [...slices].map((s) => {
      const m = s.getAttribute('d')!.match(/A ([\d.]+) /)!
      return Number(m[1])
    })
    // 值 10/20/30 → 半径比 1:2:3（最大值满半径）
    expect(radii[2]! / radii[0]!).toBeCloseTo(3, 1)
    expect(radii[1]! / radii[0]!).toBeCloseTo(2, 1)
  })

  it('type=polar-area 等角：每扇区弧跨度相同（= 360/n）', () => {
    const el = mount({ type: 'polar-area', data: SINGLE })
    const slices = [...svgOf(el).querySelectorAll('.slice')]
    // 扇区 path：M cx cy L x1 y1 A r r 0 f 1 x2 y2 Z——由 L 与 A 端点反解起止角
    const spans = slices.map((s) => {
      const d = s.getAttribute('d')!
      const m = d.match(/^M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A [\d.]+ [\d.]+ \d \d 1 ([\d.]+) ([\d.]+) Z$/)!
      const cx = Number(m[1])
      const cy = Number(m[2])
      const a1 = (Math.atan2(Number(m[4]) - cy, Number(m[3]) - cx) * 180) / Math.PI
      const a2 = (Math.atan2(Number(m[6]) - cy, Number(m[5]) - cx) * 180) / Math.PI
      return (a2 - a1 + 360) % 360
    })
    for (const span of spans) expect(span).toBeCloseTo(120, 0) // 360/3
  })

  it('type=polar-area 值为 0 的扇区不抛错、title 正确', () => {
    const el = mount({
      type: 'polar-area',
      data: JSON.stringify({ labels: ['a', 'b'], series: [{ name: 'S', data: [5, 0] }] }),
    })
    const slices = svgOf(el).querySelectorAll('.slice')
    expect(slices.length).toBe(2)
    expect(slices[1]!.querySelector('title')!.textContent).toBe('b: 0')
  })

  // 缺陷回归：单分类时整圆 arc 起止点重合（M cx cy L x1 y1 A r r 0 1 1 x1 y1），SVG 规范省略该 arc，
  // 扇区退化为一条半径线（getBBox 宽 0）。改用 <circle> 才画得出整圆。
  it('type=polar-area 单分类：渲染整圆扇区（非退化弧线）', () => {
    const el = mount({
      type: 'polar-area',
      data: JSON.stringify({ labels: ['东'], series: [{ name: 'S', data: [5] }] }),
    })
    const slices = svgOf(el).querySelectorAll('.slice')
    expect(slices.length).toBe(1)
    const slice = slices[0]!
    expect(slice.tagName.toLowerCase()).toBe('circle')
    expect(Number(slice.getAttribute('r'))).toBeGreaterThan(0)
    expect(slice.querySelector('title')!.textContent).toBe('东: 5')
  })

  it('type=radar 渲染径向网格 + 维度轴线 + 系列多边形与顶点 title', () => {
    const el = mount({
      type: 'radar',
      data: JSON.stringify({
        labels: ['速度', '稳定', '续航'],
        series: [
          { name: 'A', data: [80, 92, 75] },
          { name: 'B', data: [90, 70, 82] },
        ],
      }),
    })
    const svg = svgOf(el)
    // 同心网格环（默认 polygon，不含中心点）：4 层
    expect(svg.querySelectorAll('polygon.grid-ring').length).toBe(4)
    // 维度轴线 = 维度数
    expect(svg.querySelectorAll('line.radar-axis').length).toBe(3)
    // 每系列一个填充多边形 + 一个描边多边形
    expect(svg.querySelectorAll('.radar-area').length).toBe(2)
    expect(svg.querySelectorAll('path.radar-line').length).toBe(2)
    // 顶点数据点 = 维度 × 系列，title 为「维度: 值」
    const dots = svg.querySelectorAll('circle.dot')
    expect(dots.length).toBe(6)
    expect(dots[0]!.querySelector('title')!.textContent).toBe('速度: 80')
    // 图例复用（多系列）
    const legend = el.shadowRoot!.querySelector('[part="legend"]')!
    expect(legend.hasAttribute('hidden')).toBe(false)
    expect(legend.textContent).toContain('A')
  })

  it('type=radar options.max 全局量程：值为 max 一半的顶点落在半径中点', () => {
    const el = mount({
      type: 'radar',
      options: '{"max":100}',
      data: JSON.stringify({ labels: ['甲', '乙'], series: [{ name: 'S', data: [50, 100] }] }),
    })
    const dots = [...svgOf(el).querySelectorAll('circle.dot')]
    // 顶轴（-90°）维度「甲」值 50/max100 → 顶点在中心正上方半个半径处；「乙」值 100 在正下方满半径（双维度等角 180°）
    const cy = 140
    const r = Math.min(520, 280) / 2 - 40
    const y0 = Number(dots[0]!.getAttribute('cy'))
    const y1 = Number(dots[1]!.getAttribute('cy'))
    expect(cy - y0).toBeCloseTo(r / 2, 0)
    expect(y1 - cy).toBeCloseTo(r, 0)
  })

  it('type=radar 缺省量程走 niceTicks：刻度顶 = 上取整档', () => {
    const el = mount({
      type: 'radar',
      data: JSON.stringify({ labels: ['甲', '乙'], series: [{ name: 'S', data: [50, 90] }] }),
    })
    const dots = [...svgOf(el).querySelectorAll('circle.dot')]
    const cy = 140
    const r = Math.min(520, 280) / 2 - 40
    // max 90 → niceTicks step = ceil(90/4)=23，量程顶 = 92；顶点按 值/92 线性落半径
    // 「甲」在顶轴（-90°）；「乙」在正下方（90°，双维度等角 180°）——用距圆心的径向距离断言
    expect(cy - Number(dots[0]!.getAttribute('cy'))).toBeCloseTo(r * (50 / 92), 0)
    expect(Math.abs(Number(dots[1]!.getAttribute('cy')) - cy)).toBeCloseTo(r * (90 / 92), 0)
  })

  // 缺陷回归：options.max 非 4 倍数时 step 为小数，此前 Math.round 会产出重复/失真刻度
  // （max=10 → step 2.5 → 1/3/5/8/10），改用保留小数的格式化。
  it('type=radar options.max 非 4 倍数：刻度值保留小数（无重复刻度）', () => {
    const el = mount({
      type: 'radar',
      options: '{"max":10}',
      data: JSON.stringify({ labels: ['甲', '乙', '丙'], series: [{ name: 'S', data: [5, 8, 3] }] }),
    })
    const ticks = [...svgOf(el).querySelectorAll('text.axis-text')].map((t) => t.textContent)
    expect(ticks).toEqual(['2.5', '5', '7.5', '10'])
  })

  it('type=radar radarShape=circle：网格换同心圆（无 polygon 网格）', () => {
    const el = mount({
      type: 'radar',
      options: '{"radarShape":"circle"}',
      data: JSON.stringify({ labels: ['甲', '乙', '丙'], series: [{ name: 'S', data: [1, 2, 3] }] }),
    })
    const svg = svgOf(el)
    expect(svg.querySelectorAll('circle.grid-ring').length).toBe(4)
    expect(svg.querySelector('polygon.grid-ring')).toBeNull()
  })

  it('type=radar 维度名在顶点外侧（每维度一个 text）', () => {
    const el = mount({
      type: 'radar',
      data: JSON.stringify({ labels: ['甲', '乙', '丙'], series: [{ name: 'S', data: [1, 2, 3] }] }),
    })
    const texts = [...svgOf(el).querySelectorAll('text.axis-label')]
    expect(texts.map((t) => t.textContent)).toEqual(['甲', '乙', '丙'])
  })

  it('type=radar aria-label 缺省走 i18n（雷达图）', () => {
    const el = mount({ type: 'radar', data: SINGLE })
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('雷达图')
  })

  it('type=bar 双轴：右轴刻度贴右缘（anchor start）、网格右缘扩到 478、右刻度数与左轴同（alignTicks）', () => {
    const el = mount({
      type: 'bar',
      options: '{"yAxis":[{"name":"销量"},{"name":"增长率"}]}',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [5, 10], yAxisIndex: 1 },
        ],
      }),
    })
    const svg = svgOf(el)
    // 左轴 raw max 100 → step 25 top 100；右轴 raw max 10 → 以主轴档数（4 段）为锚重算 niceStep：step 3 top 12
    const texts = [...svg.querySelectorAll('text.axis-text')]
    const left = texts.filter((t) => t.getAttribute('text-anchor') === 'end')
    const right = texts.filter((t) => t.getAttribute('text-anchor') === 'start')
    expect(left.map((t) => t.textContent)).toEqual(['0', '25', '50', '75', '100'])
    expect(right.map((t) => t.textContent)).toEqual(['0', '3', '6', '9', '12'])
    // 右轴刻度贴右缘（x = W - 42 + 8 = 486）
    for (const t of right) expect(Number(t.getAttribute('x'))).toBe(486)
    // 网格右缘扩到双轴 padR（x2 = 520 - 42 = 478；单轴是 508）
    for (const line of svg.querySelectorAll('line.axis-line')) expect(Number(line.getAttribute('x2'))).toBe(478)
  })

  it('双轴轴名渲染在轴顶（左轴名靠轴起、右轴名贴右缘收）', () => {
    const el = mount({
      type: 'bar',
      options: '{"yAxis":[{"name":"销量"},{"name":"增长率"}]}',
      data: JSON.stringify({
        labels: ['a'],
        series: [
          { name: 'A', data: [50] },
          { name: 'B', data: [5], yAxisIndex: 1 },
        ],
      }),
    })
    const names = [...svgOf(el).querySelectorAll('text.axis-name')]
    expect(names.map((t) => t.textContent)).toEqual(['销量', '增长率'])
    expect(Number(names[0]!.getAttribute('x'))).toBe(42)
    expect(Number(names[1]!.getAttribute('x'))).toBe(478)
    expect(names[0]!.getAttribute('text-anchor')).toBe('start')
    expect(names[1]!.getAttribute('text-anchor')).toBe('end')
  })

  it('series.yAxisIndex=1 按右轴比例落位（bar 高度用右轴量程）', () => {
    const el = mount({
      type: 'bar',
      options: '{"yAxis":[{"name":"L"},{"name":"R"}]}',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [5, 10], yAxisIndex: 1 },
        ],
      }),
    })
    const bars = [...svgOf(el).querySelectorAll('rect.bar')]
    const plotH = 234
    // 左轴量程 100：A 值 100 满高；右轴量程 12（step 3×4）：B 值 10 → 高 10/12×234
    expect(Number(bars[1]!.getAttribute('y'))).toBeCloseTo(16, 0) // A 值 100 → 顶到 PAD.t
    expect(Number(bars[3]!.getAttribute('height'))).toBeCloseTo((10 / 12) * plotH, 0)
    // 对照：若误用左轴量程 100，高度会是 10/100×234=23.4——明显不同
    expect(Number(bars[3]!.getAttribute('height'))).toBeGreaterThan(100)
  })

  it('type=line 双轴：右轴系列的点按右轴量程落 y', () => {
    const el = mount({
      type: 'line',
      options: '{"yAxis":[{"name":"L"},{"name":"R"}]}',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [5, 10], yAxisIndex: 1 },
        ],
      }),
    })
    const dots = [...svgOf(el).querySelectorAll('circle.dot')]
    // B 值 10（右轴量程 12）→ y = 16 + 234 - 10/12×234 = 155；若误用左轴（量程 100）→ y = 230.6
    expect(Number(dots[3]!.getAttribute('cy'))).toBeCloseTo(16 + 234 - (10 / 12) * 234, 0)
  })

  it('缺省单轴：无右轴刻度、网格右缘 508（行为不变）', () => {
    const el = mount({ type: 'bar', data: MULTI })
    const svg = svgOf(el)
    const right = [...svg.querySelectorAll('text.axis-text')].filter((t) => t.getAttribute('text-anchor') === 'start')
    expect(right.length).toBe(0)
    for (const line of svg.querySelectorAll('line.axis-line')) expect(Number(line.getAttribute('x2'))).toBe(508)
  })

  it('yAxis 只有一项（无右轴）不启用双轴；yAxisIndex 非法值归 0（并入左轴量程）', () => {
    const el = mount({
      type: 'bar',
      options: '{"yAxis":[{"name":"L"}]}',
      data: JSON.stringify({
        labels: ['a'],
        series: [
          { name: 'A', data: [50] },
          { name: 'B', data: [200], yAxisIndex: 2 },
        ],
      }),
    })
    const svg = svgOf(el)
    // 无右轴刻度
    const right = [...svg.querySelectorAll('text.axis-text')].filter((t) => t.getAttribute('text-anchor') === 'start')
    expect(right.length).toBe(0)
    // yAxisIndex=2 归 0：左轴量程并入 B(200) → step 50 top 200
    const left = [...svg.querySelectorAll('text.axis-text')].filter((t) => t.getAttribute('text-anchor') === 'end')
    expect(left.map((t) => t.textContent)).toEqual(['0', '50', '100', '150', '200'])
  })

  // 缺陷回归：PRD 声明 yAxis[i].name 可选，但此前 normalizeOptions 要求 name 为字符串，
  // yAxis:[{},{}] 被整体丢弃 → 双轴未启用。现条目存在即占位（无名轴）。
  it('options.yAxis 轴名可选：[{},{}] 也启用双轴（无名轴不渲染轴名）', () => {
    const el = mount({
      type: 'bar',
      options: '{"yAxis":[{},{}]}',
      data: JSON.stringify({
        labels: ['a'],
        series: [
          { name: 'A', data: [50] },
          { name: 'B', data: [5], yAxisIndex: 1 },
        ],
      }),
    })
    const svg = svgOf(el)
    const right = [...svg.querySelectorAll('text.axis-text')].filter((t) => t.getAttribute('text-anchor') === 'start')
    expect(right.length).toBe(5)
    expect(svg.querySelectorAll('text.axis-name').length).toBe(0)
  })

  // 缺陷回归：draw 层序文档承诺固定 bar → area → line，但 overlay 此前按声明顺序渲染，
  // 线先声明时会被后声明的面积层盖住。按层序 rank 稳定排序根治。
  it('combo 层序固定 bar → area → line：line 先声明也压在面积层之下', () => {
    const el = mount({
      type: 'bar',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'L', data: [5, 10], type: 'line' },
          { name: 'A', data: [20, 30], type: 'area' },
          { name: 'B', data: [50, 100] },
        ],
      }),
    })
    const svg = svgOf(el)
    const bar = svg.querySelector('rect.bar')!
    const area = svg.querySelector('.area-path')!
    const line = svg.querySelector('.line-path')!
    expect(bar.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(area.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('combo（bar 顶层 + line 覆盖）：柱与线共存，线点对齐 band 中心（非纯折线的端点对齐）', () => {
    const el = mount({
      type: 'bar',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: '销量', data: [50, 100] },
          { name: '增长率', data: [5, 10], type: 'line' },
        ],
      }),
    })
    const svg = svgOf(el)
    expect(svg.querySelectorAll('rect.bar').length).toBe(2) // 仅柱型系列出柱
    expect(svg.querySelectorAll('.line-path').length).toBe(1)
    expect(svg.querySelectorAll('circle.dot').length).toBe(2) // 柱不带 dot，线型系列 2 点
    // 线点对齐柱组 band 中心：plotW=466、bandW=233 → 中心 158.5 / 391.5
    const dots = [...svg.querySelectorAll('circle.dot')]
    expect(Number(dots[0]!.getAttribute('cx'))).toBeCloseTo(158.5, 0)
    expect(Number(dots[1]!.getAttribute('cx'))).toBeCloseTo(391.5, 0)
    // 柱宽按柱型系列数（1）算：bandW×0.45 = 104.9（不是双系列柱的 0.72/2）
    expect(Number(svg.querySelector('rect.bar')!.getAttribute('width'))).toBeCloseTo(233 * 0.45, 0)
    // 层序：bar 层先于 line 层（线盖柱的通行读法）
    const bar = svg.querySelector('rect.bar')!
    const line = svg.querySelector('.line-path')!
    expect(bar.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('combo（bar 顶层 + area 覆盖）：面积层闭合到基线', () => {
    const el = mount({
      type: 'bar',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: '销量', data: [50, 100] },
          { name: '成本', data: [20, 30], type: 'area' },
        ],
      }),
    })
    const svg = svgOf(el)
    expect(svg.querySelectorAll('rect.bar').length).toBe(2)
    expect(svg.querySelectorAll('.area-path').length).toBe(1)
    const d = svg.querySelector('.area-path')!.getAttribute('d')!
    expect(d.endsWith('Z')).toBe(true)
    expect(d).toContain('250.0') // 基线闭合
  })

  it('combo（line 顶层 + bar 覆盖）：纯折线图中混入柱系列', () => {
    const el = mount({
      type: 'line',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [20, 30], type: 'bar' },
        ],
      }),
    })
    const svg = svgOf(el)
    expect(svg.querySelectorAll('rect.bar').length).toBe(2)
    expect(svg.querySelectorAll('.line-path').length).toBe(1) // 仅线型系列 A 画折线；柱系列不画线
  })

  it('combo 继承与回退：无 type 覆盖走纯柱；非法 type（pie）静默回退顶层型', () => {
    const inherit = mount({
      type: 'bar',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [20, 30] },
        ],
      }),
    })
    expect(inherit.shadowRoot!.querySelectorAll('rect.bar').length).toBe(4)
    expect(inherit.shadowRoot!.querySelector('.line-path')).toBeNull()

    const fallback = mount({
      type: 'bar',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [20, 30], type: 'pie' },
        ],
      }),
    })
    expect(fallback.shadowRoot!.querySelector('.slice')).toBeNull()
    expect(fallback.shadowRoot!.querySelectorAll('rect.bar').length).toBe(4)
  })

  it('combo × 双轴：line 覆盖系列绑右轴（yAxisIndex=1），点按右轴量程落 y', () => {
    const el = mount({
      type: 'bar',
      options: '{"yAxis":[{"name":"销量"},{"name":"增长率"}]}',
      data: JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: '销量', data: [50, 100] },
          { name: '增长率', data: [5, 10], type: 'line', yAxisIndex: 1 },
        ],
      }),
    })
    const dots = [...svgOf(el).querySelectorAll('circle.dot')]
    // 右轴量程 12（raw max 10 → step 3 × 4）；值 10 → y = 16+234-10/12×234 = 155
    expect(Number(dots[dots.length - 1]!.getAttribute('cy'))).toBeCloseTo(16 + 234 - (10 / 12) * 234, 0)
  })

  it('type=stacked-bar 多系列堆叠（段高之和=分类总高，不超绘图区）', () => {
    const el = mount({ type: 'stacked-bar', data: MULTI })
    const bars = svgOf(el).querySelectorAll('.bar')
    expect(bars.length).toBe(6)
    // 分类「一月」：系列 A(10) 在底、系列 B(5) 叠其上
    const a = bars[0]!
    const b = bars[1]!
    const yA = Number(a.getAttribute('y'))
    const hA = Number(a.getAttribute('height'))
    const yB = Number(b.getAttribute('y'))
    const hB = Number(b.getAttribute('height'))
    expect(yB + hB).toBeCloseTo(yA, 1)
    // 柱体不超出绘图区：顶 ≥ PAD.t(16)、底 ≤ PAD.t + plotH(250)
    expect(yB).toBeGreaterThanOrEqual(16)
    expect(yA + hA).toBeLessThanOrEqual(250)
  })

  // 边界固化：series.type / yAxisIndex 只被直角坐标系 bar/line/area（含组合）消费；
  // 堆叠柱等图型忽略系列级覆盖（全部按各自图型渲染，不混排）。
  it('stacked-bar 忽略系列级 type/yAxisIndex（不进入组合图分支）', () => {
    const el = mount({
      type: 'stacked-bar',
      data: JSON.stringify({
        labels: ['a'],
        series: [
          { name: 'A', data: [10] },
          { name: 'B', data: [20], type: 'line', yAxisIndex: 1 },
        ],
      }),
    })
    const svg = svgOf(el)
    expect(svg.querySelectorAll('rect.bar').length).toBe(2)
    expect(svg.querySelector('.line-path')).toBeNull()
  })

  it('对象格式多系列：折线每系列一条 path', () => {
    const el = mount({ data: MULTI })
    expect(svgOf(el).querySelectorAll('.line-path').length).toBe(2)
  })

  it('多系列柱状 rect 数量 = 分类数 × 系列数', () => {
    const el = mount({ type: 'bar', data: MULTI })
    expect(svgOf(el).querySelectorAll('.bar').length).toBe(6)
  })

  it('数据更新后重渲染（svg 节点不变）', () => {
    const el = mount({ data: SINGLE })
    const svg = svgOf(el)
    el.setAttribute('data', JSON.stringify([{ label: 'A', value: 1 }]))
    expect(svgOf(el)).toBe(svg)
    expect(svg.querySelectorAll('.dot').length).toBe(1)
  })

  it('property data 优先于 attribute', () => {
    const el = mount({ data: SINGLE })
    el.data = [{ label: 'P', value: 7 }]
    expect(svgOf(el).querySelectorAll('.dot').length).toBe(1)
  })

  it('空数据/非法 JSON 显示空态占位，不渲染图形', () => {
    const el = mount({ data: '[]' })
    expect(emptyOf(el).hasAttribute('hidden')).toBe(false)
    expect(emptyOf(el).textContent).toContain('暂无数据')
    el.setAttribute('data', 'not-json{{{')
    expect(emptyOf(el).hasAttribute('hidden')).toBe(false)
    expect(svgOf(el).querySelector('.line-path')).toBeNull()
  })

  it('aria-label 默认按类型走 i18n，自定义属性优先', () => {
    const el = mount({ data: SINGLE })
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('折线图')
    el.setAttribute('type', 'pie')
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('饼图')
    el.setAttribute('aria-label', '本季度销量')
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('本季度销量')
  })

  it('每个数据点 title 提供悬停数值', () => {
    const el = mount({ data: SINGLE })
    const dots = svgOf(el).querySelectorAll('.dot')
    expect(dots[0]!.querySelector('title')!.textContent).toBe('一月: 10')
  })

  it('locale 切换空态文案更新', () => {
    const el = mount({ data: '[]' })
    setLocale(en)
    expect(emptyOf(el).textContent).toContain('No data')
    setLocale('zh-CN')
    expect(emptyOf(el).textContent).toContain('暂无数据')
  })

  it('系列配色 class 存在（c0/c1）', () => {
    const el = mount({ data: MULTI })
    const paths = svgOf(el).querySelectorAll('.line-path')
    expect(paths[0]!.classList.contains('c0')).toBe(true)
    expect(paths[1]!.classList.contains('c1')).toBe(true)
  })

  it('多系列显示图例', () => {
    const el = mount({ data: MULTI })
    const legend = el.shadowRoot!.querySelector('[part="legend"]')!
    expect(legend.hasAttribute('hidden')).toBe(false)
    expect(legend.textContent).toContain('A')
    expect(legend.textContent).toContain('B')
  })
})
