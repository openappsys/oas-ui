import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASList, OASListItem } from './index.js'

function mount(): OASList {
  const el = new OASList()
  el.innerHTML = `
    <oas-list-item title="条目一"><span>描述</span></oas-list-item>
    <oas-list-item title="条目二"></oas-list-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASList', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染列表项', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="list"]')).not.toBeNull()
    expect(el.querySelectorAll('oas-list-item').length).toBe(2)
  })

  it('bordered 时加边框', () => {
    const el = mount()
    el.setAttribute('bordered', '')
    expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-bordered')).toBe('true')
  })

  it('loading 时显示骨架占位、隐藏列表项', () => {
    const el = mount()
    el.setAttribute('loading', '')
    const skeleton = el.shadowRoot!.querySelector('[part="skeleton"]')!
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(skeleton.hasAttribute('hidden')).toBe(false)
    expect(skeleton.querySelectorAll('.sk-line').length).toBe(3)
    expect(body.hasAttribute('hidden')).toBe(true)
  })

  it('empty 属性强制显示空态', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    document.body.appendChild(el)
    const empty = el.shadowRoot!.querySelector('[part="empty"]')!
    const body = el.shadowRoot!.querySelector('[part="body"]')!
    expect(empty.hasAttribute('hidden')).toBe(false)
    expect(body.hasAttribute('hidden')).toBe(true)
  })

  it('无子项时自动显示空态', () => {
    const el = new OASList()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('loading 优先于空态', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('loading', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="skeleton"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('empty-text 自定义空态文案', () => {
    const el = new OASList()
    el.setAttribute('empty', '')
    el.setAttribute('empty-text', '没有更多数据了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多数据了')
  })
})
