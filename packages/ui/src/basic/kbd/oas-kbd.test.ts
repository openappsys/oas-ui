import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASKbd } from './index.js'

function mountKbd(attrs: Record<string, string> = {}, slot = ''): OASKbd {
  const el = new OASKbd()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (slot) el.textContent = slot
  document.body.appendChild(el)
  return el
}

function kbdEl(el: OASKbd): HTMLElement {
  return el.shadowRoot!.querySelector('[part="kbd"]')!
}

describe('OASKbd', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('keys 空格分隔渲染多块 + 加号连接', () => {
    const el = mountKbd({ keys: 'ctrl shift k' })
    const kbd = kbdEl(el)
    const keys = [...kbd.querySelectorAll('.key')]
    expect(keys.map((k) => k.textContent)).toEqual(['ctrl', 'shift', 'k'])
    expect(kbd.querySelectorAll('.sep').length).toBe(2)
    expect(kbd.querySelector('.sep')!.textContent).toBe('+')
  })

  it('空 keys 渲染单空块', () => {
    const el = mountKbd()
    const keys = [...kbdEl(el).querySelectorAll('.key')]
    expect(keys.length).toBe(1)
    expect(keys[0]!.textContent).toBe('')
  })

  it('slot 内容优先于 keys', () => {
    const el = mountKbd({ keys: 'ctrl' }, '⌘C')
    const kbd = kbdEl(el)
    expect(kbd.querySelector('.keys')!.hasAttribute('hidden')).toBe(true)
    expect(kbd.querySelector('slot')).not.toBeNull()
  })

  it('keys 变化增量更新', () => {
    const el = mountKbd({ keys: 'ctrl shift' })
    el.setAttribute('keys', 'a b c')
    const keys = [...kbdEl(el).querySelectorAll('.key')].map((k) => k.textContent)
    expect(keys).toEqual(['a', 'b', 'c'])
  })

  it('role="text" 且非交互（不派发 oas 事件）', () => {
    const el = mountKbd({ keys: 'ctrl' })
    expect(kbdEl(el).getAttribute('role')).toBe('text')
    let fired = false
    el.addEventListener('oas-click', () => (fired = true))
    kbdEl(el).click()
    expect(fired).toBe(false)
  })
})
