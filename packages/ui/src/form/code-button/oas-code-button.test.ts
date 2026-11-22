import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASCodeButton } from './index.js'

function mount(attrs: Record<string, string> = {}, content = ''): OASCodeButton {
  const el = new OASCodeButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.innerHTML = content
  document.body.appendChild(el)
  return el
}

function button(el: OASCodeButton): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!
}

function labelText(el: OASCodeButton): string {
  return el.shadowRoot!.querySelector<HTMLElement>('.fallback')!.textContent ?? ''
}

function announcer(el: OASCodeButton): string {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="announcer"]')!.textContent ?? ''
}

function click(el: OASCodeButton): void {
  button(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

describe('OASCodeButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('默认渲染发送文案按钮，未倒计时时可点击', () => {
    const el = mount()
    expect(button(el).type).toBe('button')
    expect(labelText(el)).toBe('获取验证码')
    expect(button(el).disabled).toBe(false)
    expect(el.counting).toBe(false)
  })

  it('点击派发 oas-send 并立即进入倒计时（冷却期禁用）', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '5' })
    const events: unknown[] = []
    el.addEventListener('oas-send', (e) => events.push((e as CustomEvent).detail))
    click(el)
    expect(events).toEqual([{ cooldown: 5 }])
    expect(el.counting).toBe(true)
    expect(el.remaining).toBe(5)
    expect(button(el).disabled).toBe(true)
    expect(labelText(el)).toBe('5 秒后重发')
    expect(announcer(el)).toBe('验证码已发送')
  })

  it('冷却逐秒递减，结束后恢复为重新获取并播报', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '3' })
    click(el)
    vi.advanceTimersByTime(1000)
    expect(el.remaining).toBe(2)
    expect(labelText(el)).toBe('2 秒后重发')
    vi.advanceTimersByTime(2000)
    expect(el.counting).toBe(false)
    expect(button(el).disabled).toBe(false)
    expect(labelText(el)).toBe('重新获取')
    expect(announcer(el)).toBe('可以重新获取验证码')
  })

  it('冷却期内再点击不重复派发', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '5' })
    let fired = 0
    el.addEventListener('oas-send', () => fired++)
    click(el)
    click(el)
    expect(fired).toBe(1)
  })

  it('oas-send 可被 preventDefault 拦截：宿主可在请求成功后再启动冷却', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '5' })
    el.addEventListener('oas-send', (e) => e.preventDefault())
    click(el)
    expect(el.counting).toBe(false)
    el.start()
    expect(el.counting).toBe(true)
  })

  it('cooldown 非法值回落 60 秒', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    const el = mount({ cooldown: 'abc' })
    click(el)
    expect(el.remaining).toBe(60)
    expect(warn).toHaveBeenCalled()
  })

  it('reset() 立即结束冷却', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '5' })
    click(el)
    el.reset()
    expect(el.counting).toBe(false)
    expect(labelText(el)).toBe('获取验证码')
  })

  it('disabled 属性拦截点击与事件', () => {
    const el = mount({ disabled: '' })
    let fired = 0
    el.addEventListener('oas-send', () => fired++)
    expect(button(el).disabled).toBe(true)
    click(el)
    expect(fired).toBe(0)
  })

  it('loading 显示 spinner、aria-busy 并阻止重复点击', () => {
    const el = mount({ loading: '' })
    let fired = 0
    el.addEventListener('oas-send', () => fired++)
    click(el)
    expect(fired).toBe(0)
    expect(button(el).getAttribute('aria-busy')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="spinner"]')!.hidden).toBe(false)
  })

  it('默认插槽覆盖内置文案，倒计时仍走内置文案', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '5' }, '<span class="custom">发我</span>')
    expect(el.querySelector('.custom')?.textContent).toBe('发我')
    click(el)
    expect(labelText(el)).toBe('5 秒后重发')
  })

  it('断开连接清理计时器，重连恢复剩余冷却', () => {
    vi.useFakeTimers()
    const el = mount({ cooldown: '10' })
    click(el)
    expect(vi.getTimerCount()).toBe(1)
    el.remove()
    expect(vi.getTimerCount()).toBe(0)
    document.body.appendChild(el)
    expect(el.counting).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(el.remaining).toBe(9)
  })

  it('首连前调用 start() 也能在挂载后继续倒计时', () => {
    vi.useFakeTimers()
    const el = new OASCodeButton()
    el.setAttribute('cooldown', '5')
    el.start()
    document.body.appendChild(el)
    expect(el.counting).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(el.remaining).toBe(4)
  })
})
