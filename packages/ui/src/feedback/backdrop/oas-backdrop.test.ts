import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASBackdrop } from './index.js'

function mount(attrs: Record<string, string> = {}): OASBackdrop {
  const el = new OASBackdrop()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASBackdrop', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.style.overflow = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.style.overflow = ''
  })

  it('open 显示遮罩并默认锁定 body 滚动', () => {
    const el = mount({ open: '' })
    expect(el.shadowRoot!.querySelector('[part="mask"]')).not.toBeNull()
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  it('open=false 卸载节点，无孤儿 DOM，并恢复滚动', () => {
    const el = mount({ open: '' })
    expect(document.body.contains(el)).toBe(true)
    el.removeAttribute('open')
    expect(document.body.contains(el)).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('lock-scroll=false 不锁定滚动', () => {
    const el = mount({ open: '', 'lock-scroll': 'false' })
    expect(el.shadowRoot!.querySelector('[part="mask"]')).not.toBeNull()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('transparent 与 blur 通过 host 属性命中样式选择器', () => {
    const el = mount({ open: '', transparent: '', blur: '' })
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(':host([transparent]) .mask')
    expect(styleText).toContain(':host([blur]) .mask')
  })

  it('点击遮罩派发 oas-click，detail 携带 originalEvent', () => {
    const el = mount({ open: '' })
    let detail: { originalEvent?: Event } | undefined
    el.addEventListener('oas-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    const ev = new MouseEvent('click', { bubbles: true })
    el.shadowRoot!.querySelector('[part="mask"]')!.dispatchEvent(ev)
    expect(detail?.originalEvent).toBe(ev)
  })

  it('断开连接时释放 body 滚动锁', () => {
    const el = mount({ open: '' })
    expect(document.documentElement.style.overflow).toBe('hidden')
    el.remove()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('嵌套遮罩：都关闭后才恢复滚动', () => {
    const a = mount({ open: '' })
    const b = mount({ open: '' })
    expect(document.documentElement.style.overflow).toBe('hidden')
    a.remove()
    expect(document.documentElement.style.overflow).toBe('hidden')
    b.remove()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
