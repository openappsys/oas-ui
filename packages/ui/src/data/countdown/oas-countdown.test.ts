import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASCountdown, formatDuration } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCountdown {
  const el = new OASCountdown()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function display(el: OASCountdown): string {
  return el.shadowRoot!.querySelector('[part="display"]')!.textContent!
}

describe('formatDuration（纯函数）', () => {
  it('HH:mm:ss 默认把天滚入小时', () => {
    expect(formatDuration(90061000, 'HH:mm:ss')).toBe('25:01:01')
    expect(formatDuration(5000, 'HH:mm:ss')).toBe('00:00:05')
  })

  it('DD:HH:mm:ss 分天显示', () => {
    expect(formatDuration(90061000, 'DD:HH:mm:ss')).toBe('01:01:01:01')
    expect(formatDuration(0, 'DD:HH:mm:ss')).toBe('00:00:00:00')
  })

  it('支持中文单位模板（单字母 token 不补零）', () => {
    expect(formatDuration(90061000, 'D天H时m分s秒')).toBe('1天1时1分1秒')
    expect(formatDuration(90061000, 'D天HH时mm分ss秒')).toBe('1天01时01分01秒')
  })

  it('负数按 0 处理', () => {
    expect(formatDuration(-100, 'HH:mm:ss')).toBe('00:00:00')
  })

  it('SSS token 输出毫秒（3 位补零）', () => {
    expect(formatDuration(1234, 'ss.SSS')).toBe('01.234')
    expect(formatDuration(1234, 'HH:mm:ss.SSS')).toBe('00:00:01.234')
    expect(formatDuration(0, 'ss.SSS')).toBe('00.000')
  })
})

describe('OASCountdown', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('渲染初始剩余值（HH:mm:ss）', () => {
    const el = mount({ value: '5000' })
    expect(display(el)).toBe('00:00:05')
  })

  it('format 决定展示（分天模板）', () => {
    const el = mount({ value: '90061000', format: 'DD:HH:mm:ss' })
    expect(display(el)).toBe('01:01:01:01')
  })

  it('实时递减（fake timers）', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300) // 250ms tick 粒度：1300ms 处剩余 3700ms → 3s
    expect(display(el)).toBe('00:00:03')
    vi.advanceTimersByTime(2000)
    expect(display(el)).toBe('00:00:01')
  })

  it('到 0 停止并派发 oas-finish', () => {
    vi.useFakeTimers()
    const el = mount({ value: '2000' })
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    vi.advanceTimersByTime(2100)
    expect(finished).toBe(1)
    expect(display(el)).toBe('00:00:00')
    // 计时器已停止，不再变化也不重复派发
    vi.advanceTimersByTime(5000)
    expect(finished).toBe(1)
    expect(display(el)).toBe('00:00:00')
  })

  it('空态：value=0 显示全零且不派发 finish', () => {
    vi.useFakeTimers()
    const el = mount({ value: '0' })
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    expect(display(el)).toBe('00:00:00')
    vi.advanceTimersByTime(3000)
    expect(finished).toBe(0)
  })

  it('外部改 value 重置倒计时', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:03')
    el.setAttribute('value', '10000')
    expect(display(el)).toBe('00:00:10')
    vi.advanceTimersByTime(1500)
    expect(display(el)).toBe('00:00:08')
  })

  it('断开连接清理计时器，重连后按截止点继续', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:03')
    el.remove()
    // 断开后不再推进
    vi.advanceTimersByTime(5000)
    expect(display(el)).toBe('00:00:03')
    // 重连：期间真实时间已流逝，按原截止点继续（已归零）
    document.body.appendChild(el)
    expect(display(el)).toBe('00:00:00')
  })

  // ---- SSS 毫秒精度（interval 自适应加速） ----

  it('SSS 模板毫秒级刷新（50ms tick）', () => {
    vi.useFakeTimers()
    const el = mount({ value: '1000', format: 'ss.SSS' })
    expect(display(el)).toBe('01.000')
    vi.advanceTimersByTime(300)
    expect(display(el)).toBe('00.700')
    vi.advanceTimersByTime(300)
    expect(display(el)).toBe('00.400')
  })

  // ---- active 受控暂停 / 恢复 ----

  it('active=false 停帧不计时；恢复后续走', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:03')
    el.setAttribute('active', 'false')
    vi.advanceTimersByTime(3000)
    // 暂停期间时间不走
    expect(display(el)).toBe('00:00:03')
    el.setAttribute('active', 'true')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:02')
  })

  it('active 缺席（默认 true）与移除 active 恢复走表', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    el.setAttribute('active', 'false')
    vi.advanceTimersByTime(1000)
    el.removeAttribute('active')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:02')
  })

  it('暂停期间改 value 重置剩余时长', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(1300)
    el.setAttribute('active', 'false')
    el.setAttribute('value', '10000')
    expect(display(el)).toBe('00:00:10')
    vi.advanceTimersByTime(2600)
    expect(display(el)).toBe('00:00:10')
    el.setAttribute('active', 'true')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:08')
  })

  // ---- reset() 方法 ----

  it('reset() 回到初值重新计时（active=false 时不重启）', () => {
    vi.useFakeTimers()
    const el = mount({ value: '5000' })
    vi.advanceTimersByTime(2000)
    expect(display(el)).toBe('00:00:03')
    el.reset()
    expect(display(el)).toBe('00:00:05')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:03')

    // active=false 时 reset 只归位不启动
    el.setAttribute('active', 'false')
    vi.advanceTimersByTime(2000)
    el.reset()
    expect(display(el)).toBe('00:00:05')
    vi.advanceTimersByTime(2000)
    expect(display(el)).toBe('00:00:05')
  })

  it('reset() 已完成后可重新开始并再次派发 finish', () => {
    vi.useFakeTimers()
    const el = mount({ value: '2000' })
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    vi.advanceTimersByTime(2100)
    expect(finished).toBe(1)
    el.reset()
    expect(display(el)).toBe('00:00:02')
    vi.advanceTimersByTime(2100)
    expect(finished).toBe(2)
    expect(display(el)).toBe('00:00:00')
  })

  // ---- oas-change 事件（显示值变化才派发，节流派） ----

  it('oas-change 在剩余显示值变化时派发（detail.value 为剩余 ms）', () => {
    vi.useFakeTimers()
    const el = mount({ value: '3000' })
    const changes: number[] = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail.value))
    vi.advanceTimersByTime(2600) // 跨过 2 个秒边界（250ms tick 内文本变化 2 次）
    expect(changes.length).toBeGreaterThanOrEqual(2)
    // 首次变化在首个 tick（剩余 < 初值 3000）；末次变化已跨入下一秒（剩余 ≤ 1000）
    expect(changes[0]).toBeLessThan(3000)
    expect(changes[changes.length - 1]).toBeLessThanOrEqual(1000)
  })

  it('oas-change 不初始派发、不归零重复派发', () => {
    vi.useFakeTimers()
    const el = mount({ value: '2000' })
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    expect(changes).toBe(0)
    vi.advanceTimersByTime(2100)
    expect(changes).toBe(2) // 00:00:01 → 00:00:00 两次文本变化
    vi.advanceTimersByTime(3000)
    expect(changes).toBe(2)
  })

  // ---- prefix / suffix / title 双通道 ----

  function partEl(el: OASCountdown, part: string): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)!
  }

  it('title 属性渲染标题区并从宿主吸收；prefix/suffix 夹显示值', () => {
    const el = mount({ value: '5000', title: '剩余时间', prefix: '还剩 ', suffix: ' 结束' })
    expect(partEl(el, 'title').textContent).toContain('剩余时间')
    expect(el.hasAttribute('title')).toBe(false)
    expect(partEl(el, 'prefix').textContent).toContain('还剩')
    expect(partEl(el, 'suffix').textContent).toContain('结束')
    const body = el.shadowRoot!.querySelector('[part="countdown"]')!
    expect(body.textContent).toContain('还剩')
    expect(body.textContent).toContain('00:00:05')
  })

  it('slot="title" / slot="prefix" / slot="suffix" 分发优先', async () => {
    const el = mount({ value: '5000', prefix: '属性前缀' })
    const p = document.createElement('span')
    p.textContent = '插槽前缀'
    p.setAttribute('slot', 'prefix')
    el.appendChild(p)
    await new Promise((r) => setTimeout(r, 0))
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prefix"]')!
    expect(slot.assignedNodes()).toContain(p)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"] [data-fallback]')!.hidden).toBe(
      true,
    )
  })

  it('水合：SSR 快照含标题文本时恢复 title 缓存', () => {
    const ref = mount({ value: '5000', title: '快照标题' })
    const snap = ref.shadowRoot!.innerHTML
    ref.remove()
    const el = new OASCountdown()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-countdown" data-oas-ssr-v="1">${snap}`
    el.setAttribute('value', '5000')
    document.body.appendChild(el)
    expect(partEl(el, 'title').textContent).toContain('快照标题')
    expect(el.hasAttribute('title')).toBe(false)
  })

  // ---- 正计时（type="countup"）：从 start 往上递增，无终止点 ----

  it('countup 从 0 往上递增且无终止（不派发 oas-finish）', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup' })
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    expect(display(el)).toBe('00:00:00')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:01')
    vi.advanceTimersByTime(12000)
    expect(display(el)).toBe('00:00:13')
    // 正计时无终止点：走过 13s 后仍不派发 finish
    expect(finished).toBe(0)
  })

  it('countup start 属性指定起点（毫秒）', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup', start: '5000' })
    expect(display(el)).toBe('00:00:05')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:06')
  })

  it('countup active=false 冻结，恢复后续走（不重置）', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:01')
    el.setAttribute('active', 'false')
    vi.advanceTimersByTime(3000)
    expect(display(el)).toBe('00:00:01')
    el.setAttribute('active', 'true')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:02')
  })

  it('countup 暂停期间改 start 重置计时并保持暂停态', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup' })
    vi.advanceTimersByTime(1300)
    el.setAttribute('active', 'false')
    el.setAttribute('start', '10000')
    expect(display(el)).toBe('00:00:10')
    vi.advanceTimersByTime(2600)
    expect(display(el)).toBe('00:00:10')
    el.setAttribute('active', 'true')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:11')
  })

  it('countup reset() 归位到 start 重新开始（active=false 时只归位不启动）', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup', start: '5000' })
    vi.advanceTimersByTime(2000)
    expect(display(el)).toBe('00:00:07')
    el.reset()
    expect(display(el)).toBe('00:00:05')
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:06')

    el.setAttribute('active', 'false')
    vi.advanceTimersByTime(2000)
    el.reset()
    expect(display(el)).toBe('00:00:05')
    vi.advanceTimersByTime(2000)
    expect(display(el)).toBe('00:00:05')
  })

  it('countup 复用 oas-change 通道，detail.value 为已计时毫秒', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup' })
    const changes: number[] = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail.value))
    expect(changes).toHaveLength(0)
    vi.advanceTimersByTime(2600) // 跨过 2 个秒边界
    expect(changes.length).toBeGreaterThanOrEqual(2)
    expect(changes[0]).toBeGreaterThanOrEqual(1000)
    expect(changes[changes.length - 1]).toBeLessThanOrEqual(2600)
  })

  it('countup SSS 模板毫秒级递增（50ms tick）', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup', format: 'ss.SSS' })
    expect(display(el)).toBe('00.000')
    vi.advanceTimersByTime(300)
    expect(display(el)).toBe('00.300')
    vi.advanceTimersByTime(300)
    expect(display(el)).toBe('00.600')
  })

  it('countup 断开连接清理计时器，重连后继续累计已走过时长', () => {
    vi.useFakeTimers()
    const el = mount({ type: 'countup' })
    vi.advanceTimersByTime(1300)
    expect(display(el)).toBe('00:00:01')
    el.remove()
    vi.advanceTimersByTime(5000)
    expect(display(el)).toBe('00:00:01')
    document.body.appendChild(el)
    // 正计时语义：断开期间真实时间已流逝，重连后一并累计（无截止点可过期）
    expect(display(el)).toBe('00:00:06')
  })
})
