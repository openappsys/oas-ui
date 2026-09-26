import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGrid, OASGridItem } from './index.js'

describe('OASGridItem', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mount(itemsHtml: string, gridAttrs: Record<string, string> = {}): OASGrid {
    const grid = new OASGrid()
    for (const [k, v] of Object.entries(gridAttrs)) grid.setAttribute(k, v)
    grid.innerHTML = itemsHtml
    document.body.appendChild(grid)
    return grid
  }

  function firstItem(grid: OASGrid): HTMLElement {
    return grid.querySelector<HTMLElement>('oas-grid-item')!
  }

  function breakpointCss(item: HTMLElement): string {
    return item.shadowRoot!.querySelector('style[data-oas-grid-item-breakpoints]')!.textContent ?? ''
  }

  it('默认 span 24：gridColumn span 24（无断点规则）', () => {
    const grid = mount('<oas-grid-item>a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('span 24')
    expect(breakpointCss(item)).toBe('')
  })

  it('span 断点简写：宿主 var() 兜底基础值 + shadow @media 规则注入', () => {
    const grid = mount('<oas-grid-item span="24 md:12">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('var(--oas-grid-item-column, span 24)')
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-item-column: span 12 } }')
  })

  it('span 多断点：按 min-width 升序生成对应规则（sm/lg）', () => {
    const grid = mount('<oas-grid-item span="24 sm:12 lg:6">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 640px) { :host { --oas-grid-item-column: span 12 } }')
    expect(css).toContain('@media (min-width: 1024px) { :host { --oas-grid-item-column: span 6 } }')
  })

  it('offset 断点简写：与 span 基础值组合（offset 生效时 `n+1 / span X`）', () => {
    const grid = mount('<oas-grid-item span="8" offset="0 lg:4">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('var(--oas-grid-item-column, span 8)')
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 1024px) { :host { --oas-grid-item-column: 5 / span 8 } }')
  })

  it('span 与 offset 断点并集：同断点两者同时生效', () => {
    const grid = mount('<oas-grid-item span="24 md:12" offset="0 md:4">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-item-column: 5 / span 12 } }')
  })

  it('span 与 offset 断点并集：不同断点各自生效，缺失方回落基础值', () => {
    const grid = mount('<oas-grid-item span="24 md:12" offset="0 lg:4">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-item-column: span 12 } }')
    expect(css).toContain('@media (min-width: 1024px) { :host { --oas-grid-item-column: 5 / span 24 } }')
  })

  it('无断点纯值不生成 @media 规则；移除断点后规则清空、回内联直写', () => {
    const grid = mount('<oas-grid-item span="8" offset="2">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('3 / span 8')
    expect(breakpointCss(item)).toBe('')
    item.setAttribute('span', '24 md:12')
    expect(breakpointCss(item)).toContain('@media (min-width: 768px)')
    item.setAttribute('span', '8')
    // offset="2" 仍在：回落内联直写应为 `3 / span 8`
    expect(item.style.gridColumn).toBe('3 / span 8')
    expect(breakpointCss(item)).toBe('')
  })

  it('非法断点名：丢弃该断点 + dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = mount('<oas-grid-item span="24 foo:12">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('var(--oas-grid-item-column, span 24)')
    expect(breakpointCss(item)).toBe('')
    item.setAttribute('span', '24 foo:12')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('非法断点值：回落基础值 + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = mount('<oas-grid-item span="24 md:abc">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-item-column: span 24 } }')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('非法 offset 断点值：回落基础 offset + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = mount('<oas-grid-item span="8" offset="0 md:four">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-item-column: span 8 } }')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  // ===== 布局批 1：order 排序 / 自宽列 =====

  it('order 控制排序：数字生效', () => {
    const grid = mount('<oas-grid-item order="2">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.order).toBe('2')
  })

  it('order 缺省 0；非法值回落 0', () => {
    const grid = mount('<oas-grid-item>a</oas-grid-item><oas-grid-item order="abc">b</oas-grid-item>')
    const items = grid.querySelectorAll<HTMLElement>('oas-grid-item')
    expect(items[0]!.style.order).toBe('0')
    expect(items[1]!.style.order).toBe('0')
  })

  it('span=auto：gridColumn auto（内容自然宽，不展 span）', () => {
    const grid = mount('<oas-grid-item span="auto">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('auto')
  })

  it('span=auto 与 offset 组合：offset+1 / auto（按 grid 规范）', () => {
    const grid = mount('<oas-grid-item span="auto" offset="2">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('3 / auto')
  })

  it('span 断点值为 auto：@media 规则按 auto 解析', () => {
    const grid = mount('<oas-grid-item span="24 md:auto">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-item-column: auto } }')
  })

  // ===== 与 simple-grid（columns）的组合 =====

  it('columns 模式下 span 断点简写仍被忽略（零回归），断点规则清空', () => {
    const grid = mount('<oas-grid-item span="24 md:12">a</oas-grid-item>', {
      columns: '3',
    })
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('')
    expect(breakpointCss(item)).toBe('')
  })

  it('columns 断点简写模式下同样忽略 span（按断点简写判定 auto 布局）', () => {
    const grid = mount('<oas-grid-item span="8">a</oas-grid-item>', {
      columns: '3 md:2 sm:1',
    })
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('')
    expect(breakpointCss(item)).toBe('')
  })

  it('min-child-width 模式下忽略 span/offset（auto-fit 流式重排）', () => {
    const grid = mount('<oas-grid-item span="12" offset="2">a</oas-grid-item><oas-grid-item>b</oas-grid-item>', {
      'min-child-width': '200px',
    })
    const items = grid.querySelectorAll<HTMLElement>('oas-grid-item')
    expect(items[0]!.style.gridColumn).toBe('')
    expect(items[1]!.style.gridColumn).toBe('')
  })

  it('SSR 快照含 @media 规则：shadow 样式与宿主 var() 兜底一并序列化', () => {
    const grid = mount('<oas-grid-item span="24 md:12">a</oas-grid-item>')
    const item = firstItem(grid)
    // 序列化 shadow 内容（renderToString 对 shadowRoot.innerHTML 原样输出；
    // happy-dom 序列化带属性 style 为 `style data-oas-grid-item-breakpoints=""`）
    const shadowHtml = item.shadowRoot!.innerHTML
    expect(shadowHtml).toContain('style data-oas-grid-item-breakpoints')
    expect(shadowHtml).toContain('@media (min-width: 768px)')
    // 序列化宿主 style 属性（renderToString 遍历 el.attributes 输出）
    const styleAttr = item.getAttribute('style')!
    expect(styleAttr).toContain('grid-column: var(--oas-grid-item-column, span 24)')
  })

  it('导出 OASGridItem 类（与 OASGrid 同 index 导出）', () => {
    expect(typeof OASGridItem).toBe('function')
    expect(OASGridItem.observedAttributes).toEqual(['span', 'offset', 'order', 'flex', 'push', 'pull'])
  })
})

describe('OASGridItem push/pull/flex（PRD P2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mount(itemsHtml: string, gridAttrs: Record<string, string> = {}): OASGrid {
    const grid = new OASGrid()
    for (const [k, v] of Object.entries(gridAttrs)) grid.setAttribute(k, v)
    grid.innerHTML = itemsHtml
    document.body.appendChild(grid)
    return grid
  }

  function items(grid: OASGrid): NodeListOf<HTMLElement> {
    return grid.querySelectorAll<HTMLElement>('oas-grid-item')
  }

  it('push 右移起始线：span 8 + push 4 → `5 / span 8`（起始线 = 1 + push）', () => {
    const grid = mount('<oas-grid-item span="8" push="4">a</oas-grid-item>')
    expect(items(grid)[0]!.style.gridColumn).toBe('5 / span 8')
  })

  it('pull 左移起始线：span 12 + offset 4 + pull 2 → `3 / span 12`（在显式起始线上左移）', () => {
    const grid = mount('<oas-grid-item span="12" offset="4" pull="2">a</oas-grid-item>')
    expect(items(grid)[0]!.style.gridColumn).toBe('3 / span 12')
  })

  it('push 与 pull 同用：净偏移 = push - pull', () => {
    const grid = mount('<oas-grid-item span="8" offset="2" push="3" pull="1">a</oas-grid-item>')
    // start = offset(2) + push(3) - pull(1) = 4 → 第 5 列起
    expect(items(grid)[0]!.style.gridColumn).toBe('5 / span 8')
  })

  it('净偏移 ≤ 0 时回落自动放置（span X 形式），span=auto 仍为 auto', () => {
    const grid = mount(
      '<oas-grid-item span="8" pull="2">a</oas-grid-item><oas-grid-item span="auto" pull="4">b</oas-grid-item>',
    )
    const els = items(grid)
    expect(els[0]!.style.gridColumn).toBe('span 8')
    expect(els[1]!.style.gridColumn).toBe('auto')
  })

  it('push/pull 缺省 0、非法值回落 0（保持既有 span/offset 行为零回归）', () => {
    const grid = mount(
      '<oas-grid-item span="8">a</oas-grid-item><oas-grid-item span="8" push="abc" pull="xyz">b</oas-grid-item>',
    )
    const els = items(grid)
    expect(els[0]!.style.gridColumn).toBe('span 8')
    expect(els[1]!.style.gridColumn).toBe('span 8')
  })

  it('flex 属性：内联直写 style.flex（flex 容器场景通道；CSSOM 序列化展开短Hand）', () => {
    const grid = mount(
      '<oas-grid-item flex="1">a</oas-grid-item><oas-grid-item flex="2 1 200px">b</oas-grid-item><oas-grid-item>c</oas-grid-item>',
    )
    const els = items(grid)
    expect(els[0]!.style.flex, 'flex: 1 → CSSOM 展开 1 1 0%').toBe('1 1 0%')
    expect(els[1]!.style.flex).toBe('2 1 200px')
    expect(els[2]!.style.flex, '缺省不写内联 flex').toBe('')
  })

  it('columns 自动布局下 push/pull 同样忽略（与 span/offset 一致），flex 照常直写', () => {
    const grid = mount('<oas-grid-item span="8" push="4" flex="1">a</oas-grid-item>', { columns: '3' })
    const item = items(grid)[0]!
    expect(item.style.gridColumn).toBe('')
    expect(item.style.flex).toBe('1 1 0%')
  })
})
