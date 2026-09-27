import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
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

  it('不写内联 display（:host{display:grid} 样式表兜底）——内联 display 会压过 :host([hidden]) 使动态 hidden 失效', () => {
    const grid = new OASGrid()
    grid.innerHTML = `<oas-grid-item>a</oas-grid-item>`
    document.body.appendChild(grid)
    expect(grid.style.display, 'update() 不应写内联 display').toBe('')
    // 动态加 hidden（hidden 不在 observedAttributes，曾因内联 display 残留依旧可见）
    grid.setAttribute('hidden', '')
    expect(grid.style.display, '动态 hidden 场景同样无内联 display 残留').toBe('')
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

  // ===== 布局批 2：columns 断点简写 / min-child-width 自适应宫格 =====

  function breakpointCss(grid: OASGrid): string {
    return grid.shadowRoot!.querySelector<HTMLStyleElement>('style[data-oas-grid-breakpoints]')!.textContent
  }

  it('columns 断点简写：宿主 var() 兜底基础值 + shadow @media 规则注入（sm/md 升序）', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '3 md:2 sm:1')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('var(--oas-grid-columns, repeat(3, 1fr))')
    const css = breakpointCss(grid)
    expect(css).toContain('@media (min-width: 640px) { :host { --oas-grid-columns: repeat(1, 1fr) } }')
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-columns: repeat(2, 1fr) } }')
  })

  it('columns 纯单值零回归：不包 var()、不生成 @media 规则', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '4')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    expect(breakpointCss(grid)).toBe('')
  })

  it('columns 断点简写移除后：@media 规则清空、回内联直写', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '3 md:2')
    document.body.appendChild(grid)
    expect(breakpointCss(grid)).not.toBe('')
    grid.setAttribute('columns', '5')
    expect(grid.style.gridTemplateColumns).toBe('repeat(5, 1fr)')
    expect(breakpointCss(grid)).toBe('')
  })

  it('columns 断点值非法：dev 告警并丢弃该断点规则（退化为基础列数直写，不留空 var 壳）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = new OASGrid()
    grid.setAttribute('columns', '3 md:abc')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)')
    expect(breakpointCss(grid)).toBe('')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('columns 非法断点名：dev 告警并丢弃该断点规则（保留其余合法断点）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = new OASGrid()
    grid.setAttribute('columns', '3 foo:1 md:2')
    document.body.appendChild(grid)
    const css = breakpointCss(grid)
    expect(css).not.toContain('foo')
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-grid-columns: repeat(2, 1fr) } }')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('min-child-width：auto-fit + minmax 模板（子项免断点流式重排）', () => {
    const grid = new OASGrid()
    grid.setAttribute('min-child-width', '200px')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(200px, 1fr))')
  })

  it('min-child-width 纯数字补 px', () => {
    const grid = new OASGrid()
    grid.setAttribute('min-child-width', '180')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(180px, 1fr))')
  })

  it('columns 与 min-child-width 并存：columns 优先（忽略 min-child-width）', () => {
    const grid = new OASGrid()
    grid.setAttribute('columns', '3')
    grid.setAttribute('min-child-width', '200px')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)')
  })

  it('移除 min-child-width 回落默认 24 列', () => {
    const grid = new OASGrid()
    grid.setAttribute('min-child-width', '200px')
    document.body.appendChild(grid)
    grid.removeAttribute('min-child-width')
    expect(grid.style.gridTemplateColumns).toBe('repeat(24, 1fr)')
  })

  it('min-child-width 误用断点协议（含空格/冒号）：dev 告警并忽略（回落默认列数）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grid = new OASGrid()
    grid.setAttribute('min-child-width', '200px md:300px')
    document.body.appendChild(grid)
    expect(grid.style.gridTemplateColumns).toBe('repeat(24, 1fr)')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    grid.remove()
  })

  it('min-child-width / columns 进入 observedAttributes', () => {
    expect(OASGrid.observedAttributes).toContain('min-child-width')
    expect(OASGrid.observedAttributes).toContain('columns')
  })
})

describe('OASGrid 双轴 gap（PRD P2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountGrid(gap: string): OASGrid {
    const grid = new OASGrid()
    grid.setAttribute('gap', gap)
    grid.innerHTML = '<oas-grid-item>a</oas-grid-item>'
    document.body.appendChild(grid)
    return grid
  }

  it('gap 逗号双值 "8,16"：row-gap 8 / column-gap 16（与空格双值同语义）', () => {
    const grid = mountGrid('8,16')
    expect(grid.style.rowGap).toBe('8px')
    expect(grid.style.columnGap).toBe('16px')
  })

  it('gap 单值兼容零回归：简写直写 + 长hand清空', () => {
    const grid = mountGrid('12')
    expect(grid.style.gap).toBe('12px')
    expect(grid.style.rowGap).toBe('')
    expect(grid.style.columnGap).toBe('')
  })

  it('row-gap / column-gap 分离属性：独立生效并覆盖 gap 对应轴', () => {
    const grid = new OASGrid()
    grid.setAttribute('gap', '8,16')
    grid.setAttribute('row-gap', '24')
    grid.setAttribute('column-gap', '32px')
    grid.innerHTML = '<oas-grid-item>a</oas-grid-item>'
    document.body.appendChild(grid)
    expect(grid.style.rowGap).toBe('24px')
    expect(grid.style.columnGap).toBe('32px')
  })

  it('row-gap 单独设置时另一轴仍走 gap 解析结果', () => {
    const grid = new OASGrid()
    grid.setAttribute('gap', '10 20')
    grid.setAttribute('row-gap', '40')
    grid.innerHTML = '<oas-grid-item>a</oas-grid-item>'
    document.body.appendChild(grid)
    expect(grid.style.rowGap).toBe('40px')
    expect(grid.style.columnGap).toBe('20px')
  })
})

describe('OASGrid collapsed-rows 折叠行（PRD P2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** 挂 6 个 span=8 的子项（每行 3 个，共 2 行） */
  function mountGrid(attrs: Record<string, string> = {}): OASGrid {
    const grid = new OASGrid()
    for (const [k, v] of Object.entries(attrs)) grid.setAttribute(k, v)
    grid.innerHTML = Array.from({ length: 6 }, (_, i) => `<oas-grid-item span="8">项 ${i + 1}</oas-grid-item>`).join('')
    document.body.appendChild(grid)
    return grid
  }

  function items(grid: OASGrid): NodeListOf<HTMLElement> {
    return grid.querySelectorAll<HTMLElement>('oas-grid-item')
  }

  function tail(grid: OASGrid): HTMLElement {
    return grid.shadowRoot!.querySelector<HTMLElement>('[part="collapse-tail"]')!
  }

  function tailBtn(grid: OASGrid): HTMLButtonElement {
    return tail(grid).querySelector('button')!
  }

  it('未启用（无 collapsed-rows）：所有子项可见，尾格隐藏', () => {
    const grid = mountGrid()
    expect([...items(grid)].every((i) => !i.hasAttribute('hidden'))).toBe(true)
    expect(tail(grid).hidden).toBe(true)
  })

  it('collapsed-rows=1：首行 3 项可见、其余隐藏；尾格显示「展开」', () => {
    const grid = mountGrid({ 'collapsed-rows': '1' })
    const els = [...items(grid)]
    expect(
      els.slice(0, 3).every((i) => !i.hasAttribute('hidden')),
      '首行可见',
    ).toBe(true)
    expect(
      els.slice(3).every((i) => i.hasAttribute('hidden')),
      '超出行隐藏',
    ).toBe(true)
    expect(tail(grid).hidden).toBe(false)
    expect(tailBtn(grid).textContent).toBe('展开')
    expect(tailBtn(grid).getAttribute('aria-expanded')).toBe('false')
  })

  it('点击尾格展开：全部可见、文案转「收起」、aria-expanded 翻转、写回 collapsed 属性并派发 oas-collapse', () => {
    const grid = mountGrid({ 'collapsed-rows': '1' })
    const events: boolean[] = []
    grid.addEventListener('oas-collapse', (e) => events.push((e as CustomEvent).detail.collapsed))
    tailBtn(grid).click()
    expect(
      [...items(grid)].every((i) => !i.hasAttribute('hidden')),
      '展开后全部可见',
    ).toBe(true)
    expect(tailBtn(grid).textContent).toBe('收起')
    expect(tailBtn(grid).getAttribute('aria-expanded')).toBe('true')
    expect(grid.hasAttribute('collapsed'), '展开态写回 collapsed 属性移除').toBe(false)
    expect(events).toEqual([false])
    // 再点收起：回到首行可见
    tailBtn(grid).click()
    expect(items(grid)[4]!.hasAttribute('hidden')).toBe(true)
    expect(events).toEqual([false, true])
  })

  it('先少后多：首帧行数不足不落闩——动态增项超过 collapsed-rows 时补写 collapsed 并出现尾格', async () => {
    const el = new OASGrid()
    el.setAttribute('collapsed-rows', '1')
    el.innerHTML = '<oas-grid-item span="24"><div>条件 1</div></oas-grid-item>'
    document.body.appendChild(el)
    expect(el.hasAttribute('collapsed'), '首帧 1 行不超限时无 collapsed').toBe(false)
    // 动态增到 2 行（MutationObserver 重算）
    const item2 = document.createElement('oas-grid-item')
    item2.setAttribute('span', '24')
    item2.innerHTML = '<div>条件 2</div>'
    el.appendChild(item2)
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(el.hasAttribute('collapsed'), '增长超过 1 行后补写 collapsed').toBe(true)
    expect(tail(el).hidden, '尾格出现（折叠入口）').toBe(false)
  })

  it('collapsed-rows=2（行数≥总行数）：无可折叠内容——全部可见、尾格隐藏、不写 collapsed（不误导宿主读态）', () => {
    const grid = mountGrid({ 'collapsed-rows': '2' })
    expect([...items(grid)].every((i) => !i.hasAttribute('hidden'))).toBe(true)
    // 2 行全部可见 → 无可折叠内容，尾格隐藏
    expect(tail(grid).hidden).toBe(true)
  })

  it('外部设 collapsed 属性可受控展开/收起（受控语义）', () => {
    const grid = mountGrid({ 'collapsed-rows': '1', collapsed: '' })
    expect(items(grid)[3]!.hasAttribute('hidden'), '初始 collapsed 收起').toBe(true)
    grid.removeAttribute('collapsed')
    expect(items(grid)[3]!.hasAttribute('hidden'), '移除 collapsed 展开').toBe(false)
    grid.setAttribute('collapsed', '')
    expect(items(grid)[3]!.hasAttribute('hidden'), '重新设 collapsed 收起').toBe(true)
  })

  it('子项增删后自动重算折叠布局（MutationObserver）', async () => {
    const grid = mountGrid({ 'collapsed-rows': '1' })
    expect(items(grid)[3]!.hasAttribute('hidden')).toBe(true)
    items(grid)[3]!.remove()
    await new Promise((r) => setTimeout(r))
    // 移除一项后仍 5 项 > 3，第 4 项（原第 5 项）应隐藏
    expect(items(grid)[3]!.hasAttribute('hidden')).toBe(true)
    // 全部移除：无内容，尾格隐藏
    while (grid.firstChild) grid.removeChild(grid.firstChild)
    await new Promise((r) => setTimeout(r))
    expect(tail(grid).hidden).toBe(true)
  })

  it('span=auto 子项在折叠行模型中按整行计（每项独占一行）', () => {
    const grid = new OASGrid()
    grid.setAttribute('collapsed-rows', '1')
    grid.innerHTML =
      '<oas-grid-item span="8">A</oas-grid-item><oas-grid-item span="8">B</oas-grid-item><oas-grid-item span="auto">C</oas-grid-item><oas-grid-item span="8">D</oas-grid-item>'
    document.body.appendChild(grid)
    const els = [...items(grid)]
    // A、B 在第 1 行；C（auto 视作整行）独立第 2 行；D 第 3 行 → 折叠 1 行时 C、D 隐藏
    expect(els[0]!.hasAttribute('hidden')).toBe(false)
    expect(els[1]!.hasAttribute('hidden')).toBe(false)
    expect(els[2]!.hasAttribute('hidden')).toBe(true)
    expect(els[3]!.hasAttribute('hidden')).toBe(true)
  })

  it('columns/min-child-width 自动布局下折叠行不启用（行模型依赖 span/offset 语义）', () => {
    const grid = mountGrid({ 'collapsed-rows': '1', columns: '3' })
    expect(
      [...items(grid)].every((i) => !i.hasAttribute('hidden')),
      'auto 布局忽略折叠行',
    ).toBe(true)
    expect(tail(grid).hidden).toBe(true)
  })
})
