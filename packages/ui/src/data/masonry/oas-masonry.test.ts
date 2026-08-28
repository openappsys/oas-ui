import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    window.innerWidth = 1024
    vi.restoreAllMocks()
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

  // ===== 布局批 3：响应式列数 / 行列间距 / fresh / column 指定列 =====

  function breakpointCss(el: OASMasonry): string {
    return (
      el.shadowRoot!.querySelector('style[data-oas-masonry-breakpoints]')!.textContent ?? ''
    )
  }

  function orderClasses(el: OASMasonry): string[] {
    return Array.from(el.children).map((c) => c.className)
  }

  it('columns 断点简写：宿主 var() 兜底基础值 + shadow @media 规则注入', () => {
    const el = mount({ columns: '1 md:2 lg:4' })
    expect(root(el).style.columnCount).toBe('var(--oas-masonry-columns, 1)')
    const css = breakpointCss(el)
    expect(css).toContain(
      '@media (min-width: 768px) { :host { --oas-masonry-columns: 2 } }',
    )
    expect(css).toContain(
      '@media (min-width: 1024px) { :host { --oas-masonry-columns: 4 } }',
    )
  })

  it('columns 非法断点名：丢弃该断点 + dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ columns: '1 foo:3 md:2' })
    expect(root(el).style.columnCount).toBe('var(--oas-masonry-columns, 1)')
    const css = breakpointCss(el)
    expect(css).not.toContain('foo')
    expect(css).toContain('@media (min-width: 768px)')
    // 同值重复设置不再重复告警
    el.setAttribute('columns', '1 foo:3 md:2')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('columns 非法断点值：回落基础列数 + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ columns: '2 lg:abc' })
    const css = breakpointCss(el)
    expect(css).toContain(
      '@media (min-width: 1024px) { :host { --oas-masonry-columns: 2 } }',
    )
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('gap 两值「行 列」：行距走子项 margin-bottom 变量、列距走 column-gap', () => {
    const el = mount({ gap: '8 16' })
    expect(root(el).style.columnGap).toBe('16px')
    expect(root(el).style.getPropertyValue('--oas-masonry-item-gap')).toBe('8px')
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('margin-bottom: var(--oas-masonry-item-gap, var(--oas-space-2))')
  })

  it('gap 单值保持现状（仅列距），行距变量清空；纯数字补 px', () => {
    const el = mount({ gap: '16' })
    expect(root(el).style.columnGap).toBe('16px')
    expect(root(el).style.getPropertyValue('--oas-masonry-item-gap')).toBe('')
  })

  it('gap 非法 token：行距/列距各自回落默认 8', () => {
    expect(root(mount({ gap: '8 16 24' })).style.columnGap).toBe('8px')
    expect(root(mount({ gap: 'abc' })).style.columnGap).toBe('8px')
    expect(root(mount({ gap: '8 -16' })).style.columnGap).toBe('8px')
    const el = mount({ gap: '-2 16' })
    expect(root(el).style.getPropertyValue('--oas-masonry-item-gap')).toBe('8px')
  })

  it('fresh：ResizeObserver 监听子项，尺寸变化触发 update（重算机会）；移除后断开', () => {
    let roCallback: (() => void) | null = null
    let disconnected = 0
    class FakeResizeObserver {
      constructor(cb: () => void) {
        roCallback = cb
      }
      observe() {}
      disconnect() {
        disconnected++
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const el = mount({ fresh: '' })
    expect(roCallback).not.toBeNull()
    const spy = vi.spyOn(el as unknown as { update: () => void }, 'update')
    roCallback!()
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    // 移除 fresh：观察器断开
    el.removeAttribute('fresh')
    expect(disconnected).toBeGreaterThan(0)
    el.remove()
    vi.unstubAllGlobals()
  })

  it('column 指定列：带 column 的子元素重排到目标列头部', () => {
    const el = new OASMasonry()
    el.setAttribute('columns', '2')
    el.innerHTML = `
      <div class="a" column="2">A</div>
      <div class="b">B</div>
      <div class="c">C</div>
      <div class="d" column="1">D</div>
    `
    document.body.appendChild(el)
    // 2 列、4 项 → 每列 ceil(4/2)=2 槽：column=1 → 槽 0，column=2 → 槽 2
    expect(orderClasses(el)).toEqual(['d', 'b', 'a', 'c'])
  })

  it('column 非法值（非数字/≤0/小数）：忽略不重排 + dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASMasonry()
    el.setAttribute('columns', '2')
    el.innerHTML = `
      <div class="a" column="abc">A</div>
      <div class="b">B</div>
      <div class="c" column="0">C</div>
      <div class="d" column="1.5">D</div>
      <div class="e">E</div>
    `
    document.body.appendChild(el)
    expect(orderClasses(el)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(warn).toHaveBeenCalledTimes(3)
    warn.mockRestore()
    el.remove()
  })

  it('column 超出当前列数：忽略 + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASMasonry()
    el.setAttribute('columns', '2')
    el.innerHTML = `
      <div class="a" column="3">A</div>
      <div class="b">B</div>
    `
    document.body.appendChild(el)
    expect(orderClasses(el)).toEqual(['a', 'b'])
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('column 与断点共存：列数变化（属性驱动）时按当前生效列数重算', () => {
    const el = new OASMasonry()
    el.setAttribute('columns', '2 lg:4')
    el.innerHTML = `
      <div class="a" column="1">A</div>
      <div class="b">B</div>
      <div class="c">C</div>
      <div class="d" column="2">D</div>
      <div class="e">E</div>
    `
    document.body.appendChild(el)
    // happy-dom 默认视口 1024 → lg 命中 → 4 列、5 项 → 每列 ceil(5/4)=2 槽
    expect(orderClasses(el)).toEqual(['a', 'b', 'd', 'c', 'e'])
    // 移除断点改纯 2 列 → 每列 ceil(5/2)=3 槽，重排重算
    el.setAttribute('columns', '2')
    expect(orderClasses(el)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('column 与断点共存：视口穿越后重排按当前生效列数重算', () => {
    let roCallback: (() => void) | null = null
    class FakeResizeObserver {
      constructor(cb: () => void) {
        roCallback = cb
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    // 可控视口：happy-dom 内置 matchMedia 不随 innerWidth 变化，这里 stub 以模拟视口穿越
    let viewport = 1024
    vi.stubGlobal('matchMedia', (query: string) => {
      const m = query.match(/min-width:\s*(\d+)px/)
      const min = m ? Number(m[1]) : 0
      return {
        matches: viewport >= min,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      } as unknown as MediaQueryList
    })

    const el = new OASMasonry()
    el.setAttribute('fresh', '')
    el.setAttribute('columns', '2 lg:4')
    el.innerHTML = `
      <div class="a" column="1">A</div>
      <div class="b">B</div>
      <div class="c">C</div>
      <div class="d" column="2">D</div>
      <div class="e">E</div>
    `
    document.body.appendChild(el)
    // 1024 视口 → lg 命中 → 4 列、5 项 → 每列 ceil(5/4)=2 槽
    expect(orderClasses(el)).toEqual(['a', 'b', 'd', 'c', 'e'])
    // 视口穿越到基础段（<640）→ 下一次 update（RO 回调）按 2 列重算
    viewport = 500
    roCallback!()
    expect(orderClasses(el)).toEqual(['a', 'b', 'c', 'd', 'e'])
    el.remove()
    vi.unstubAllGlobals()
  })
})
