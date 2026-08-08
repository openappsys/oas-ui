import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
})
