import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASComment } from './index.js'

function mount(inner = ''): OASComment {
  const el = new OASComment()
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

const NAMED_SLOTS = ['avatar', 'author', 'time', 'content', 'actions']

describe('OASComment', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染五个命名插槽 + 默认插槽（子评论）', () => {
    const el = mount()
    const slots = Array.from(el.shadowRoot!.querySelectorAll('slot'))
    const names = slots.map((s) => s.getAttribute('name'))
    for (const name of NAMED_SLOTS) expect(names).toContain(name)
    expect(names).toContain(null) // 默认插槽承载嵌套子评论
  })

  it('无内容时渲染不报错，各区块隐藏', () => {
    const el = mount()
    for (const part of [...NAMED_SLOTS, 'children']) {
      const wrap = el.shadowRoot!.querySelector(`[part="${part}"]`)!
      expect(wrap.hasAttribute('hidden')).toBe(true)
    }
  })

  it('填入插槽内容后对应区块显示，空插槽仍隐藏', async () => {
    const el = mount()
    el.innerHTML = `
      <span slot="author">张三</span>
      <span slot="time">3 分钟前</span>
      <p slot="content">这是一条评论。</p>
    `
    await new Promise((r) => setTimeout(r, 0))
    for (const part of ['author', 'time', 'content']) {
      expect(el.shadowRoot!.querySelector(`[part="${part}"]`)!.hasAttribute('hidden')).toBe(false)
    }
    expect(el.shadowRoot!.querySelector('[part="avatar"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="actions"]')!.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="children"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('嵌套 oas-comment 子评论走默认插槽并显示缩进容器', async () => {
    const child = new OASComment()
    child.innerHTML = '<span slot="content">子评论</span>'
    const el = mount('<span slot="content">父评论</span>')
    el.appendChild(child)
    await new Promise((r) => setTimeout(r, 0))
    const childrenWrap = el.shadowRoot!.querySelector('[part="children"]')!
    const slot = childrenWrap.querySelector('slot')!
    expect(slot.assignedNodes()).toContain(child)
    expect(childrenWrap.hasAttribute('hidden')).toBe(false)
  })

  it('断开再重连后 slotchange 仍生效', async () => {
    const el = mount()
    el.remove()
    document.body.appendChild(el)
    el.innerHTML = '<span slot="author">张三</span>'
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="author"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('清空插槽内容后区块重新隐藏', async () => {
    const el = mount('<span slot="content">内容</span>')
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(false)
    el.innerHTML = ''
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="content"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('align 属性进 observedAttributes；left/right/非法值均不报错', () => {
    expect(OASComment.observedAttributes).toContain('align')
    const el = mount()
    el.setAttribute('align', 'right')
    el.setAttribute('align', 'center') // 非 left/right 取值：CSS 选择器不命中即回落默认
    expect(el.shadowRoot!.querySelector('[part="comment"]')).not.toBeNull()
  })

  it('align=right 提供 time 右挤与 actions 右对齐规则（CSS 级，逻辑属性 RTL 安全）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([align="right"])')
    expect(css).toContain('margin-inline-start: auto')
    expect(css).toContain('justify-content: flex-end')
  })

  it('quote/reply 插槽：结构存在、空隐藏、有内容显示', async () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot[name="quote"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot[name="reply"]')).not.toBeNull()
    for (const part of ['quote', 'reply']) {
      expect(el.shadowRoot!.querySelector(`[part="${part}"]`)!.hasAttribute('hidden')).toBe(true)
    }
    el.innerHTML = `
      <span slot="author">张三</span>
      <span slot="reply">回复 @李四</span>
      <blockquote slot="quote" style="margin: 0">被引用的原文</blockquote>
      <p slot="content">赞同 +1</p>
    `
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="reply"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="quote"]')!.hasAttribute('hidden')).toBe(false)
    // 区块顺序：reply 目标在 head 之后，quote 在 content 之前
    const order = ['head', 'reply', 'quote', 'content', 'actions'].map((p) => {
      const node = el.shadowRoot!.querySelector(`[part="${p}"]`)!
      return Array.from(node.parentElement!.children).indexOf(node)
    })
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})
