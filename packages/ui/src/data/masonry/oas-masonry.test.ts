import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMasonry } from './index.js'

function mount(attrs: Record<string, string> = {}, withItems = true): OASMasonry {
  const el = new OASMasonry()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (withItems) {
    el.innerHTML = `
      <div class="card">卡片 A</div>
      <div class="card">卡片 B</div>
      <div class="card">卡片 C</div>
    `
  }
  document.body.appendChild(el)
  return el
}

function root(el: OASMasonry): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.masonry')!
}

describe('OASMasonry', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无子项时渲染不报错', () => {
    expect(() => mount({}, false)).not.toThrow()
    const el = mount({}, false)
    expect(root(el)).not.toBeNull()
  })

  it('默认 columns=4、gap=8', () => {
    const el = mount()
    expect(root(el).style.columnCount).toBe('4')
    expect(root(el).style.columnGap).toBe('8px')
  })

  it('columns 属性生效', () => {
    const el = mount({ columns: '3' })
    expect(root(el).style.columnCount).toBe('3')
  })

  it('columns 非法值回退 1', () => {
    expect(root(mount({ columns: 'abc' })).style.columnCount).toBe('1')
    expect(root(mount({ columns: '0' })).style.columnCount).toBe('1')
    expect(root(mount({ columns: '-2' })).style.columnCount).toBe('1')
    expect(root(mount({ columns: '2.5' })).style.columnCount).toBe('1')
  })

  it('gap 属性生效', () => {
    expect(root(mount({ gap: '16' })).style.columnGap).toBe('16px')
  })

  it('gap 非法值回退默认 8', () => {
    expect(root(mount({ gap: 'abc' })).style.columnGap).toBe('8px')
    expect(root(mount({ gap: '-4' })).style.columnGap).toBe('8px')
  })

  it('子项经默认 slot 投影', () => {
    const el = mount()
    const slot = el.shadowRoot!.querySelector('slot')!
    expect(slot.assignedElements().length).toBe(3)
  })

  it('属性变化增量同步', () => {
    const el = mount({ columns: '2' })
    el.setAttribute('columns', '5')
    expect(root(el).style.columnCount).toBe('5')
  })

  it('样式包含 break-inside: avoid（子项不断列）', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('break-inside: avoid')
  })
})
