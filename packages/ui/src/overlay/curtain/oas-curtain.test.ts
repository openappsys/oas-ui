import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASCurtain } from './index.js'

function mount(attrs: Record<string, string> = {}, content = '幕帘内容'): OASCurtain {
  const el = new OASCurtain()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.textContent = content
  document.body.appendChild(el)
  return el
}

function closeButton(el: OASCurtain): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.close-btn')!
}

describe('OASCurtain 首次弹出与本地记忆', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })

  it('未关闭过时进入自动展开', () => {
    const el = mount()
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.textContent).toBe('幕帘内容')
  })

  it('关闭后写入本地记忆，再次进入不再弹出', () => {
    const first = mount({ 'storage-key': 'curtain-a' })
    expect(first.hasAttribute('open')).toBe(true)
    closeButton(first).click()
    expect(first.hasAttribute('open')).toBe(false)
    expect(window.localStorage.getItem('curtain-a')).toBe('1')

    first.remove()
    const second = mount({ 'storage-key': 'curtain-a' })
    expect(second.hasAttribute('open')).toBe(false)
  })

  it('persist="false" 不写记忆，每次进入都弹出', () => {
    const first = mount({ 'storage-key': 'curtain-b', persist: 'false' })
    closeButton(first).click()
    expect(window.localStorage.getItem('curtain-b')).toBeNull()
    first.remove()
    const second = mount({ 'storage-key': 'curtain-b', persist: 'false' })
    expect(second.hasAttribute('open')).toBe(true)
  })

  it('reset() 清除记忆，下次进入重新弹出', () => {
    const first = mount({ 'storage-key': 'curtain-c' })
    closeButton(first).click()
    expect(window.localStorage.getItem('curtain-c')).toBe('1')
    first.reset()
    expect(window.localStorage.getItem('curtain-c')).toBeNull()
    first.remove()
    const second = mount({ 'storage-key': 'curtain-c' })
    expect(second.hasAttribute('open')).toBe(true)
  })

  it('已关闭记忆存在时实例保持收起（不闪出再关）', () => {
    window.localStorage.setItem('curtain-d', '1')
    const el = mount({ 'storage-key': 'curtain-d' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('auto="false" 关闭自动弹出（文档/嵌入式场景手动控制）', () => {
    const el = mount({ auto: 'false' })
    expect(el.hasAttribute('open')).toBe(false)
    el.show()
    expect(el.hasAttribute('open')).toBe(true)
  })
})

describe('OASCurtain 受控与关闭来源', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })

  it('open 属性直接控制显隐（受控优先于自动判定）', () => {
    const el = mount({ open: '' })
    expect(el.hasAttribute('open')).toBe(true)
    el.removeAttribute('open')
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('show() 强制展开（不清理记忆）', () => {
    window.localStorage.setItem('curtain-e', '1')
    const el = mount({ 'storage-key': 'curtain-e' })
    expect(el.hasAttribute('open')).toBe(false)
    el.show()
    expect(el.hasAttribute('open')).toBe(true)
    expect(window.localStorage.getItem('curtain-e')).toBe('1')
  })

  it('close() 关闭并派发 oas-close（reason=api）', () => {
    const el = mount()
    const handler = vi.fn()
    el.addEventListener('oas-close', handler)
    el.close()
    expect(el.hasAttribute('open')).toBe(false)
    expect(handler.mock.calls[0]![0].detail).toEqual({ reason: 'api' })
  })

  it('Esc 关闭（reason=esc）并写记忆', () => {
    const el = mount({ 'storage-key': 'curtain-f' })
    const handler = vi.fn()
    el.addEventListener('oas-close', handler)
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    expect(handler.mock.calls[0]![0].detail).toEqual({ reason: 'esc' })
    expect(window.localStorage.getItem('curtain-f')).toBe('1')
  })

  it('mask-closable 时点内容区外关闭；未开启时点遮罩不关闭', () => {
    const el = mount({ 'storage-key': 'curtain-g' })
    const close = vi.fn()
    el.addEventListener('oas-close', close)
    el.shadowRoot!.querySelector<HTMLElement>('.curtain')!.click()
    expect(close).not.toHaveBeenCalled()

    el.setAttribute('mask-closable', '')
    el.setAttribute('open', '')
    el.shadowRoot!.querySelector<HTMLElement>('.panel')!.click()
    expect(close).not.toHaveBeenCalled()
    el.shadowRoot!.querySelector<HTMLElement>('.curtain')!.click()
    expect(close.mock.calls[0]![0].detail).toEqual({ reason: 'backdrop' })
  })

  it('关闭按钮 reason=button', () => {
    const el = mount()
    const handler = vi.fn()
    el.addEventListener('oas-close', handler)
    closeButton(el).click()
    expect(handler.mock.calls[0]![0].detail).toEqual({ reason: 'button' })
  })
})

describe('OASCurtain 无障碍与内容', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
  })

  it('对话框 role / aria-modal / 标题可读名称', () => {
    const el = mount({ heading: '欢迎回来' })
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(panel.getAttribute('aria-label')).toBe('欢迎回来')
    expect(el.shadowRoot!.querySelector('.heading')!.textContent).toBe('欢迎回来')
  })

  it('无标题时回落 i18n 兜底名称，标题元素隐藏', () => {
    const el = mount()
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    expect(panel.getAttribute('aria-label')).toBe('提示')
    expect((el.shadowRoot!.querySelector('.heading') as HTMLElement).hidden).toBe(true)
  })

  it('关闭按钮 aria-label 走 i18n', () => {
    const el = mount()
    expect(closeButton(el).getAttribute('aria-label')).toBe('关闭')
  })

  it('打开时焦点落在关闭按钮（键盘可退出）', () => {
    const el = mount()
    const btn = closeButton(el)
    const root = el.shadowRoot!
    expect(root.activeElement === btn || document.activeElement === btn).toBe(true)
  })
})
