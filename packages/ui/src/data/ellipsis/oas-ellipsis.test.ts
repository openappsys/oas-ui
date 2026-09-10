import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASEllipsis } from './index.js'

function mount(attrs: Record<string, string> = {}): OASEllipsis {
  const el = new OASEllipsis()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function textEl(el: OASEllipsis): HTMLElement {
  return el.shadowRoot!.querySelector('.text')!
}

function toggleEl(el: OASEllipsis): HTMLButtonElement {
  return el.shadowRoot!.querySelector('.toggle')!
}

/**
 * 桩掉文本尺寸并强制重跑 update()：
 * happy-dom 不参与布局，scrollWidth/clientWidth 恒为 0，需手动构造溢出条件。
 */
function forceOverflow(el: OASEllipsis, overflow: boolean): void {
  const t = textEl(el)
  Object.defineProperty(t, 'scrollWidth', { value: overflow ? 300 : 100, configurable: true })
  Object.defineProperty(t, 'clientWidth', { value: 100, configurable: true })
  Object.defineProperty(t, 'scrollHeight', { value: overflow ? 90 : 30, configurable: true })
  Object.defineProperty(t, 'clientHeight', { value: 30, configurable: true })
  // 同值重设属性也会触发 attributeChangedCallback → update()
  el.setAttribute('text', el.getAttribute('text') ?? '')
}

describe('OASEllipsis', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无溢出时渲染纯文本，不挂 tooltip、无展开按钮（零孤儿浮层）', () => {
    const el = mount({ text: '短文本' })
    expect(textEl(el).textContent).toBe('短文本')
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    expect(toggleEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('单行溢出时才挂 tooltip，tooltip 内容为全文', () => {
    const el = mount({ text: '这是一段很长的文本' })
    forceOverflow(el, true)
    const tip = el.shadowRoot!.querySelector('oas-tooltip')
    expect(tip).not.toBeNull()
    expect(tip!.getAttribute('content')).toContain('这是一段很长的文本')
    expect(textEl(el).classList.contains('single')).toBe(true)
  })

  it('溢出消失后解除 tooltip 包裹（零孤儿）', () => {
    const el = mount({ text: 'x' })
    forceOverflow(el, true)
    expect(el.shadowRoot!.querySelector('oas-tooltip')).not.toBeNull()
    forceOverflow(el, false)
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    expect(textEl(el).textContent).toBe('x')
  })

  it('rows=2 启用多行 line-clamp 样式（multi 类）', () => {
    const el = mount({ text: '多行文本', rows: '2' })
    const t = textEl(el)
    expect(t.classList.contains('multi')).toBe(true)
    expect(t.classList.contains('single')).toBe(false)
  })

  it('多行溢出时 tooltip 展示全文', () => {
    const el = mount({ text: '多行溢出的完整文本内容', rows: '3' })
    forceOverflow(el, true)
    const tip = el.shadowRoot!.querySelector('oas-tooltip')
    expect(tip).not.toBeNull()
    expect(tip!.getAttribute('content')).toContain('多行溢出的完整文本内容')
  })

  it('tooltip="false" 时溢出也不挂 tooltip', () => {
    const el = mount({ text: '长文本', tooltip: 'false' })
    forceOverflow(el, true)
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
  })

  it('expandable 溢出时显示展开按钮，点击派发 oas-expand 并展示全文', () => {
    const el = mount({ text: '长文本', expandable: '' })
    forceOverflow(el, true)
    const btn = toggleEl(el)
    expect(btn.hasAttribute('hidden')).toBe(false)
    let detail: unknown
    el.addEventListener('oas-expand', (e: Event) => (detail = (e as CustomEvent).detail))
    btn.click()
    expect(detail).toEqual({ expanded: true })
    // 展开后不再省略：无 tooltip、无省略类
    expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    expect(textEl(el).classList.contains('single')).toBe(false)
    expect(textEl(el).classList.contains('multi')).toBe(false)
  })

  it('再次点击派发 oas-collapse 并恢复省略态', () => {
    const el = mount({ text: '长文本', expandable: '' })
    forceOverflow(el, true)
    const btn = toggleEl(el)
    btn.click()
    let detail: unknown
    el.addEventListener('oas-collapse', (e: Event) => (detail = (e as CustomEvent).detail))
    btn.click()
    expect(detail).toEqual({ expanded: false })
    expect(btn.textContent).toContain('ellipsis.expand')
    expect(el.shadowRoot!.querySelector('oas-tooltip')).not.toBeNull()
  })

  it('expandable 无溢出时按钮隐藏', () => {
    const el = mount({ text: '短文本', expandable: '' })
    expect(toggleEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('text 属性变化增量更新内容', () => {
    const el = mount({ text: '旧文本' })
    el.setAttribute('text', '新文本')
    expect(textEl(el).textContent).toBe('新文本')
  })

  it('断开连接清理 ResizeObserver', () => {
    const spy = vi.spyOn(ResizeObserver.prototype, 'disconnect')
    const el = mount({ text: 'x' })
    el.remove()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('纯 CSR：省略态同步写入（行为不变）', () => {
    const el = mount({ text: '长文本' })
    const t = textEl(el)
    Object.defineProperty(t, 'scrollWidth', { value: 300, configurable: true })
    Object.defineProperty(t, 'clientWidth', { value: 100, configurable: true })
    // 同值重设触发 update → 溢出判定同步写入省略类
    el.setAttribute('text', '长文本')
    expect(t.classList.contains('single')).toBe(true)
  })

  describe('direction 省略方向（start 头部省略 / middle 中部省略，缺省 tail 零回归）', () => {
    it('direction 进入 observedAttributes', () => {
      expect(OASEllipsis.observedAttributes).toContain('direction')
    })
    it('direction="start"：单行溢出时加 start 类（省略头部保留尾部，direction:rtl 反转省略侧）', () => {
      const el = mount({ text: '这是一段很长的文本', direction: 'start' })
      forceOverflow(el, true)
      const t = textEl(el)
      expect(t.classList.contains('single')).toBe(true)
      expect(t.classList.contains('start')).toBe(true)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.text\.start\s*{[^}]*direction:\s*rtl/)
      expect(css).toMatch(/\.text\.start\s*{[^}]*unicode-bidi:\s*plaintext/)
    })
    it('direction="start" 无溢出时不加 start 类（纯文本原样）', () => {
      const el = mount({ text: '短文本', direction: 'start' })
      expect(textEl(el).classList.contains('start')).toBe(false)
      expect(textEl(el).textContent).toBe('短文本')
    })
    it('direction="middle"：单行溢出时首尾保留、中部以 … 省略', () => {
      const full = '这是一段很长很长的用于中部省略演示的文本内容abcdefghijklmn'
      const el = mount({ text: full, direction: 'middle' })
      forceOverflow(el, true)
      const content = textEl(el).textContent!
      expect(content).toContain('…')
      expect(content.startsWith('这是')).toBe(true)
      expect(content.endsWith('jklmn')).toBe(true)
      expect(content.length).toBeLessThan(full.length)
      expect(textEl(el).classList.contains('single')).toBe(true)
    })
    it('direction="middle"：溢出时仍挂全文 tooltip（截短后可悬停看全文）', () => {
      const el = mount({
        text: '这是一段很长很长的用于中部省略演示的文本内容',
        direction: 'middle',
      })
      forceOverflow(el, true)
      const tip = el.shadowRoot!.querySelector('oas-tooltip')
      expect(tip).not.toBeNull()
      expect(tip!.getAttribute('content')).toContain('用于中部省略演示')
    })
    it('direction="middle" 无溢出时原样展示全文（不截断）', () => {
      const el = mount({ text: '短文本', direction: 'middle' })
      expect(textEl(el).textContent).toBe('短文本')
    })
    it('缺省 direction=tail：尾部省略行为不变（零回归）', () => {
      const el = mount({ text: '长文本' })
      forceOverflow(el, true)
      const t = textEl(el)
      expect(t.classList.contains('start')).toBe(false)
      expect(t.textContent).toBe('长文本')
    })
    it('direction 非法值回落 tail（不截断、不加 start 类）', () => {
      const el = mount({ text: '长文本', direction: 'end' })
      forceOverflow(el, true)
      const t = textEl(el)
      expect(t.classList.contains('start')).toBe(false)
      expect(t.textContent).toBe('长文本')
    })
    it('rows>=2 + direction 无溢出不截断（多行 line-clamp 保持，纯 CSS 形态）', () => {
      const el = mount({ text: '多行文本', rows: '2', direction: 'middle' })
      const t = textEl(el)
      expect(t.classList.contains('multi')).toBe(true)
      expect(t.textContent).toBe('多行文本')
    })
    it('middle + expandable：展开后展示全文（无省略号）', () => {
      const el = mount({
        text: '长文本中部省略演示内容长文本中部省略演示内容',
        direction: 'middle',
        expandable: '',
      })
      forceOverflow(el, true)
      toggleEl(el).click()
      expect(textEl(el).textContent).toContain('演示')
      expect(textEl(el).textContent).not.toContain('…')
    })
  })

  /** 模拟 DSD 水合：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」（等价于 DSD template 解析结果） */
  function dsdEllipsis(attrs: Record<string, string> = {}): OASEllipsis {
    const el = new OASEllipsis()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.shadowRoot!.innerHTML = `
      <meta data-oas-ssr="oas-ellipsis" data-oas-ssr-v="1">
      <style>.probe { color: red; }</style>
      <div class="root" part="root">
        <div class="text" part="text"></div>
        <button type="button" class="toggle" part="toggle" hidden></button>
      </div>
    `
    return el
  }

  const flushRaf = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  it('DSD 水合：首帧不写省略类，rAF 后按真实溢出校正', async () => {
    const el = dsdEllipsis({ text: '这是一段很长的文本' })
    document.body.appendChild(el)
    const t = textEl(el)
    // 水合接管：指纹移除、text 引用保持（shadow 未重建）
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(textEl(el)).toBe(t)
    // 首帧：溢出判定未执行 → 省略类未写入
    expect(t.classList.contains('single')).toBe(false)
    expect(t.classList.contains('multi')).toBe(false)
    // rAF 前构造溢出条件，校正帧按真实布局补写
    Object.defineProperty(t, 'scrollWidth', { value: 300, configurable: true })
    Object.defineProperty(t, 'clientWidth', { value: 100, configurable: true })
    await flushRaf()
    expect(t.classList.contains('single')).toBe(true)
    el.remove()
  })

  it('DSD 水合：rAF 前重复 update 一律抑制，校正后恢复正常', async () => {
    const el = dsdEllipsis({ text: '长文本', rows: '2' })
    document.body.appendChild(el)
    const t = textEl(el)
    // rAF 前多次属性变化 → 仍不写省略态（class 与 line-clamp 均未落）
    Object.defineProperty(t, 'scrollWidth', { value: 300, configurable: true })
    Object.defineProperty(t, 'clientWidth', { value: 100, configurable: true })
    el.setAttribute('text', '变化')
    expect(t.classList.contains('multi')).toBe(false)
    expect(t.style.getPropertyValue('-webkit-line-clamp')).toBe('')
    await flushRaf()
    // 校正帧：rows=2 → multi 类 + line-clamp=2
    expect(t.classList.contains('multi')).toBe(true)
    expect(t.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
    // 校正后：属性变化同步写入
    el.setAttribute('rows', '3')
    expect(t.style.getPropertyValue('-webkit-line-clamp')).toBe('3')
    el.remove()
  })

  describe('自定义展开/收起文案（expand-text / collapse-text）', () => {
    it('属性文案优先于 i18n 缺省', () => {
      const el = mount({ text: '长文本', expandable: '', 'expand-text': '更多', 'collapse-text': '收起吧' })
      forceOverflow(el, true)
      expect(toggleEl(el).textContent).toBe('更多')
      toggleEl(el).click()
      expect(toggleEl(el).textContent).toBe('收起吧')
    })

    it('新属性进入 observedAttributes', () => {
      expect(OASEllipsis.observedAttributes).toContain('expand-text')
      expect(OASEllipsis.observedAttributes).toContain('collapse-text')
    })
  })

  describe('受控 expanded（属性驱动 + 内部切换反射回属性）', () => {
    it('expanded 属性在场即展开（无需点击），移除即收起', () => {
      const el = mount({ text: '长文本内容用于受控展开演示', expandable: '', expanded: '' })
      expect(textEl(el).textContent).toBe('长文本内容用于受控展开演示')
      expect(toggleEl(el).hidden).toBe(false)
      el.removeAttribute('expanded')
      // 宿主移除属性 → 组件回收到起态（overflow 未桩时按钮隐藏）
      expect(toggleEl(el).hidden).toBe(true)
    })

    it('内部点击反射 expanded 属性（受控宿主可回读）', () => {
      const el = mount({ text: '长文本', expandable: '' })
      forceOverflow(el, true)
      toggleEl(el).click()
      expect(el.hasAttribute('expanded')).toBe(true)
      toggleEl(el).click()
      expect(el.hasAttribute('expanded')).toBe(false)
    })

    it('宿主置 expanded 后内部状态跟随（不派发重复展开事件）', () => {
      const el = mount({ text: '长文本', expandable: '' })
      forceOverflow(el, true)
      let expands = 0
      el.addEventListener('oas-expand', () => expands++)
      el.setAttribute('expanded', '')
      expect(expands).toBe(0)
      expect(toggleEl(el).textContent).toContain('ellipsis.collapse')
    })
  })

  describe('oas-overflow 事件（溢出状态变化派发）', () => {
    it('溢出翻转时派发 detail { overflow }，同值不重复派发', () => {
      const el = mount({ text: 'x' })
      const events: unknown[] = []
      el.addEventListener('oas-overflow', (e: Event) => events.push((e as CustomEvent).detail))
      forceOverflow(el, true)
      expect(events).toEqual([{ overflow: true }])
      forceOverflow(el, true)
      expect(events).toEqual([{ overflow: true }])
      forceOverflow(el, false)
      expect(events).toEqual([{ overflow: true }, { overflow: false }])
    })

    it('进入 observedAttributes 且初始无溢出不派发', () => {
      expect(OASEllipsis.observedAttributes).toContain('tooltip-placement')
      const el = mount({ text: '短文本' })
      let fired = 0
      el.addEventListener('oas-overflow', () => fired++)
      expect(fired).toBe(0)
    })
  })

  describe('tooltip-placement 透传', () => {
    it('溢出挂 tooltip 时 placement 属性直传，变化同步', () => {
      const el = mount({ text: '长文本', 'tooltip-placement': 'bottom' })
      forceOverflow(el, true)
      const tip = el.shadowRoot!.querySelector('oas-tooltip')!
      expect(tip.getAttribute('placement')).toBe('bottom')
      el.setAttribute('tooltip-placement', 'left')
      expect(el.shadowRoot!.querySelector('oas-tooltip')!.getAttribute('placement')).toBe('left')
    })

    it('缺省 placement 为 top', () => {
      const el = mount({ text: '长文本' })
      forceOverflow(el, true)
      expect(el.shadowRoot!.querySelector('oas-tooltip')!.getAttribute('placement')).toBe('top')
    })
  })

  describe('行内展开链接形态（expandable + tail 手动截断）', () => {
    const FULL = '这是一段很长很长的文本，用于行内展开链接形态的截断演示，需要足够长'

    function stubFit(el: OASEllipsis, keep: number): void {
      vi.spyOn(el as unknown as { fitPrefixLength: () => number }, 'fitPrefixLength').mockReturnValue(
        keep,
      )
    }

    it('溢出时：文本截断带省略号，展开链接行内（inline 类、root 直接子级不嵌套文本）', () => {
      const el = mount({ text: FULL, expandable: '' })
      stubFit(el, 8)
      forceOverflow(el, true)
      const t = textEl(el)
      expect(t.classList.contains('manual')).toBe(true)
      expect(t.textContent).toContain('…')
      expect(t.textContent!.length).toBeLessThan(FULL.length)
      const btn = toggleEl(el)
      expect(btn.classList.contains('inline')).toBe(true)
      expect(btn.hidden).toBe(false)
      // 关键结构约束：按钮留在 .root 下（不被包进 .text，防 textContent 写入清掉）
      expect(btn.parentElement!.classList.contains('root')).toBe(true)
    })

    it('手动截断溢出态挂全文 tooltip（inline-block 包裹随行内流）', () => {
      const el = mount({ text: FULL, expandable: '' })
      stubFit(el, 8)
      forceOverflow(el, true)
      const tip = el.shadowRoot!.querySelector<HTMLElement>('oas-tooltip')
      expect(tip).not.toBeNull()
      expect(tip!.style.display).toBe('inline-block')
      expect(tip!.getAttribute('content')).toBe(FULL)
    })

    it('点击展开：全文 + 行内收起链接，无省略号、无 tooltip', () => {
      const el = mount({ text: FULL, expandable: '' })
      stubFit(el, 8)
      forceOverflow(el, true)
      toggleEl(el).click()
      const t = textEl(el)
      expect(t.textContent).toContain(FULL.slice(0, 10))
      expect(t.textContent).not.toContain('…')
      expect(toggleEl(el).textContent).toContain('ellipsis.collapse')
      expect(el.shadowRoot!.querySelector('oas-tooltip')).toBeNull()
    })

    it('收起后恢复省略态与 tooltip（回归不丢态）', () => {
      const el = mount({ text: FULL, expandable: '' })
      stubFit(el, 8)
      forceOverflow(el, true)
      toggleEl(el).click()
      toggleEl(el).click()
      expect(textEl(el).textContent).toContain('…')
      expect(el.shadowRoot!.querySelector('oas-tooltip')).not.toBeNull()
    })

    it('测量恒 0（无布局环境）安全兜底：返回全文 + 链接，不截断不抛错', () => {
      const el = mount({ text: FULL, expandable: '' })
      forceOverflow(el, true)
      expect(textEl(el).textContent).toBe(FULL)
      expect(toggleEl(el).hidden).toBe(false)
    })

    it('direction=start/middle 保持块级按钮形态（manual 类不生效）', () => {
      const el = mount({ text: FULL, expandable: '', direction: 'middle' })
      forceOverflow(el, true)
      expect(textEl(el).classList.contains('manual')).toBe(false)
      expect(toggleEl(el).classList.contains('inline')).toBe(false)
    })
  })

  describe('lines 行数（rows 同义别名，lines 优先）', () => {
    it('lines 进入 observedAttributes', () => {
      expect(OASEllipsis.observedAttributes).toContain('lines')
    })

    it('lines=2 启用多行省略（multi 类 + line-clamp=2）', () => {
      const el = mount({ text: '多行文本', lines: '2' })
      const t = textEl(el)
      expect(t.classList.contains('multi')).toBe(true)
      expect(t.classList.contains('single')).toBe(false)
      expect(t.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
    })

    it('lines 与 rows 同时存在时 lines 优先', () => {
      const el = mount({ text: '多行文本', rows: '3', lines: '2' })
      expect(textEl(el).style.getPropertyValue('-webkit-line-clamp')).toBe('2')
      el.setAttribute('lines', '4')
      expect(textEl(el).style.getPropertyValue('-webkit-line-clamp')).toBe('4')
    })

    it('缺省 lines 时 rows 语义不变（单行零回归）', () => {
      const el = mount({ text: '短文本' })
      forceOverflow(el, true)
      const t = textEl(el)
      expect(t.classList.contains('single')).toBe(true)
      expect(t.classList.contains('multi')).toBe(false)
    })
  })

  describe('direction 多行省略（middle/start 镜像截断，rows≥2 生效）', () => {
    const FULL = '这是一段很长很长的用于多行中部省略演示的文本内容，需要溢出两行容器才能触发截断效果'

    function stubMulti(
      el: OASEllipsis,
      method: 'truncateMiddleMulti' | 'truncateStartMulti',
      ret: string,
    ): ReturnType<typeof vi.spyOn> {
      return vi.spyOn(
        el as unknown as Record<string, (f: string, r: number) => string>,
        method,
      ).mockReturnValue(ret)
    }

    it('rows≥2 + middle + 溢出：调用镜像截断并写入保首尾内容', () => {
      const el = mount({ text: FULL, rows: '2', direction: 'middle' })
      const spy = stubMulti(el, 'truncateMiddleMulti', '这是一段…截断效果')
      forceOverflow(el, true)
      expect(spy).toHaveBeenCalled()
      expect(textEl(el).textContent).toBe('这是一段…截断效果')
      expect(textEl(el).classList.contains('multi')).toBe(true)
    })

    it('多行 middle 截断态仍挂全文 tooltip', () => {
      const el = mount({ text: FULL, rows: '2', direction: 'middle' })
      stubMulti(el, 'truncateMiddleMulti', '这是一段…截断效果')
      forceOverflow(el, true)
      const tip = el.shadowRoot!.querySelector('oas-tooltip')
      expect(tip).not.toBeNull()
      expect(tip!.getAttribute('content')).toBe(FULL)
    })

    it('多行 middle 测量不可用（无布局环境）时安全兜底：不截断、全显', () => {
      const el = mount({ text: FULL, rows: '2', direction: 'middle' })
      forceOverflow(el, true)
      expect(textEl(el).textContent).toBe(FULL)
    })

    it('rows≥2 + start + 溢出：头部省略保留尾部（调用 start 多行截断）', () => {
      const el = mount({ text: FULL, rows: '2', direction: 'start' })
      const spy = stubMulti(el, 'truncateStartMulti', '…截断效果')
      forceOverflow(el, true)
      expect(spy).toHaveBeenCalled()
      expect(textEl(el).textContent).toBe('…截断效果')
    })

    it('多行 start 测量不可用时安全兜底：全显', () => {
      const el = mount({ text: FULL, rows: '3', direction: 'start' })
      forceOverflow(el, true)
      expect(textEl(el).textContent).toBe(FULL)
    })

    it('expanded 时不截断（全文展示，aria 与展开态一致）', () => {
      const el = mount({ text: FULL, rows: '2', direction: 'middle', expanded: '' })
      const spy = stubMulti(el, 'truncateMiddleMulti', '这是一段…截断效果')
      forceOverflow(el, true)
      expect(spy).not.toHaveBeenCalled()
      expect(textEl(el).textContent).toBe(FULL)
    })
  })

  describe('suffix 保留后缀（tail 方向）', () => {
    const FULL = '2026 年度组件库工程化实践报告——从 monorepo 到发布的完整路线图.pdf'

    it('suffix 进入 observedAttributes', () => {
      expect(OASEllipsis.observedAttributes).toContain('suffix')
    })

    it('tail + suffix + 溢出：截断为「正文…后缀」，suffix 不被裁掉', () => {
      const el = mount({ text: FULL, suffix: '.pdf' })
      const spy = vi.spyOn(
        el as unknown as { truncateTailSuffix: (f: string, r: number, s: string) => string },
        'truncateTailSuffix',
      ).mockReturnValue('2026 年度….pdf')
      forceOverflow(el, true)
      expect(spy).toHaveBeenCalled()
      expect(textEl(el).textContent).toBe('2026 年度….pdf')
    })

    it('suffix 测量不可用时安全兜底：全文原样（含后缀）', () => {
      const el = mount({ text: FULL, suffix: '.pdf' })
      forceOverflow(el, true)
      expect(textEl(el).textContent).toBe(FULL)
    })

    it('middle/start 方向 suffix 不生效（不调用 tail 截断）', () => {
      const el = mount({ text: FULL, direction: 'middle', suffix: '.pdf' })
      const spy = vi.spyOn(
        el as unknown as { truncateTailSuffix: (f: string, r: number, s: string) => string },
        'truncateTailSuffix',
      )
      forceOverflow(el, true)
      expect(spy).not.toHaveBeenCalled()
    })

    it('expandable + tail + suffix：手动截断内容保留后缀，展开链接在后', () => {
      const el = mount({ text: FULL, expandable: '', suffix: '.pdf' })
      vi.spyOn(el as unknown as { fitPrefixLength: () => number }, 'fitPrefixLength').mockReturnValue(
        8,
      )
      forceOverflow(el, true)
      expect(textEl(el).textContent).toBe(`${FULL.slice(0, 8)}….pdf`)
      const btn = toggleEl(el)
      expect(btn.hidden).toBe(false)
      expect(btn.classList.contains('inline')).toBe(true)
    })
  })

  describe('expand-trigger="click" 点文本展开', () => {
    it('expand-trigger 进入 observedAttributes', () => {
      expect(OASEllipsis.observedAttributes).toContain('expand-trigger')
    })

    it('click 模式：溢出时文本 role=button + tabindex=0 + aria-expanded=false，按钮隐藏', () => {
      const el = mount({ text: '这是一段很长很长的文本用于点文本展开演示', expandable: '', 'expand-trigger': 'click' })
      forceOverflow(el, true)
      const t = textEl(el)
      expect(t.getAttribute('role')).toBe('button')
      expect(t.getAttribute('tabindex')).toBe('0')
      expect(t.getAttribute('aria-expanded')).toBe('false')
      expect(toggleEl(el).hidden).toBe(true)
    })

    it('点击文本展开：派 oas-expand、反射 expanded、aria-expanded=true、展示全文', () => {
      const el = mount({ text: '这是一段很长很长的文本用于点文本展开演示', expandable: '', 'expand-trigger': 'click' })
      forceOverflow(el, true)
      let detail: unknown
      el.addEventListener('oas-expand', (e: Event) => (detail = (e as CustomEvent).detail))
      textEl(el).click()
      expect(detail).toEqual({ expanded: true })
      expect(el.hasAttribute('expanded')).toBe(true)
      expect(textEl(el).getAttribute('aria-expanded')).toBe('true')
      expect(textEl(el).textContent).toContain('点文本展开演示')
    })

    it('Enter / Space 键盘触发等价点击', () => {
      const el = mount({ text: '这是一段很长很长的文本用于点文本展开演示', expandable: '', 'expand-trigger': 'click' })
      forceOverflow(el, true)
      textEl(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(el.hasAttribute('expanded')).toBe(true)
      textEl(el).dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      expect(el.hasAttribute('expanded')).toBe(false)
    })

    it('展开后再次点击收起：派 oas-collapse、aria-expanded=false', () => {
      const el = mount({ text: '这是一段很长很长的文本用于点文本展开演示', expandable: '', 'expand-trigger': 'click' })
      forceOverflow(el, true)
      textEl(el).click()
      let detail: unknown
      el.addEventListener('oas-collapse', (e: Event) => (detail = (e as CustomEvent).detail))
      textEl(el).click()
      expect(detail).toEqual({ expanded: false })
      expect(el.hasAttribute('expanded')).toBe(false)
      expect(textEl(el).getAttribute('aria-expanded')).toBe('false')
    })

    it('缺省形态（无 expand-trigger）：文本无 role/tabindex，按钮可见（零回归）', () => {
      const el = mount({ text: '这是一段很长很长的文本用于点文本展开演示', expandable: '' })
      forceOverflow(el, true)
      expect(textEl(el).hasAttribute('role')).toBe(false)
      expect(textEl(el).hasAttribute('tabindex')).toBe(false)
      expect(toggleEl(el).hidden).toBe(false)
    })

    it('无 expandable 时 expand-trigger 不生效（文本无交互语义）', () => {
      const el = mount({ text: '短文本', 'expand-trigger': 'click' })
      forceOverflow(el, true)
      expect(textEl(el).hasAttribute('role')).toBe(false)
      expect(textEl(el).hasAttribute('tabindex')).toBe(false)
    })
  })
})
