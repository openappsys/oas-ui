import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTextarea } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTextarea {
  const el = new OASTextarea()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function ta(el: OASTextarea): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector('textarea')!
}

/** 行高：优先像素值，无单位倍数 × font-size（与组件内一致） */
function lineHeight(t: HTMLTextAreaElement): number {
  const cs = getComputedStyle(t)
  const lh = parseFloat(cs.lineHeight)
  return cs.lineHeight.endsWith('px') ? lh : lh * parseFloat(cs.fontSize)
}

describe('OASTextarea', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 textarea，rows 默认 3', async () => {
    const el = mount()
    const t = ta(el)
    await Promise.resolve()
    expect(t.tagName).toBe('TEXTAREA')
    expect(Number(t.rows)).toBe(3)
  })

  it('rows/resize 属性生效', () => {
    const el = mount({ rows: '5', resize: 'both' })
    expect(Number(ta(el).rows)).toBe(5)
    expect(ta(el).style.resize).toBe('both')
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: 'a' })
    const t = ta(el)
    expect(t.value).toBe('a')
    el.setAttribute('value', 'b')
    expect(ta(el)).toBe(t)
    expect(t.value).toBe('b')
  })

  it('输入派发 oas-input，detail 携带 value', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    ta(el).value = '文本'
    ta(el).dispatchEvent(new Event('input'))
    expect(detail).toEqual({ value: '文本' })
  })

  it('placeholder/disabled 透传', () => {
    const el = mount({ placeholder: '请输入内容', disabled: '' })
    expect(ta(el).placeholder).toBe('请输入内容')
    expect(ta(el).disabled).toBe(true)
  })

  // ---- v1.3 autosize 增强 ----

  it('autosize 输入后高度自适应（增量 style.height，不重建 DOM）', () => {
    const el = mount({ autosize: '' })
    const t = ta(el)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 60 })
    t.value = '第一行\n第二行'
    t.dispatchEvent(new Event('input'))
    expect(parseInt(t.style.height)).toBeGreaterThan(0)
    expect(ta(el)).toBe(t)
  })

  it('autosize 高度受 min-rows/max-rows 约束（默认 min 1 / max 6）', () => {
    const el = mount({ autosize: '', 'min-rows': '2', 'max-rows': '4' })
    const t = ta(el)
    const lh = lineHeight(t)
    expect(t.style.minHeight).toBe(`${Math.round(lh * 2 + 16)}px`) // 行高×2+上下 padding
    expect(t.style.maxHeight).toBe(`${Math.round(lh * 4 + 16)}px`)
  })

  it('内容超出 max-rows 时高度封顶并出现滚动条', () => {
    const el = mount({ autosize: '', 'max-rows': '2' })
    const t = ta(el)
    const lh = lineHeight(t)
    const maxH = Math.round(lh * 2 + 16)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 500 })
    t.value = '很长的内容'.repeat(20)
    t.dispatchEvent(new Event('input'))
    expect(t.style.overflowY).toBe('auto')
    expect(parseInt(t.style.height)).toBeLessThanOrEqual(maxH)
  })

  it('空内容回到 min-rows 高度', () => {
    const el = mount({ autosize: '', 'min-rows': '1' })
    const t = ta(el)
    const lh = lineHeight(t)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 0 })
    t.value = ''
    t.dispatchEvent(new Event('input'))
    expect(parseInt(t.style.height)).toBe(Math.round(lh + 16))
  })

  it('auto-height 旧属性兼容触发 autosize', () => {
    const el = mount({ 'auto-height': '' })
    const t = ta(el)
    Object.defineProperty(t, 'scrollHeight', { configurable: true, value: 80 })
    t.value = '内容'
    t.dispatchEvent(new Event('input'))
    expect(parseInt(t.style.height)).toBe(80)
  })

  it('无 autosize 时高度自适应不生效', () => {
    const el = mount()
    const t = ta(el)
    t.value = '内容'
    t.dispatchEvent(new Event('input'))
    expect(t.style.height).toBe('')
  })
})

describe('OASTextarea focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 textarea', () => {
    const el = new OASTextarea()
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('textarea'))
  })
})
