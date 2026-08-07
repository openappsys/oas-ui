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
})
