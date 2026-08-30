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

// ===== 子动作级联动画（展开按序浮现，收起同步消失；reduced-motion 归零） =====

function styleText(el: OASSpeedDial): string {
  return el.shadowRoot!.querySelector('style')!.textContent
}

describe('OASSpeedDial 子动作级联动画', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('每个 .action 渲染时内联 --cascade-i 递增（级联步进 index）', () => {
    const el = mount()
    const btns = actionBtns(el)
    expect(btns.length).toBe(3)
    btns.forEach((b, i) => {
      expect(b.style.getPropertyValue('--cascade-i')).toBe(String(i))
    })
  })

  it('actions 变更重渲染后 --cascade-i 按新列表重算', () => {
    const el = mount()
    el.setAttribute('actions', JSON.stringify([{ label: 'a' }, { label: 'b' }]))
    const btns = actionBtns(el)
    expect(btns.length).toBe(2)
    expect(btns[0]!.style.getPropertyValue('--cascade-i')).toBe('0')
    expect(btns[1]!.style.getPropertyValue('--cascade-i')).toBe('1')
  })

  it('CSS：收起态 delay 0（同步消失），展开态 delay = index × 30ms（calc 走 --cascade-i）', () => {
    const stl = styleText(mount())
    // 展开态：.dial.open .action 递增 delay
    expect(stl).toMatch(
      /\.dial\.open \.action\s*\{[^}]*transition-delay:\s*calc\(var\(--cascade-i,\s*0\)\s*\*\s*30ms\)/,
    )
    // 收起态：.action 基础规则 delay 0
    expect(stl).toMatch(/\.action\s*\{[^}]*transition-delay:\s*0ms/)
    // 子动作自身具备 opacity 过渡（级联浮现的载体）
    expect(stl).toMatch(/\.action\s*\{[^}]*transition:\s*opacity\s+var\(--oas-transition-base\)/)
  })

  it('CSS：prefers-reduced-motion 下级联 delay 归零、过渡停用', () => {
    const stl = styleText(mount())
    const mq =
      stl.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}/)?.[0] ?? ''
    expect(mq).toContain('.action')
    expect(mq).toContain('transition-delay: 0ms')
    expect(mq).toContain('transition: none')
  })
})

// ===== hide-label（icon-only 子动作 + hover/focus 悬浮气泡） =====

describe('OASSpeedDial hide-label（icon-only 子动作）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('hide-label 动作：圆形 icon-only 类、aria-label=label 可访问名、label 常驻 DOM（气泡载体）', () => {
    const el = mount({
      actions: JSON.stringify([
        { label: '复制', icon: 'copy', 'hide-label': true },
        { label: '编辑', icon: 'edit' },
      ]),
    })
    const btns = actionBtns(el)
    // icon-only 形态只作用于 hide-label 动作
    expect(btns[0]!.classList.contains('icon-only')).toBe(true)
    expect(btns[1]!.classList.contains('icon-only')).toBe(false)
    // 可访问名 = label 文本（视觉隐藏但读屏可达）
    expect(btns[0]!.getAttribute('aria-label')).toBe('复制')
    expect(btns[1]!.getAttribute('aria-label')).toBeNull()
    // label 常驻 DOM（气泡载体）
    const label = btns[0]!.querySelector<HTMLElement>('.label')
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe('复制')
  })

  it('hide-label 且无可渲染 icon：回落显示 label、console.warn 仅一次', () => {
    const warns: unknown[] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => warns.push(a)
    try {
      const el = mount({
        actions: JSON.stringify([{ label: '仅文字', 'hide-label': true }]),
      })
      const btn = actionBtns(el)[0]!
      // 渲染降级：不套 icon-only 形态，label 正常显示
      expect(btn.classList.contains('icon-only')).toBe(false)
      expect(btn.textContent).toBe('仅文字')
      expect(btn.getAttribute('aria-label')).toBeNull()
      expect(warns.length).toBe(1)
      // 同组件重复渲染不再告警（告警一次）
      el.setAttribute('actions', JSON.stringify([{ label: '仅文字', 'hide-label': true }]))
      expect(warns.length).toBe(1)
    } finally {
      console.warn = orig
    }
  })

  it('CSS：气泡默认视觉隐藏（absolute + opacity 0 + visibility hidden），hover/focus-visible 浮现（仅展开态）', () => {
    const stl = styleText(mount())
    // 默认态：绝对定位（不占布局）+ 完全不可见
    expect(stl).toMatch(/\.action\.icon-only \.label\s*\{[^}]*position:\s*absolute/)
    expect(stl).toMatch(/\.action\.icon-only \.label\s*\{[^}]*opacity:\s*0/)
    expect(stl).toMatch(/\.action\.icon-only \.label\s*\{[^}]*visibility:\s*hidden/)
    // 浮现触发：hover（指针）与 focus-visible（键盘/触屏）都走纯 CSS 切换
    expect(stl).toMatch(/\.dial\.open \.action\.icon-only:hover \.label/)
    expect(stl).toMatch(/\.dial\.open \.action\.icon-only:focus-visible \.label/)
  })

  it('CSS：icon-only 为圆形小钮（宽高 = control-height-md、圆角 50%）', () => {
    const stl = styleText(mount())
    expect(stl).toMatch(/\.action\.icon-only\s*\{[^}]*width:\s*var\(--oas-control-height-md\)/)
    expect(stl).toMatch(/\.action\.icon-only\s*\{[^}]*border-radius:\s*50%/)
  })

  it('CSS：气泡方向随 data-dir 自适应（up 左 / down 右 / left·right 上），定位在动作外侧', () => {
    const stl = styleText(mount())
    expect(stl).toMatch(
      /\.dial\[data-dir='up'\] \.action\.icon-only \.label\s*\{[^}]*right:\s*calc\(100%\s*\+\s*var\(--oas-space-2\)\)/,
    )
    expect(stl).toMatch(
      /\.dial\[data-dir='down'\] \.action\.icon-only \.label\s*\{[^}]*left:\s*calc\(100%\s*\+\s*var\(--oas-space-2\)\)/,
    )
    expect(stl).toMatch(
      /\.dial\[data-dir='left'\] \.action\.icon-only \.label\s*\{[^}]*bottom:\s*calc\(100%\s*\+\s*var\(--oas-space-2\)\)/,
    )
    expect(stl).toMatch(
      /\.dial\[data-dir='right'\] \.action\.icon-only \.label\s*\{[^}]*bottom:\s*calc\(100%\s*\+\s*var\(--oas-space-2\)\)/,
    )
  })

  it('级联共存：hide-label 动作同样内联 --cascade-i 步进', () => {
    const el = mount({
      actions: JSON.stringify([
        { label: '复制', icon: 'copy', 'hide-label': true },
        { label: '编辑', icon: 'edit' },
        { label: '删除', icon: 'trash', 'hide-label': true },
      ]),
    })
    const btns = actionBtns(el)
    expect(btns[0]!.style.getPropertyValue('--cascade-i')).toBe('0')
    expect(btns[2]!.style.getPropertyValue('--cascade-i')).toBe('2')
  })

  it('oas-select detail 不变：icon-only 动作仍派发 { index, label }', () => {
    const el = mount({
      open: '',
      actions: JSON.stringify([{ label: '复制', icon: 'copy', 'hide-label': true }]),
    })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    actionBtns(el)[0]!.click()
    expect(detail).toEqual({ index: 0, label: '复制' })
  })

  it('reduced-motion：气泡过渡一并停用（立即出现）', () => {
    const stl = styleText(mount())
    // 媒体查询内 `.action.icon-only .label` 规则过渡停用（不依赖外层捕获的括号配平）
    expect(stl).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.action\.icon-only \.label\s*\{\s*transition:\s*none/,
    )
  })
})
