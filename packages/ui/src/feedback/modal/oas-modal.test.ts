import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASModal } from './index.js'

function mount(attrs: Record<string, string> = {}): OASModal {
  const el = new OASModal()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<p>内容</p>`
  document.body.appendChild(el)
  return el
}

describe('OASModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('visible 为 true 时渲染对话框，含 role=dialog + aria-modal + slot', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('内容')
  })

  it('visible 缺省时隐藏', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[role="dialog"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('点击确定派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
  })

  it('点击遮罩触发 oas-cancel（maskClosable）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(cancel).toBe(1)
  })

  it('Esc 关闭触发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancel).toBe(1)
  })

  it('无 footer 时不渲染按钮', async () => {
    const el = mount({ visible: '', 'no-footer': '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="ok"]')).toBeNull()
  })

  it('点击 ✕ 移除 visible 并派发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
  })

  it('Esc 移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击遮罩移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击确定移除 visible 并派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(ok).toBe(1)
  })

  it('width 属性控制对话框宽度（px 与百分比，动态切换）', async () => {
    const el = mount({ visible: '', width: '640px' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    expect(dialog.style.width).toBe('640px')
    el.setAttribute('width', '60%')
    expect(dialog.style.width).toBe('60%')
  })

  it('未设置 width 时回退主题默认（无内联宽度），移除属性后恢复', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    expect(dialog.style.width).toBe('')
    el.setAttribute('width', '520px')
    expect(dialog.style.width).toBe('520px')
    el.removeAttribute('width')
    expect(dialog.style.width).toBe('')
  })

  it('centered 属性驱动 data-centered 标记（增删同步）', async () => {
    const el = mount({ visible: '', centered: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('.dialog')!
    expect(dialog.getAttribute('data-centered')).not.toBeNull()
    el.removeAttribute('centered')
    expect(dialog.getAttribute('data-centered')).toBeNull()
  })

  it('无 centered 时不带 data-centered 标记', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('.dialog')!.getAttribute('data-centered')).toBeNull()
  })

  it('draggable 时拖动标题栏改变对话框位置（内联 left/top），松手后停止跟随', async () => {
    const el = mount({ visible: '', draggable: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    expect(el.hasAttribute('dragging')).toBe(true)
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(dialog.style.left).toBe('100px')
    expect(dialog.style.top).toBe('50px')
    expect(dialog.style.transform).toBe('none')
    document.dispatchEvent(pointer('pointerup', 100, 50))
    expect(el.hasAttribute('dragging')).toBe(false)
    document.dispatchEvent(pointer('pointermove', 200, 100))
    expect(dialog.style.left).toBe('100px')
  })

  it('未开启 draggable 时标题栏拖动无效', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
    expect(el.hasAttribute('dragging')).toBe(false)
  })

  it('拖动中 Esc 仍可关闭；关闭后重置拖拽位置', async () => {
    const el = mount({ visible: '', draggable: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(dialog.style.left).toBe('100px')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
    expect(dialog.style.transform).toBe('')
  })
})

function pointer(type: string, clientX: number, clientY = 0): Event {
  const Ctor = (globalThis as Record<string, unknown>).PointerEvent as
    | typeof PointerEvent
    | undefined
  if (typeof Ctor === 'function') {
    return new Ctor(type, { bubbles: true, clientX, clientY })
  }
  return new MouseEvent(type, { bubbles: true, clientX, clientY })
}
