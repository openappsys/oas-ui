import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASContextMenu } from './index.js'

const ITEMS = JSON.stringify([
  { label: '复制', value: 'copy' },
  { label: '粘贴', value: 'paste' },
])

function mount(): OASContextMenu {
  const el = new OASContextMenu()
  el.setAttribute('items', ITEMS)
  el.innerHTML = `<div style="width:200px;height:100px">右键区域</div>`
  document.body.appendChild(el)
  return el
}

/** 内层 oas-menu 的影子根 */
function innerMenuRoot(el: OASContextMenu): ShadowRoot {
  const menu = el.shadowRoot!.querySelector('oas-menu')!
  return menu.shadowRoot!
}

describe('OASContextMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('contextmenu 事件打开菜单并定位到鼠标位置', async () => {
    const el = mount()
    const target = el.querySelector('div')!
    target.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 80 }),
    )
    await Promise.resolve()
    const anchor = el.shadowRoot!.querySelector('.menu-anchor')!
    expect(anchor.hasAttribute('hidden')).toBe(false)
    expect(anchor.getAttribute('style')).toContain('120px')
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount()
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'copy' })
    expect(el.shadowRoot!.querySelector('.menu-anchor')!.hasAttribute('hidden')).toBe(true)
  })

  it('Esc 关闭菜单', async () => {
    const el = mount()
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.shadowRoot!.querySelector('.menu-anchor')!.hasAttribute('hidden')).toBe(true)
  })
})
