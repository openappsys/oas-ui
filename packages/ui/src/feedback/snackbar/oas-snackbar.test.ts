import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSnackbar } from './index.js'

/** 栈内条目间距（--oas-space-2 镜像值，happy-dom 高度为 0 时栈位=纯间距） */
const STACK_GAP = 8

function mount(attrs: Record<string, string> = {}): OASSnackbar {
  const el = new OASSnackbar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function box(el: OASSnackbar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="box"]')!
}

/** 模拟 hover 暂停（pointerenter 直接派发到 box） */
function hover(el: OASSnackbar): void {
  box(el).dispatchEvent(new Event('pointerenter'))
}
function unhover(el: OASSnackbar): void {
  box(el).dispatchEvent(new Event('pointerleave'))
}
/** 模拟 Escape 键 */
function escOn(target: EventTarget): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, composed: true }),
  )
}

describe('OASSnackbar 基础（受控打开 / ARIA / 计时）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('open 渲染消息并派发 oas-open，role=status + aria-live=polite（P11）', () => {
    const el = new OASSnackbar()
    let opened = 0
    el.addEventListener('oas-open', () => opened++)
    el.setAttribute('open', '')
    el.setAttribute('message', '网络已断开')
    document.body.appendChild(el)
    expect(opened).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="message"]')!.textContent).toBe('网络已断开')
    expect(box(el).getAttribute('role')).toBe('status')
    expect(box(el).getAttribute('aria-live')).toBe('polite')
    expect(box(el).getAttribute('aria-atomic')).toBe('true')
    expect(box(el).getAttribute('aria-hidden')).toBe('false')
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="action"]')!.hidden).toBe(true)
  })

  it('有 action-text 时仍为 status+polite（不再用 alertdialog），点击派发 oas-action（P11）', () => {
    const el = mount({ open: '', message: '删除成功', 'action-text': '撤销' })
    let action = 0
    el.addEventListener('oas-action', () => action++)
    const b = box(el)
    expect(b.getAttribute('role')).toBe('status')
    expect(b.getAttribute('aria-live')).toBe('polite')
    const actionBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="action"]')!
    expect(actionBtn.hidden).toBe(false)
    expect(actionBtn.textContent).toBe('撤销')
    expect(actionBtn.type).toBe('button')
    actionBtn.click()
    expect(action).toBe(1)
  })

  it('duration 到期派发 oas-close（reason=timeout）且不自行移除 open（受控），计时器清理（P6）', () => {
    const el = mount({ open: '', message: '提示', duration: '4000' })
    const reasons: string[] = []
    el.addEventListener('oas-close', (e) => reasons.push((e as CustomEvent).detail.reason))
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(4000)
    expect(reasons).toEqual(['timeout'])
    expect(el.hasAttribute('open')).toBe(true)
    // 计时器已清理，继续推进不再触发
    vi.advanceTimersByTime(4000)
    expect(reasons).toEqual(['timeout'])
  })

  it('open 移除（外部关闭）时不派发 oas-close，视觉退场（oas-open 摘除），计时器归零', () => {
    const el = mount({ open: '', message: '提示' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    el.removeAttribute('open')
    expect(closes).toBe(0)
    expect(el.classList.contains('oas-open')).toBe(false)
    expect(box(el).getAttribute('aria-hidden')).toBe('true')
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(4000)
    expect(closes).toBe(0)
  })

  it('duration=0 不自动关闭，progress 不展示', () => {
    const el = mount({ open: '', message: '常驻', duration: '0', progress: '' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    vi.advanceTimersByTime(60000)
    expect(closes).toBe(0)
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!.hidden).toBe(true)
  })

  it('断开连接时清理计时器与堆叠登记（无泄漏）；重连后 open 属性重新驱动打开', () => {
    const el = mount({ open: '', message: '提示' })
    expect(vi.getTimerCount()).toBe(1)
    el.remove()
    expect(vi.getTimerCount()).toBe(0)
    // 再次连接：声明式 open 仍在 → 重新走打开边沿
    document.body.appendChild(el)
    expect(vi.getTimerCount()).toBe(1)
    expect(el.classList.contains('oas-open')).toBe(true)
  })
})

describe('P1 堆叠布局（缺陷级：多条纵向排列不重叠）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('多条同向打开时按打开顺序分配递增栈位（--snackbar-stack-shift），样式为 fixed + calc 消费', () => {
    const a = mount({ open: '', message: 'A' })
    const b = mount({ open: '', message: 'B' })
    const c = mount({ open: '', message: 'C' })
    for (const el of [a, b, c]) {
      expect(el.classList.contains('oas-open')).toBe(true)
    }
    // 最新贴边（shift=0），老条目按「比它新的条目高度 + 间距」上移（happy-dom 高度为 0 → 纯间距）
    expect(c.style.getPropertyValue('--snackbar-stack-shift')).toBe('0px')
    expect(b.style.getPropertyValue('--snackbar-stack-shift')).toBe(`${STACK_GAP}px`)
    expect(a.style.getPropertyValue('--snackbar-stack-shift')).toBe(`${STACK_GAP * 2}px`)
    // 样式机制：fixed 定位 + bottom/top calc 消费栈位变量
    const css = a.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(":host(:not([direction='top'])) .box")
    expect(css).toContain('calc(var(--snackbar-offset, 24px) + var(--snackbar-stack-shift, 0px))')
    expect(css).toContain('position: fixed')
  })

  it('关闭其中一条后其余条目栈位重排', () => {
    const a = mount({ open: '', message: 'A' })
    const b = mount({ open: '', message: 'B' })
    b.removeAttribute('open')
    expect(a.style.getPropertyValue('--snackbar-stack-shift')).toBe('0px')
  })

  it('direction=top 走 top 定位（同公式：最新贴顶）', () => {
    const a = mount({ open: '', message: 'A', direction: 'top' })
    const b = mount({ open: '', message: 'B', direction: 'top' })
    expect(b.style.getPropertyValue('--snackbar-stack-shift')).toBe('0px')
    expect(a.style.getPropertyValue('--snackbar-stack-shift')).toBe(`${STACK_GAP}px`)
    const css = a.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(":host([direction='top']) .box")
  })

  it('offset 逐元素独立生效（写宿主 CSS 变量）', () => {
    const a = mount({ open: '', message: 'A', offset: '40' })
    const b = mount({ open: '', message: 'B', offset: '80' })
    expect(a.style.getPropertyValue('--snackbar-offset')).toBe('40px')
    expect(b.style.getPropertyValue('--snackbar-offset')).toBe('80px')
  })

  it('打开中切换 direction 会迁移方向列表并重排原方向', () => {
    const a = mount({ open: '', message: 'A' })
    const b = mount({ open: '', message: 'B' })
    expect(a.style.getPropertyValue('--snackbar-stack-shift')).toBe(`${STACK_GAP}px`)
    a.setAttribute('direction', 'top')
    expect(a.classList.contains('oas-open')).toBe(true)
    // bottom 方向只剩 b → b 贴边
    expect(b.style.getPropertyValue('--snackbar-stack-shift')).toBe('0px')
  })

  it('堆叠上限 3：第 4 条打开时最老的一条收到 oas-close（reason=evict）并退场', () => {
    const els: OASSnackbar[] = []
    const events: Array<{ el: OASSnackbar; reason: string }> = []
    for (let i = 0; i < 4; i++) {
      const el = mount({ open: '', message: `消息${i}` })
      el.addEventListener('oas-close', (e) =>
        events.push({ el, reason: (e as CustomEvent).detail.reason }),
      )
      els.push(el)
    }
    expect(events.map((x) => x.el)).toEqual([els[0]])
    expect(events[0]!.reason).toBe('evict')
    expect(els[0]!.classList.contains('oas-open')).toBe(false)
    expect(els[1]!.classList.contains('oas-open')).toBe(true)
    expect(els[3]!.classList.contains('oas-open')).toBe(true)
    // 剩余三条重排：最老的贴最高栈位
    expect(els[1]!.style.getPropertyValue('--snackbar-stack-shift')).toBe(
      `${STACK_GAP * 2}px`,
    )
  })

  it('P16 焦点管理：仅最新一条可 Tab（其余 inert），关闭后接力解除', () => {
    const a = mount({ open: '', message: 'A' })
    const b = mount({ open: '', message: 'B' })
    expect(box(a).hasAttribute('inert')).toBe(true)
    expect(box(b).hasAttribute('inert')).toBe(false)
    b.removeAttribute('open')
    expect(box(a).hasAttribute('inert')).toBe(false)
  })
})

describe('P2 closable 关闭按钮', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('默认无关闭按钮；closable 时渲染且 aria-label 走 locale（snackbar.close）', () => {
    const el = mount({ open: '', message: '提示' })
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.hidden).toBe(true)
    const el2 = mount({ open: '', message: '提示', closable: '', 'duration': '0' })
    const btn = el2.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!
    expect(btn.hidden).toBe(false)
    expect(btn.type).toBe('button')
    expect(btn.getAttribute('aria-label')).toBe('关闭')
    expect(btn.textContent!.trim()).not.toBe('')
  })

  it('点击关闭按钮派发 oas-close（reason=close）', () => {
    const el = mount({ open: '', message: '提示', closable: '', 'duration': '0' })
    const reasons: string[] = []
    el.addEventListener('oas-close', (e) => reasons.push((e as CustomEvent).detail.reason))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.click()
    expect(reasons).toEqual(['close'])
  })
})

describe('P3 message 默认插槽（富内容）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('无插槽时渲染 message 属性文本；有插槽时覆盖属性文本', () => {
    const el = mount({ open: '', message: '属性文案' })
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('.message-text')!
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot')!
    expect(fallback.textContent).toBe('属性文案')
    expect(fallback.hidden).toBe(false)
    expect(slot.assignedNodes().length).toBe(0)

    const el2 = new OASSnackbar()
    el2.setAttribute('open', '')
    el2.setAttribute('message', '属性文案')
    el2.innerHTML = '<strong>加粗</strong> 与 <a href="#">链接</a>'
    document.body.appendChild(el2)
    const slot2 = el2.shadowRoot!.querySelector<HTMLSlotElement>('slot')!
    const fallback2 = el2.shadowRoot!.querySelector<HTMLElement>('.message-text')!
    expect(slot2.assignedNodes().length).toBeGreaterThan(0)
    expect(fallback2.hidden).toBe(true)
  })
})

describe('P4 hover/focus 暂停计时（默认开，剩余时长记账）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('hover 暂停并按剩余时长续走（不重置满时长）', () => {
    const el = mount({ open: '', message: '提示', duration: '4000' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    vi.advanceTimersByTime(1600)
    hover(el)
    expect(closes).toBe(0)
    vi.advanceTimersByTime(3000) // 暂停期间不走
    expect(closes).toBe(0)
    unhover(el)
    vi.advanceTimersByTime(2399) // 剩余 2400，差 1ms
    expect(closes).toBe(0)
    vi.advanceTimersByTime(1)
    expect(closes).toBe(1)
  })

  it('focus（focusin/focusout）同样暂停；hover+focus 叠加时全离开才恢复', () => {
    const el = mount({ open: '', message: '提示', duration: '2000' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    hover(el)
    el.dispatchEvent(new Event('focusin', { bubbles: true }))
    unhover(el) // 仍被 focus 持有暂停
    vi.advanceTimersByTime(10000)
    expect(closes).toBe(0)
    el.dispatchEvent(new Event('focusout', { bubbles: true }))
    vi.advanceTimersByTime(2000)
    expect(closes).toBe(1)
  })

  it('no-pause 关闭全部自动暂停（hover 照常到期）', () => {
    const el = mount({ open: '', message: '提示', duration: '2000', 'no-pause': '' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    hover(el)
    vi.advanceTimersByTime(2000)
    expect(closes).toBe(1)
  })

  it('S6 页面隐藏暂停（visibilitychange），恢复可见续走', () => {
    const el = mount({ open: '', message: '提示', duration: '2000' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    const doc = document as Document & { hidden: boolean }
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => true })
    doc.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(5000)
    expect(closes).toBe(0)
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => false })
    doc.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(2000)
    expect(closes).toBe(1)
  })
})

describe('P5 Escape 关闭 + P6 reason', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('焦点在 snackbar 上时 Esc 关当前（reason=escape）', () => {
    const a = mount({ open: '', message: 'A', closable: '', 'duration': '0' })
    const b = mount({ open: '', message: 'B', 'duration': '0' })
    const reasons: string[] = []
    b.addEventListener('oas-close', (e) => reasons.push((e as CustomEvent).detail.reason))
    a.addEventListener('oas-close', () => reasons.push('A-closed'))
    escOn(b) // 键盘事件源自 b（焦点在其内部）
    expect(reasons).toEqual(['escape'])
  })

  it('无焦点归属时 Esc 关最老一条', () => {
    const a = mount({ open: '', message: 'A', 'duration': '0' })
    const b = mount({ open: '', message: 'B', 'duration': '0' })
    const closed: string[] = []
    a.addEventListener('oas-close', () => closed.push('A'))
    b.addEventListener('oas-close', () => closed.push('B'))
    escOn(document.body)
    expect(closed).toEqual(['A'])
    expect(b.hasAttribute('open')).toBe(true)
  })

  it('已被 preventDefault 的 Escape 不响应（不与浮层抢 Esc）', () => {
    const el = mount({ open: '', message: 'A', 'duration': '0' })
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    document.body.addEventListener('keydown', (e) => e.preventDefault(), { capture: true })
    escOn(document.body)
    expect(closes).toBe(0)
  })
})

describe('P10 排队模式（queue opt-in）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('栈满时 queue 元素等待不挤掉最老的；空位后依次补上并派发 oas-open', () => {
    const els = [
      mount({ open: '', message: 'A' }),
      mount({ open: '', message: 'B' }),
      mount({ open: '', message: 'C' }),
    ]
    let evicted = 0
    els[0]!.addEventListener('oas-close', () => evicted++)
    const d = mount({ open: '', message: 'D', queue: '' })
    const e = mount({ open: '', message: 'E', queue: '' })
    expect(evicted).toBe(0)
    // D 未展示：无 oas-open 视觉态、对读屏隐藏
    expect(d.classList.contains('oas-open')).toBe(false)
    expect(box(d).getAttribute('aria-hidden')).toBe('true')
    let dOpened = 0
    d.addEventListener('oas-open', () => dOpened++)
    // 关掉最老的一条 → D 补位
    els[0]!.removeAttribute('open')
    expect(dOpened).toBe(1)
    expect(d.classList.contains('oas-open')).toBe(true)
    let eOpened = 0
    e.addEventListener('oas-open', () => eOpened++)
    expect(eOpened).toBe(0)
    // 再关一条 → E 补位
    els[1]!.removeAttribute('open')
    expect(eOpened).toBe(1)
  })

  it('排队等待中移除 open 则出队，不再补位', () => {
    const els = [
      mount({ open: '', message: 'A' }),
      mount({ open: '', message: 'B' }),
      mount({ open: '', message: 'C' }),
    ]
    const d = mount({ open: '', message: 'D', queue: '' })
    d.removeAttribute('open')
    els[0]!.removeAttribute('open')
    let dOpened = 0
    d.addEventListener('oas-open', () => dOpened++)
    expect(dOpened).toBe(0)
  })
})

describe('P12 滑动关闭（swipe）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('纵向滑动超过阈值松手 → oas-close（reason=swipe），滑动中跟手位移', () => {
    const el = mount({ open: '', message: 'A', swipe: '', 'duration': '0' })
    const b = box(el)
    const reasons: string[] = []
    el.addEventListener('oas-close', (e) => reasons.push((e as CustomEvent).detail.reason))
    b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 100, cancelable: true }))
    b.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: 40, cancelable: true }))
    // 跟手位移（保留水平居中 translate(-50%)）
    expect(b.style.transform).toBe('translate(-50%, -60px)')
    b.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 30, cancelable: true }))
    expect(reasons).toEqual(['swipe'])
  })

  it('未达阈值回弹，不关闭', () => {
    const el = mount({ open: '', message: 'A', swipe: '', 'duration': '0' })
    const b = box(el)
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 100, cancelable: true }))
    b.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: 85, cancelable: true }))
    b.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 80, cancelable: true }))
    expect(closes).toBe(0)
    expect(b.style.transform).toBe('')
  })

  it('未开 swipe 属性时不响应拖拽', () => {
    const el = mount({ open: '', message: 'A', 'duration': '0' })
    const b = box(el)
    let closes = 0
    el.addEventListener('oas-close', () => closes++)
    b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 100, cancelable: true }))
    b.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: 0, cancelable: true }))
    b.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: 0, cancelable: true }))
    expect(closes).toBe(0)
    expect(b.style.transform).toBe('')
  })
})

describe('P13 计时进度（progress）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('暂停时进度冻结在剩余比例（scaleX）', () => {
    const el = mount({ open: '', message: '提示', duration: '4000', progress: '' })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!
    expect(bar.hidden).toBe(false)
    vi.advanceTimersByTime(2000)
    hover(el)
    expect(bar.style.transform).toBe('scaleX(0.5)')
    vi.advanceTimersByTime(1500)
    expect(bar.style.transform).toBe('scaleX(0.5)')
    unhover(el)
    expect(bar.style.transition).toContain('transform')
  })

  it('无 progress 属性时进度条隐藏', () => {
    const el = mount({ open: '', message: '提示', duration: '4000' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!.hidden).toBe(true)
  })
})

describe('P15 同内容合并 + badge 计数（group）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('同 group 同 message 的新条目被合并：不展示、立即 oas-close（reason=group），既有条目计数 +1 且重置计时', () => {
    const a = mount({ open: '', message: '已保存', group: 'save' })
    vi.advanceTimersByTime(3000) // 剩 1000ms
    const events: Array<{ el: string; type: string; reason?: string }> = []
    a.addEventListener('oas-close', (e) =>
      events.push({ el: 'a', type: 'close', reason: (e as CustomEvent).detail.reason }),
    )
    const b = new OASSnackbar()
    let bOpened = 0
    b.setAttribute('message', '已保存')
    b.setAttribute('group', 'save')
    b.setAttribute('open', '')
    b.addEventListener('oas-open', () => bOpened++)
    b.addEventListener('oas-close', (e) =>
      events.push({ el: 'b', type: 'close', reason: (e as CustomEvent).detail.reason }),
    )
    document.body.appendChild(b)
    expect(bOpened).toBe(0)
    expect(b.classList.contains('oas-open')).toBe(false)
    expect(box(b).getAttribute('aria-hidden')).toBe('true')
    expect(events).toEqual([{ el: 'b', type: 'close', reason: 'group' }])
    const count = a.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    expect(count.hidden).toBe(false)
    expect(count.textContent).toBe('×2')
    // 计时已重置为满时长
    vi.advanceTimersByTime(3999)
    expect(events.length).toBe(1)
    vi.advanceTimersByTime(1)
    expect(events).toContainEqual({ el: 'a', type: 'close', reason: 'timeout' })
  })

  it('同 group 不同 message 不合并（各自独立展示）', () => {
    const a = mount({ open: '', message: '已保存', group: 'save' })
    const b = mount({ open: '', message: '已另存', group: 'save' })
    expect(b.classList.contains('oas-open')).toBe(true)
    expect(a.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!.hidden).toBe(true)
  })

  it('message 变化时计数重置', () => {
    const a = mount({ open: '', message: '已保存', group: 'save' })
    mount({ open: '', message: '已保存', group: 'save' })
    expect(a.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!.textContent).toBe('×2')
    a.setAttribute('message', '保存中')
    const count = a.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    expect(count.hidden).toBe(true)
  })
})
