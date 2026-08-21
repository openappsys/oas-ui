import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

function anchor(el: OASContextMenu): HTMLElement {
  return el.shadowRoot!.querySelector('.menu-anchor')!
}

/** 构造带 touches 的 touch 事件（happy-dom 不完整支持 Touch，挂数组兜底） */
function touchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
): TouchEvent {
  const e = new Event(type, { bubbles: true }) as unknown as TouchEvent
  Object.defineProperty(e, 'touches', { value: touches })
  return e
}

describe('OASContextMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('contextmenu 事件打开菜单并定位到鼠标位置', async () => {
    const el = mount()
    const target = el.querySelector('div')!
    target.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 80 }),
    )
    await Promise.resolve()
    expect(anchor(el).hasAttribute('hidden')).toBe(false)
    expect(anchor(el).getAttribute('style')).toContain('120px')
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
    expect(anchor(el).hasAttribute('hidden')).toBe(true)
  })

  it('Esc 关闭菜单', async () => {
    const el = mount()
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(anchor(el).hasAttribute('hidden')).toBe(true)
  })

  describe('长按触发（移动端）', () => {
    it('长按默认 500ms 打开菜单并定位到触点', async () => {
      vi.useFakeTimers()
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
      vi.advanceTimersByTime(499)
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(1)
      await Promise.resolve()
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      expect(anchor(el).getAttribute('style')).toContain('100px')
      expect(anchor(el).getAttribute('style')).toContain('90px')
    })

    it('long-press-delay 属性自定义长按时长', async () => {
      vi.useFakeTimers()
      const el = mount()
      el.setAttribute('long-press-delay', '200')
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 50, clientY: 40 }]))
      vi.advanceTimersByTime(200)
      await Promise.resolve()
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })

    it('长按前大幅滑动视为滚动手势，不触发', async () => {
      vi.useFakeTimers()
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
      target.dispatchEvent(touchEvent('touchmove', [{ clientX: 150, clientY: 95 }]))
      vi.advanceTimersByTime(600)
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })

    it('计时结束前抬手不触发', async () => {
      vi.useFakeTimers()
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
      target.dispatchEvent(touchEvent('touchend', []))
      vi.advanceTimersByTime(600)
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })
  })

  describe('编程式定位', () => {
    it('show(x, y) 任意坐标打开菜单', () => {
      const el = mount()
      el.show(200, 150)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      expect(anchor(el).getAttribute('style')).toContain('200px')
      expect(anchor(el).getAttribute('style')).toContain('150px')
    })

    it('已打开时 show(x, y) 重定位不闪关', () => {
      const el = mount()
      el.show(100, 100)
      let opened = 0
      let closed = 0
      el.addEventListener('oas-open-change', (e: Event) => {
        if ((e as CustomEvent).detail.open) opened++
        else closed++
      })
      el.show(300, 250)
      expect(anchor(el).getAttribute('style')).toContain('300px')
      expect(anchor(el).getAttribute('style')).toContain('250px')
      expect(opened).toBe(0)
      expect(closed).toBe(0)
    })

    it('close() 编程式关闭', () => {
      const el = mount()
      el.show(100, 100)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      el.close()
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })
  })

  describe('受控 open + oas-open-change', () => {
    it('open 属性受控开关菜单', () => {
      const el = mount()
      el.setAttribute('open', '')
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      el.removeAttribute('open')
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
      el.setAttribute('open', '')
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })

    it('open 变化派发 oas-open-change（detail.open 布尔）', () => {
      const el = mount()
      const changes: boolean[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.setAttribute('open', '')
      expect(changes).toEqual([true])
      el.removeAttribute('open')
      expect(changes).toEqual([true, false])
    })

    it('初始 open 不派发 oas-open-change（仅变化时）', () => {
      const el = new OASContextMenu()
      el.setAttribute('open', '')
      el.setAttribute('items', ITEMS)
      document.body.appendChild(el)
      let called = 0
      el.addEventListener('oas-open-change', () => called++)
      el.removeAttribute('open')
      expect(called).toBe(1)
      el.setAttribute('open', '')
      expect(called).toBe(2)
    })

    it('右键触发也派发 oas-open-change', async () => {
      const el = mount()
      const changes: boolean[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.querySelector('div')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 50, clientY: 60 }),
      )
      await Promise.resolve()
      expect(changes).toEqual([true])
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(changes).toEqual([true, false])
    })

    it('show(x, y) 触发也派发 oas-open-change', () => {
      const el = mount()
      const changes: boolean[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.show(100, 100)
      expect(changes).toEqual([true])
      el.close()
      expect(changes).toEqual([true, false])
    })
  })

  describe('右键别处关闭/重定位', () => {
    it('页面别处右键关闭已打开的菜单（避免多菜单并存）', () => {
      const el = mount()
      el.show(100, 100)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      document.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 500, clientY: 400 }),
      )
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })

    it('组件自身区域内右键不关闭且重定位', () => {
      const el = mount()
      el.show(100, 100)
      el.querySelector('div')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 180 }),
      )
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      expect(anchor(el).getAttribute('style')).toContain('200px')
    })

    it('外部点击关闭后再次右键可重新打开', async () => {
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
      await Promise.resolve()
      document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 999, clientY: 999 }))
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
      target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 80, clientY: 70 }))
      await Promise.resolve()
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })
  })

  describe('滚动关闭', () => {
    it('默认滚动页面关闭菜单（fixed 定位与滚动脱节修复）', () => {
      const el = mount()
      el.show(100, 100)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      window.dispatchEvent(new Event('scroll'))
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })

    it('close-on-scroll="false" 时滚动不关闭', () => {
      const el = mount()
      el.setAttribute('close-on-scroll', 'false')
      el.show(100, 100)
      window.dispatchEvent(new Event('scroll'))
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })

    it('滚动关闭后菜单不再持有滚动监听（再次打开滚动仍关闭）', () => {
      const el = mount()
      el.show(100, 100)
      window.dispatchEvent(new Event('scroll'))
      el.show(100, 100)
      window.dispatchEvent(new Event('scroll'))
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })
  })
})
