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

  function dispatchWheel(): boolean {
    const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true })
    document.body.dispatchEvent(ev)
    return ev.defaultPrevented
  }

  it('open 锁定滚动：拦截滚动行为但保留滚动条（不移除 → 视口宽度不变 → 无页面位移）', () => {
    const el = mount({ open: '' })
    expect(el.shadowRoot!.querySelector('[part="mask"]')).not.toBeNull()
    // 不移除滚动条（overflow 保持空，滚动条可见）
    expect(document.documentElement.style.overflow).toBe('')
    // 拦截滚动行为
    expect(dispatchWheel()).toBe(true)
  })

  it('open=false 卸载节点，无孤儿 DOM，并解除滚动拦截', () => {
    const el = mount({ open: '' })
    expect(document.body.contains(el)).toBe(true)
    el.removeAttribute('open')
    expect(document.body.contains(el)).toBe(false)
    expect(dispatchWheel()).toBe(false)
  })

  it('lock-scroll=false 不锁定滚动', () => {
    mount({ open: '', 'lock-scroll': 'false' })
    expect(dispatchWheel()).toBe(false)
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

  it('断开连接时解除滚动拦截', () => {
    const el = mount({ open: '' })
    expect(dispatchWheel()).toBe(true)
    el.remove()
    expect(dispatchWheel()).toBe(false)
  })

  it('嵌套遮罩：都关闭后才解除拦截', () => {
    const a = mount({ open: '' })
    const b = mount({ open: '' })
    expect(dispatchWheel()).toBe(true)
    a.remove()
    expect(dispatchWheel()).toBe(true)
    b.remove()
    expect(dispatchWheel()).toBe(false)
  })
})
