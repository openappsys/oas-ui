import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGrid, OASGridItem } from './index.js'

describe('OASGrid', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染栅格容器与子项', () => {
    const grid = new OASGrid()
    grid.innerHTML = `<oas-grid-item span="8">A</oas-grid-item><oas-grid-item span="16">B</oas-grid-item>`
    document.body.appendChild(grid)
    const items = grid.querySelectorAll('oas-grid-item')
    expect(items.length).toBe(2)
    expect(grid.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('gap 属性生效', () => {
    const grid = new OASGrid()
    grid.setAttribute('gap', '16px')
    grid.innerHTML = `<oas-grid-item>a</oas-grid-item>`
    document.body.appendChild(grid)
    expect(grid.style.gap).toBe('16px')
  })

  it('columns 自动等分布局：repeat(n, 1fr)', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '3')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)')
  })

  it('columns 模式下忽略 GridItem 的 span', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '3')
    grid.innerHTML = `<oas-grid-item span="8">a</oas-grid-item><oas-grid-item span="16">b</oas-grid-item>`
    document.body.appendChild(grid)
    const items = grid.querySelectorAll('oas-grid-item') as NodeListOf<HTMLElement>
    expect(items.length).toBe(2)
    expect(items[0]!.style.gridColumn).toBe('')
    expect(items[1]!.style.gridColumn).toBe('')
  })

  it('无 columns 时 GridItem span/offset 照常生效（并存不冲突）', () => {
    const grid = new OASGrid()
    grid.innerHTML = `<oas-grid-item span="8">a</oas-grid-item><oas-grid-item span="6" offset="2">b</oas-grid-item>`
    document.body.appendChild(grid)
    const items = grid.querySelectorAll('oas-grid-item') as NodeListOf<HTMLElement>
    expect(items[0]!.style.gridColumn).toBe('span 8')
    expect(items[1]!.style.gridColumn).toBe('3 / span 6')
  })

  it('columns 与 cols 并存时 columns 优先', () => {
    const grid = new OASGrid()
    grid.setAttribute('cols', '12')
    grid.setAttribute('columns', '4')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)')
  })

  it('columns 非法值（0）退化为单列不报错', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '0')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(1, 1fr)')
  })

  // ===== 布局批 1：行列 gutter 分离 / 容器对齐 =====

  it('gap 两值语法：空格分隔「行 列」，row-gap/column-gap 分开生效', () => {
    const grid = new OASGrid()
    grid.setAttribute('gap', '8 16')
    document.body.appendChild(grid)
    // 纯数字值补 px：浏览器丢弃无单位 CSS 长度（`rowGap='8'` 无效被丢，真实浏览器实测）
    expect(grid.style.rowGap).toBe('8px')
    expect(grid.style.columnGap).toBe('16px')
    expect(grid.style.gap).toBe('')
  })

  it('gap 两值切回单值：rowGap/columnGap 清理、gap 简写恢复（零回归）', () => {
    const grid = new OASGrid()
    grid.setAttribute('gap', '8 16')
    document.body.appendChild(grid)
    grid.setAttribute('gap', '12px')
    expect(grid.style.gap).toBe('12px')
    expect(grid.style.rowGap).toBe('')
    expect(grid.style.columnGap).toBe('')
  })

  it('gap 三值以上非法：静默忽略回落默认 0（无告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = new OASGrid()
    grid.setAttribute('gap', '8 16 24')
    document.body.appendChild(grid)
    expect(grid.style.gap).toBe('0')
    expect(grid.style.rowGap).toBe('')
    expect(grid.style.columnGap).toBe('')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('justify 控制 justify-items（start/center/end/stretch）', () => {
    const map: Array<[string, string]> = [
      ['start', 'start'],
      ['center', 'center'],
      ['end', 'end'],
      ['stretch', 'stretch'],
    ]
    for (const [v, expected] of map) {
      const grid = new OASGrid()
      grid.setAttribute('justify', v)
      document.body.appendChild(grid)
      expect(grid.style.justifyItems, `justify=${v}`).toBe(expected)
      grid.remove()
    }
  })

  it('justify 缺省不设 justify-items（保持 CSS 默认 stretch 行为）', () => {
    const grid = new OASGrid()
    document.body.appendChild(grid)
    expect(grid.style.justifyItems).toBe('')
  })

  it('justify 非法值回落 stretch + dev 告警一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = new OASGrid()
    grid.setAttribute('justify', 'space-between')
    document.body.appendChild(grid)
    expect(grid.style.justifyItems).toBe('stretch')
    grid.setAttribute('justify', 'space-between')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('align 控制 align-items（start/center/end/stretch/baseline）', () => {
    const map: Array<[string, string]> = [
      ['start', 'start'],
      ['center', 'center'],
      ['end', 'end'],
      ['stretch', 'stretch'],
      ['baseline', 'baseline'],
    ]
    for (const [v, expected] of map) {
      const grid = new OASGrid()
      grid.setAttribute('align', v)
      document.body.appendChild(grid)
      expect(grid.style.alignItems, `align=${v}`).toBe(expected)
      grid.remove()
    }
  })

  it('align 缺省不设 align-items（保持 CSS 默认 stretch 行为）', () => {
    const grid = new OASGrid()
    document.body.appendChild(grid)
    expect(grid.style.alignItems).toBe('')
  })

  it('align 非法值回落 stretch + dev 告警一次（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = new OASGrid()
    grid.setAttribute('align', 'justify')
    document.body.appendChild(grid)
    expect(grid.style.alignItems).toBe('stretch')
    grid.setAttribute('align', 'justify')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })
})
