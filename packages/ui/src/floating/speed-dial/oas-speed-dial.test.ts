import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
    expect(detail).toEqual({ open: true })
    expect(fab(el).getAttribute('aria-expanded')).toBe('true')
    expect(dial(el).classList.contains('open')).toBe(true)
  })

  it('再次点击收起并派发 oas-open false', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-open', (e: Event) => (detail = (e as CustomEvent).detail))
    fab(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(detail).toEqual({ open: false })
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
    expect(open).toEqual({ open: false })
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
