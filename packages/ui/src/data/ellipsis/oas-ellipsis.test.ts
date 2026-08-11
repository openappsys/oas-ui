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
})
