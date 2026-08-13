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

  // —— fullscreen 全屏（优先级：fullscreen > width/centered/draggable）——
  it('fullscreen：dialog 标记 data-fullscreen 并清除内联宽度（width 被忽略）', async () => {
    const el = mount({ visible: '', fullscreen: '', width: '640px' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    expect(dialog.getAttribute('data-fullscreen')).not.toBeNull()
    expect(dialog.style.width).toBe('')
    el.removeAttribute('fullscreen')
    expect(dialog.getAttribute('data-fullscreen')).toBeNull()
    expect(dialog.style.width).toBe('640px')
  })

  it('fullscreen + centered：标记共存，布局优先级由 CSS（fullscreen 后置规则）接管', async () => {
    const el = mount({ visible: '', fullscreen: '', centered: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('.dialog')!
    expect(dialog.getAttribute('data-fullscreen')).not.toBeNull()
    expect(dialog.getAttribute('data-centered')).not.toBeNull()
  })

  it('fullscreen + draggable：拖拽被禁用（优先级 fullscreen 胜出）', async () => {
    const el = mount({ visible: '', fullscreen: '', draggable: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    el.shadowRoot!.querySelector('.header')!.dispatchEvent(pointer('pointerdown', 0, 0))
    document.dispatchEvent(pointer('pointermove', 100, 50))
    expect(el.hasAttribute('dragging')).toBe(false)
    expect(dialog.style.left).toBe('')
    expect(dialog.style.top).toBe('')
  })

  it('fullscreen 下 Esc / 遮罩关闭照常', async () => {
    const el = mount({ visible: '', fullscreen: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
    el.setAttribute('visible', '')
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('fullscreen 下 ARIA 与焦点行为不变（打开聚焦取消按钮，关闭还原来源焦点）', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const el = mount({ visible: '', fullscreen: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('.dialog')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-hidden')).toBe('false')
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="cancel"]'))
    el.removeAttribute('visible')
    await Promise.resolve()
    expect(dialog.getAttribute('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(outside)
  })

  // —— loading 确定按钮（禁止重复触发）——
  it('loading：确定按钮 disabled + aria-busy + spinner 显示，移除后恢复', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="ok"]')!
    expect(okBtn.disabled).toBe(true)
    expect(okBtn.getAttribute('aria-busy')).toBe('true')
    expect(okBtn.querySelector('.spinner')!.hasAttribute('hidden')).toBe(false)
    el.removeAttribute('loading')
    await Promise.resolve()
    expect(okBtn.disabled).toBe(false)
    expect(okBtn.getAttribute('aria-busy')).toBe('false')
    expect(okBtn.querySelector('.spinner')!.hasAttribute('hidden')).toBe(true)
  })

  it('loading 期间点击确定不派发 oas-ok 也不关闭', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(0)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('loading 移除后可正常确定', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    el.removeAttribute('loading')
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('loading 中 Esc 仍可关闭', async () => {
    const el = mount({ visible: '', loading: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  // —— 焦点陷阱（全屏与普通模式共用）——
  it('焦点陷阱：Tab 从末元素回到首元素，Shift+Tab 反向循环', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const root = el.shadowRoot!
    const close = root.querySelector<HTMLElement>('[part="close"]')!
    const cancel = root.querySelector<HTMLElement>('[part="cancel"]')!
    const ok = root.querySelector<HTMLElement>('[part="ok"]')!
    ok.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(root.activeElement).toBe(close)
    close.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(root.activeElement).toBe(ok)
    // 中间元素 Tab 不触发 preventDefault（happy-dom 不实现原生 Tab 移动，故不断言位置）
  })

  it('焦点陷阱：焦点逃逸到对话框外时 Tab 拉回对话框内', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="close"]'))
  })

  it('焦点陷阱：焦点在 slot 内嵌套输入框时不拉回（Tab 不打断嵌套控件导航）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    // 模拟表单 modal：slot 内放一个嵌套 input，焦点落在其内层
    const input = document.createElement('input')
    el.appendChild(input)
    input.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    // happy-dom 无原生 Tab 移动，断言焦点未被拉回对话框按钮（仍在输入框）
    expect(document.activeElement).toBe(input)
  })

  it('焦点陷阱：多实例并存时仅最上层 modal 接管', async () => {
    const first = mount({ visible: '' })
    await Promise.resolve()
    const second = mount({ visible: '' })
    await Promise.resolve()
    const firstRoot = first.shadowRoot!
    const secondRoot = second.shadowRoot!
    secondRoot.querySelector<HTMLElement>('[part="ok"]')!.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    // 只有 second 接管陷阱 → Tab 从 ok 回到 second 的首个可聚焦元素
    expect(secondRoot.activeElement).toBe(secondRoot.querySelector('[part="close"]'))
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
