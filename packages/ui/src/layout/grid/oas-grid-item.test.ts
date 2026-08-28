import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGrid, OASGridItem } from './index.js'

describe('OASGridItem', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mount(
    itemsHtml: string,
    gridAttrs: Record<string, string> = {},
  ): OASGrid {
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
    return (
      item.shadowRoot!.querySelector('style[data-oas-grid-item-breakpoints]')!
        .textContent ?? ''
    )
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
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-grid-item-column: span 12 } }',
    )
  })

  it('span 多断点：按 min-width 升序生成对应规则（sm/lg）', () => {
    const grid = mount('<oas-grid-item span="24 sm:12 lg:6">a</oas-grid-item>')
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain(
      '@media (min-width: 640px) { :host { --oas-grid-item-column: span 12 } }',
    )
    expect(css).toContain(
      '@media (min-width: 1024px) { :host { --oas-grid-item-column: span 6 } }',
    )
  })

  it('offset 断点简写：与 span 基础值组合（offset 生效时 `n+1 / span X`）', () => {
    const grid = mount('<oas-grid-item span="8" offset="0 lg:4">a</oas-grid-item>')
    const item = firstItem(grid)
    expect(item.style.gridColumn).toBe('var(--oas-grid-item-column, span 8)')
    const css = breakpointCss(item)
    expect(css).toContain(
      '@media (min-width: 1024px) { :host { --oas-grid-item-column: 5 / span 8 } }',
    )
  })

  it('span 与 offset 断点并集：同断点两者同时生效', () => {
    const grid = mount(
      '<oas-grid-item span="24 md:12" offset="0 md:4">a</oas-grid-item>',
    )
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-grid-item-column: 5 / span 12 } }',
    )
  })

  it('span 与 offset 断点并集：不同断点各自生效，缺失方回落基础值', () => {
    const grid = mount(
      '<oas-grid-item span="24 md:12" offset="0 lg:4">a</oas-grid-item>',
    )
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-grid-item-column: span 12 } }',
    )
    expect(css).toContain(
      '@media (min-width: 1024px) { :host { --oas-grid-item-column: 5 / span 24 } }',
    )
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
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-grid-item-column: span 24 } }',
    )
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('非法 offset 断点值：回落基础 offset + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = mount(
      '<oas-grid-item span="8" offset="0 md:four">a</oas-grid-item>',
    )
    const item = firstItem(grid)
    const css = breakpointCss(item)
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-grid-item-column: span 8 } }',
    )
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
    const grid = mount(
      '<oas-grid-item>a</oas-grid-item><oas-grid-item order="abc">b</oas-grid-item>',
    )
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
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-grid-item-column: auto } }',
    )
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
    expect(OASGridItem.observedAttributes).toEqual(['span', 'offset', 'order'])
  })
})
