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
