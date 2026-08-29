import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSpeedDial } from './index.js'

const ACTIONS = JSON.stringify([
  { label: '复制', icon: 'copy' },
  { label: '编辑', icon: 'edit' },
  { label: '删除', icon: 'trash' },
])

function mount(attrs: Record<string, string> = {}): OASSpeedDial {
  const el = new OASSpeedDial()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.actions) el.setAttribute('actions', ACTIONS)
  document.body.appendChild(el)
  return el
}

function fab(el: OASSpeedDial): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="fab"]')!
}

function dial(el: OASSpeedDial): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.dial')!
}

function actionsEl(el: OASSpeedDial): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="actions"]')!
}

function actionBtns(el: OASSpeedDial): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="action"]')] as HTMLButtonElement[]
}

describe('OASSpeedDial', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染主按钮与子动作，aria-expanded 默认 false', () => {
    const el = mount()
    expect(fab(el)).not.toBeNull()
    expect(actionBtns(el).length).toBe(3)
    expect(actionBtns(el)[0]!.textContent).toContain('复制')
    expect(fab(el).getAttribute('aria-expanded')).toBe('false')
    expect(dial(el).classList.contains('open')).toBe(false)
  })

  it('点击主按钮展开并派发 oas-open', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-open', (e: Event) => (detail = (e as CustomEvent).detail))
    fab(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    expect(detail).toEqual({ open: true, reason: 'toggle' })
    expect(fab(el).getAttribute('aria-expanded')).toBe('true')
    expect(dial(el).classList.contains('open')).toBe(true)
  })

  it('再次点击收起并派发 oas-open false', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-open', (e: Event) => (detail = (e as CustomEvent).detail))
    fab(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(detail).toEqual({ open: false, reason: 'toggle' })
    expect(fab(el).getAttribute('aria-expanded')).toBe('false')
    expect(dial(el).classList.contains('open')).toBe(false)
  })

  it('选择子动作派发 oas-select 并自动收起', () => {
    const el = mount({ open: '' })
    let select: unknown
    let open: unknown
    el.addEventListener('oas-select', (e: Event) => (select = (e as CustomEvent).detail))
    el.addEventListener('oas-open', (e: Event) => (open = (e as CustomEvent).detail))
    actionBtns(el)[0]!.click()
    expect(select).toEqual({ index: 0, label: '复制' })
    expect(open).toEqual({ open: false, reason: 'select' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('点击外部收起（composedPath 不包含宿主）', () => {
    const el = mount({ open: '' })
    const outside = document.createElement('button')
    outside.textContent = '外部'
    document.body.appendChild(outside)
    outside.click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('点击组件内部不收起', () => {
    const el = mount({ open: '' })
    const vp = el.shadowRoot!.querySelector<HTMLElement>('.dial')!
    vp.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('Esc 收起并聚焦主按钮', () => {
    const el = mount({ open: '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(fab(el))
  })

  it('direction 属性驱动布局方向，非法值回退 up', () => {
    const el = mount({ direction: 'left' })
    expect(dial(el).getAttribute('data-dir')).toBe('left')
    el.setAttribute('direction', 'down')
    expect(dial(el).getAttribute('data-dir')).toBe('down')
    el.setAttribute('direction', 'bogus')
    expect(dial(el).getAttribute('data-dir')).toBe('up')
  })

  it('open 受控：外部设置/移除属性即展开/收起', () => {
    const el = mount()
    el.setAttribute('open', '')
    expect(dial(el).classList.contains('open')).toBe(true)
    expect(fab(el).getAttribute('aria-expanded')).toBe('true')
    el.removeAttribute('open')
    expect(dial(el).classList.contains('open')).toBe(false)
    expect(fab(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('断开连接后重新连接仍可用且无孤儿监听', () => {
    const el = mount({ open: '' })
    el.remove()
    document.body.appendChild(el)
    expect(dial(el).classList.contains('open')).toBe(true)
    fab(el).click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('action 无 icon 时只渲染 label', () => {
    const el = mount({
      actions: JSON.stringify([{ label: '仅文字' }]),
    })
    expect(actionBtns(el)[0]!.textContent).toBe('仅文字')
    expect(actionBtns(el)[0]!.querySelector('svg')).toBeNull()
  })
})

// —— 能力补齐批次：trigger / 自定义主钮图标 / reason / menu 语义 + 方向键 ——

function keydown(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('OASSpeedDial 能力补齐批次', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('trigger 列入 observedAttributes', () => {
    expect(OASSpeedDial.observedAttributes).toContain('trigger')
  })

  it('trigger 默认 click：mouseenter 不展开', () => {
    const el = mount()
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('trigger="hover"：mouseenter 展开、mouseleave 120ms 宽限后收起', () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'hover' })
    const opens: unknown[] = []
    el.addEventListener('oas-open', (e: Event) => opens.push((e as CustomEvent).detail))
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('open')).toBe(true)
    expect(opens[0]).toEqual({ open: true, reason: 'hover' })
    el.dispatchEvent(new MouseEvent('mouseleave'))
    // 宽限期内不收起
    expect(el.hasAttribute('open')).toBe(true)
    vi.advanceTimersByTime(119)
    expect(el.hasAttribute('open')).toBe(true)
    vi.advanceTimersByTime(2)
    expect(el.hasAttribute('open')).toBe(false)
    expect(opens[1]).toEqual({ open: false, reason: 'hover' })
    vi.useRealTimers()
  })

  it('trigger="hover"：宽限期内移入面板不收起（悬停区域 = 宿主 + 面板）', () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'hover' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    // 从宿主移入 actions 面板：relatedTarget 在 shadow 内 → 不触发收起
    el.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: actionsEl(el) }))
    vi.advanceTimersByTime(300)
    expect(el.hasAttribute('open')).toBe(true)
    vi.useRealTimers()
  })

  it('trigger="hover" 且触屏（pointer: coarse）：回落 click 行为', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true }) as MediaQueryList)
    const el = mount({ trigger: 'hover' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('open')).toBe(false) // hover 不展开
    fab(el).click() // click 仍可 toggle
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('trigger="hover"：hover 展开后点击主钮仍可 toggle 收起', () => {
    const el = mount({ trigger: 'hover' })
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('open')).toBe(true)
    fab(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    fab(el).click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('主钮默认插槽：有插槽内容时替代默认图标，展开旋转类保持', () => {
    const el = mount()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    el.appendChild(svg)
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('.fab slot')
    expect(slot).not.toBeNull()
    expect(slot!.assignedNodes().length).toBe(1)
    expect(slot!.assignedNodes()[0]).toBe(svg)
    // 展开时 .dial.open 仍驱动 45° 旋转（旋转类在，视觉由 CSS 决定）
    el.setAttribute('open', '')
    expect(dial(el).classList.contains('open')).toBe(true)
  })

  it('无插槽内容时主钮回退默认 ＋ 图标', () => {
    const el = mount()
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('.fab slot')
    expect(slot!.assignedNodes().length).toBe(0)
  })

  it('actions 容器 role="menu"，子动作 role="menuitem"', () => {
    const el = mount()
    expect(actionsEl(el).getAttribute('role')).toBe('menu')
    for (const b of actionBtns(el)) {
      expect(b.getAttribute('role')).toBe('menuitem')
    }
  })

  it('oas-open reason：outside / escape 带来源标记', () => {
    const el = mount({ open: '' })
    const events: unknown[] = []
    el.addEventListener('oas-open', (e: Event) => events.push((e as CustomEvent).detail))
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.click()
    expect(events[0]).toEqual({ open: false, reason: 'outside' })
    el.setAttribute('open', '')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(events[1]).toEqual({ open: false, reason: 'escape' })
  })

  it('纵向展开（up）：展开自动聚焦首项，ArrowDown/ArrowUp 循环导航', () => {
    const el = mount({ open: '' })
    const btns = actionBtns(el)
    expect(el.shadowRoot!.activeElement).toBe(btns[0]) // 展开自动聚焦首项
    keydown(actionsEl(el), 'ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(btns[1])
    keydown(actionsEl(el), 'ArrowDown')
    keydown(actionsEl(el), 'ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(btns[0]) // 循环回首
    keydown(actionsEl(el), 'ArrowUp')
    expect(el.shadowRoot!.activeElement).toBe(btns[2]) // 循环到尾
  })

  it('纵向展开（down）：同样 ArrowUp/ArrowDown 导航', () => {
    const el = mount({ direction: 'down', open: '' })
    const btns = actionBtns(el)
    keydown(actionsEl(el), 'ArrowDown')
    expect(el.shadowRoot!.activeElement).toBe(btns[1])
    keydown(actionsEl(el), 'ArrowUp')
    expect(el.shadowRoot!.activeElement).toBe(btns[0])
  })

  it('横向展开（right）：ArrowLeft/ArrowRight 导航', () => {
    const el = mount({ direction: 'right', open: '' })
    const btns = actionBtns(el)
    keydown(actionsEl(el), 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(btns[1])
    keydown(actionsEl(el), 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(btns[0])
  })

  it('横向展开（left）：ArrowRight/ArrowLeft 导航', () => {
    const el = mount({ direction: 'left', open: '' })
    const btns = actionBtns(el)
    keydown(actionsEl(el), 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(btns[1])
    keydown(actionsEl(el), 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(btns[0])
  })

  it('Home/End 跳首尾项', () => {
    const el = mount({ open: '' })
    const btns = actionBtns(el)
    keydown(actionsEl(el), 'End')
    expect(el.shadowRoot!.activeElement).toBe(btns[2])
    keydown(actionsEl(el), 'Home')
    expect(el.shadowRoot!.activeElement).toBe(btns[0])
  })

  it('方向键不收起展开态（仅移动焦点）', () => {
    const el = mount({ open: '' })
    keydown(actionsEl(el), 'ArrowDown')
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('hover 触发展开不抢焦点（焦点留在主钮）', () => {
    const el = mount({ trigger: 'hover' })
    fab(el).focus()
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(fab(el))
  })
})
