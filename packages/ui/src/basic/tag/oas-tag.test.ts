import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTag } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '标签'): OASTag {
  const el = new OASTag()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function root(el: OASTag): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.tag')!
}

describe('OASTag', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认渲染：type default、size medium、含 slot', async () => {
    const el = mount({}, '进行中')
    const r = root(el)
    await Promise.resolve()
    expect(r.classList.contains('default')).toBe(true)
    expect(r.classList.contains('medium')).toBe(true)
    expect(el.textContent).toContain('进行中')
    expect(r.querySelector('slot')).not.toBeNull()
  })

  it('type/size/round 属性映射到 class', () => {
    const el = mount({ type: 'success', size: 'small', round: '' })
    const r = root(el)
    expect(r.classList.contains('success')).toBe(true)
    expect(r.classList.contains('small')).toBe(true)
    expect(r.classList.contains('round')).toBe(true)
  })

  it('默认关闭按钮 hidden（不可交互/不入 a11y 树）；closable 时显示', () => {
    const el = mount({})
    const btn = root(el).querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn!.hidden).toBe(true)
    el.setAttribute('closable', '')
    expect(root(el).querySelector('button')!.hidden).toBe(false)
    expect(root(el).querySelector('button')!.getAttribute('aria-label')).toBe('关闭')
  })

  it('点关闭派发 oas-close（bubbles + composed + cancelable），组件自动移除', () => {
    const el = mount({ closable: '' })
    let detail: unknown
    let fired = 0
    el.addEventListener('oas-close', (e: Event) => {
      fired++
      detail = e
    })
    root(el).querySelector('button')!.click()
    expect(fired).toBe(1)
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
    expect((detail as CustomEvent).cancelable).toBe(true)
    expect(el.isConnected).toBe(false)
  })

  it('宿主 preventDefault 后组件不移除', () => {
    const el = mount({ closable: '' })
    el.addEventListener('oas-close', (e: Event) => e.preventDefault())
    root(el).querySelector('button')!.click()
    expect(el.isConnected).toBe(true)
  })

  it('属性变化增量更新：切换 type 不重建内部节点引用', () => {
    const el = mount({ type: 'primary' })
    const r = root(el)
    el.setAttribute('type', 'danger')
    el.setAttribute('round', '')
    expect(root(el)).toBe(r)
    expect(r.classList.contains('danger')).toBe(true)
    expect(r.classList.contains('round')).toBe(true)
  })
})
