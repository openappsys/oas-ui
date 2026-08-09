import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSnackbar } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSnackbar {
  const el = new OASSnackbar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASSnackbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('open 渲染消息并派发 oas-open，无 action 时 role=status', () => {
    const el = new OASSnackbar()
    let opened = 0
    el.addEventListener('oas-open', () => opened++)
    el.setAttribute('open', '')
    el.setAttribute('message', '网络已断开')
    document.body.appendChild(el)
    expect(opened).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="message"]')!.textContent).toBe('网络已断开')
    expect(el.shadowRoot!.querySelector('[role="status"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="action"]')!.hidden).toBe(true)
  })

  it('有 action-text 时 role=alertdialog + aria-live=assertive，点击派发 oas-action', () => {
    const el = mount({ open: '', message: '删除成功', 'action-text': '撤销' })
    let action = 0
    el.addEventListener('oas-action', () => action++)
    const box = el.shadowRoot!.querySelector('[part="box"]')!
    expect(box.getAttribute('role')).toBe('alertdialog')
    expect(box.getAttribute('aria-live')).toBe('assertive')
    const actionBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="action"]')
    expect(actionBtn!.hidden).toBe(false)
    expect(actionBtn!.textContent).toBe('撤销')
    expect(actionBtn!.type).toBe('button')
    actionBtn!.click()
    expect(action).toBe(1)
  })

  it('duration 到期派发 oas-close 且不自行移除 open（受控），计时器清理', () => {
    const el = mount({ open: '', message: '提示', duration: '4000' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(4000)
    expect(closes).toBe(1)
    expect(el.hasAttribute('open')).toBe(true)
    // 计时器已清理，继续推进不再触发
    vi.advanceTimersByTime(4000)
    expect(closes).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('open 移除（外部关闭）时清理计时器，不再派发 oas-close', () => {
    const el = mount({ open: '', message: '提示' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    el.removeAttribute('open')
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(4000)
    expect(closes).toBe(0)
  })

  it('duration=0 不自动关闭', () => {
    const el = mount({ open: '', message: '常驻', duration: '0' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    vi.advanceTimersByTime(60000)
    expect(closes).toBe(0)
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('堆叠上限 3：第 4 条打开时最老的一条收到 oas-close', () => {
    const els: OASSnackbar[] = []
    const closed: OASSnackbar[] = []
    for (let i = 0; i < 4; i++) {
      const el = mount({ open: '', message: `消息${i}` })
      el.addEventListener('oas-close', () => closed.push(el))
      els.push(el)
    }
    expect(closed).toEqual([els[0]])
  })

  it('direction 默认 bottom，offset 写 CSS 变量', () => {
    const el = mount({ open: '', message: '提示', offset: '48' })
    expect(el.shadowRoot!.querySelector('style')!.textContent).toContain(
      ":host([direction='bottom']) .box",
    )
    expect(el.style.getPropertyValue('--snackbar-offset')).toBe('48px')
  })

  it('断开连接时清理计时器（无泄漏）', () => {
    const el = mount({ open: '', message: '提示' })
    expect(vi.getTimerCount()).toBe(1)
    el.remove()
    expect(vi.getTimerCount()).toBe(0)
  })
})
