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
