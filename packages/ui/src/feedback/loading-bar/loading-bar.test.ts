import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadingBar, destroyAll } from './index.js'

/** 元素公共面类型（happy-dom 无自定义元素类型声明） */
type BarEl = HTMLElement & {
  start: (speed?: number) => void
  finish: () => void
  error: () => void
  increment: (step?: number) => void
  set: (percent: number) => void
  decrement: (step?: number) => void
  readonly active: boolean
  readonly sessions: number
}

/** 取根下的加载条元素 */
function bar(root: ParentNode = document.body): BarEl {
  const el = root.querySelector('oas-loading-bar')
  if (!el) throw new Error('未找到 oas-loading-bar')
  return el as unknown as BarEl
}

/** shadow 内 progressbar 的 aria-valuenow（进度代理） */
function progressAttr(el: BarEl): string {
  const track = el.shadowRoot!.querySelector('[role="progressbar"]')
  if (!track) throw new Error('未找到 track')
  return track.getAttribute('aria-valuenow') ?? ''
}

/** shadow 内 <style> 文本 */
function styleText(el: BarEl): string {
  const style = el.shadowRoot!.querySelector('style')
  if (!style) throw new Error('未找到 style')
  return style.textContent ?? ''
}

describe('loadingBar 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('start 渲染顶部进度条，默认无 position 属性（top 语义）', async () => {
    loadingBar.start()
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).not.toBeNull()
    expect(bar().hasAttribute('position')).toBe(false)
  })

  it('无 start 直接 finish 为空操作（不产生加载条）', async () => {
    loadingBar.finish()
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  // ---------- P1 会话计数 ----------

  it('P1 多次 start 并发计数：最后一个 finish 才收尾', async () => {
    loadingBar.start()
    await Promise.resolve()
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    expect(el.active).toBe(true)

    loadingBar.finish() // 仍有一个会话活跃
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).not.toBeNull()
    expect(el.active).toBe(true)

    loadingBar.finish() // 最后一个 finish 触发收尾
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
    expect(loadingBar.active).toBe(false)
  })

  it('P1 sessions 查询并发会话数（中途递减可查）', async () => {
    loadingBar.start()
    await Promise.resolve()
    loadingBar.start()
    await Promise.resolve()
    expect(bar().sessions).toBe(2)
    loadingBar.finish() // 中途递减不发事件，但可查询
    await Promise.resolve()
    expect(bar().sessions).toBe(1)
    loadingBar.finish()
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  it('P1 单 start 后 finish 收尾：收尾延时前仍可见（供淡出动画展示）', async () => {
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    expect(el.getAttribute('aria-busy')).toBe('true')
    loadingBar.finish()
    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).not.toBeNull()
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
    expect(el.getAttribute('aria-busy')).toBe('false')
  })

  // ---------- P3 position ----------

  it('P3 start({ position: bottom }) 挂 bottom 属性', async () => {
    loadingBar.start({ position: 'bottom' })
    await Promise.resolve()
    expect(bar().getAttribute('position')).toBe('bottom')
  })

  it('P3 相同容器重复 start 复用单例（不重复创建）', async () => {
    loadingBar.start({ position: 'bottom' })
    loadingBar.start({ position: 'bottom' })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-loading-bar').length).toBe(1)
  })

  // ---------- P4 to 局部容器 ----------

  it('P4 start({ to: 容器元素 }) 挂载进局部容器（local 模式），不占全局宿主', async () => {
    const host = document.createElement('div')
    host.id = 'local-box'
    document.body.appendChild(host)
    loadingBar.start({ to: host })
    await Promise.resolve()
    const el = host.querySelector('oas-loading-bar')
    expect(el).not.toBeNull()
    expect(el!.hasAttribute('local')).toBe(true)
    // 默认宿主（body 直接子级）不出现局部条
    expect(
      Array.from(document.body.children).some((n) => n.tagName === 'OAS-LOADING-BAR'),
    ).toBe(false)
  })

  it('P4 start({ to: 选择器 }) 与无效选择器抛错', async () => {
    const host = document.createElement('div')
    host.id = 'sel-box'
    document.body.appendChild(host)
    loadingBar.start({ to: '#sel-box' })
    await Promise.resolve()
    expect(host.querySelector('oas-loading-bar')).not.toBeNull()
    expect(() => loadingBar.start({ to: '#not-exist' })).toThrow()
  })

  it('P4 不同容器各自独立单例；默认 finish 不影响局部条', async () => {
    const a = document.createElement('div')
    document.body.appendChild(a)
    const b = document.createElement('div')
    document.body.appendChild(b)
    loadingBar.start({ to: a })
    loadingBar.start({ to: b })
    await Promise.resolve()
    expect(a.querySelectorAll('oas-loading-bar').length).toBe(1)
    expect(b.querySelectorAll('oas-loading-bar').length).toBe(1)

    loadingBar.finish() // 默认宿主无会话 → 空操作
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(a.querySelector('oas-loading-bar')).not.toBeNull()
    expect(b.querySelector('oas-loading-bar')).not.toBeNull()
    expect(loadingBar.isActive(a)).toBe(true)
    expect(loadingBar.isActive(b)).toBe(true)
  })

  it('P4 finish/error 可指定目标容器', async () => {
    const a = document.createElement('div')
    document.body.appendChild(a)
    const b = document.createElement('div')
    document.body.appendChild(b)
    loadingBar.start({ to: a })
    loadingBar.start({ to: b })
    await Promise.resolve()
    loadingBar.finish(a)
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(a.querySelector('oas-loading-bar')).toBeNull()
    expect(b.querySelector('oas-loading-bar')).not.toBeNull()
  })

  // ---------- P5 增量控制 ----------

  it('P5 increment/set/decrement 精确控制进度（aria-valuenow 同步）', async () => {
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    expect(progressAttr(el)).toBe('0')
    el.set(55)
    expect(progressAttr(el)).toBe('55')
    el.increment(10)
    expect(progressAttr(el)).toBe('65')
    el.decrement(20)
    expect(progressAttr(el)).toBe('45')
  })

  it('P5 进度夹取 0–100：set 越界 / decrement 触底', async () => {
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    el.set(150)
    expect(progressAttr(el)).toBe('100')
    el.decrement(300)
    expect(progressAttr(el)).toBe('0')
    el.set(-5)
    expect(progressAttr(el)).toBe('0')
  })

  it('P5 start(speed) 以指定节拍推进；自动推进封顶 90（不会提前显满）', async () => {
    loadingBar.start(300)
    await Promise.resolve()
    const el = bar()
    vi.advanceTimersByTime(650) // 约 2 拍
    expect(Number(progressAttr(el))).toBeGreaterThan(0)
    vi.advanceTimersByTime(60_000)
    expect(Number(progressAttr(el))).toBeLessThanOrEqual(90)
  })

  // ---------- P6 事件与活动态 ----------

  it('P6 start/finish/error 生命周期事件（bubbles + composed，detail 带会话数）', async () => {
    const events: string[] = []
    document.addEventListener('oas-start', (e) => {
      events.push(`start:${(e as CustomEvent<{ count: number }>).detail.count}`)
    })
    document.addEventListener('oas-finish', () => events.push('finish'))
    document.addEventListener('oas-error', () => events.push('error'))

    loadingBar.start()
    await Promise.resolve()
    loadingBar.finish()
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(events).toEqual(['start:1', 'finish'])

    loadingBar.error() // P10 兜底场景同时覆盖 error 事件
    await Promise.resolve()
    expect(events).toEqual(['start:1', 'finish', 'error'])
    vi.advanceTimersByTime(400)
    await Promise.resolve()
  })

  it('P6 active 活动态查询：start 后 true、收尾后 false', async () => {
    expect(loadingBar.active).toBe(false)
    loadingBar.start()
    await Promise.resolve()
    expect(loadingBar.active).toBe(true)
    expect(bar().active).toBe(true)
    loadingBar.finish()
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(loadingBar.active).toBe(false)
  })

  it('P6 getEl 可拿到元素挂事件监听；未 start 返回 null', () => {
    expect(loadingBar.getEl()).toBeNull()
    loadingBar.start()
    const el = loadingBar.getEl()
    expect(el).not.toBeNull()
    expect(el!.tagName).toBe('OAS-LOADING-BAR')
  })

  // ---------- P7 动画打磨 ----------

  it('P7 收尾先满格（scale 到 1）再 data-leaving 淡出，延时后移除', async () => {
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    loadingBar.finish()
    await Promise.resolve()
    expect(progressAttr(el)).toBe('100')
    expect(el.hasAttribute('data-leaving')).toBe(true)
    vi.advanceTimersByTime(100)
    expect(document.body.querySelector('oas-loading-bar')).not.toBeNull()
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  it('P7 推进动画只走 transform（scaleX），收尾淡出走 opacity', async () => {
    loadingBar.start()
    await Promise.resolve()
    const st = styleText(bar())
    expect(st).toContain('transform: scaleX(var(--lb-p, 0))')
    expect(st).toContain('opacity')
    expect(st).not.toContain('transition: width')
    expect(st).not.toContain('transition: scaleX')
  })

  // ---------- P8 视觉 token ----------

  it('P8 颜色/高度/层级均以 CSS 变量开口，默认回退语义 token 无硬编码色值', async () => {
    loadingBar.start()
    await Promise.resolve()
    const st = styleText(bar())
    expect(st).toContain('--oas-loading-bar-color')
    expect(st).toContain('--oas-loading-bar-error-color')
    expect(st).toContain('--oas-loading-bar-height')
    expect(st).toContain('--oas-loading-bar-z-index')
    expect(st).toContain('var(--oas-color-primary)')
    expect(st).toContain('var(--oas-color-danger)')
    expect(st).not.toMatch(/background:\s*#[0-9a-fA-F]{3,8}/)
    expect(st).not.toMatch(/background:\s*rgb/)
  })

  it('P8 错误态换 --oas-loading-bar-error-color（data-status 驱动）', async () => {
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    loadingBar.error()
    await Promise.resolve()
    const track = el.shadowRoot!.querySelector('[role="progressbar"]')
    expect(track!.getAttribute('data-status')).toBe('error')
    expect(styleText(el)).toContain("[data-status='error']")
    vi.advanceTimersByTime(400)
    await Promise.resolve()
  })

  // ---------- P9 reverse / RTL ----------

  it('P9 reverse 属性反转推进方向；逻辑属性布局 + :dir(rtl) 适配', async () => {
    loadingBar.start({ reverse: true })
    await Promise.resolve()
    const el = bar()
    expect(el.hasAttribute('reverse')).toBe(true)
    const st = styleText(el)
    expect(st).toContain('inset-block-start')
    expect(st).toContain('inset-inline-start')
    expect(st).toContain(':dir(rtl)')
    expect(st).toContain(':host([reverse])')
    // 不使用物理方向属性做定位
    expect(st).not.toMatch(/inset\s*:\s*0|(?:^|\W)top\s*:\s*0|(?:^|\W)left\s*:\s*0/)
  })

  // ---------- P10 error 兜底 ----------

  it('P10 未 start 直接 error：错误态满格收尾、不发 oas-start、不闪烁推进', async () => {
    const started: string[] = []
    document.addEventListener('oas-start', () => started.push('start'))
    loadingBar.error()
    await Promise.resolve()
    const el = bar()
    expect(el).not.toBeNull()
    expect(el.getAttribute('status')).toBe('error')
    expect(progressAttr(el)).toBe('100') // 直接满格，不经过 0→推进 的闪烁
    expect(el.hasAttribute('data-leaving')).toBe(true)
    expect(started).toEqual([])
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  it('P10 并发会话中 error 标记终态：最后一个 error 才收尾为红', async () => {
    loadingBar.start()
    await Promise.resolve()
    loadingBar.start()
    await Promise.resolve()
    const el = bar()
    loadingBar.error() // 仍 1 会话活跃：只记账不收尾
    await Promise.resolve()
    expect(el.active).toBe(true)
    expect(el.getAttribute('status')).not.toBe('error')
    loadingBar.error() // 最后一个 → 错误终态
    await Promise.resolve()
    expect(el.getAttribute('status')).toBe('error')
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  it('P10 批次内任一 error 决定终态：error 后 finish 收尾仍为红', async () => {
    loadingBar.start()
    await Promise.resolve()
    loadingBar.start()
    await Promise.resolve()
    loadingBar.error() // 1 会话活跃，标记 error
    await Promise.resolve()
    loadingBar.finish() // 最后一个收尾：应为错误态
    await Promise.resolve()
    expect(bar().getAttribute('status')).toBe('error')
    expect(progressAttr(bar())).toBe('100')
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  // ---------- destroyAll ----------

  it('destroyAll 清空所有容器内的加载条并复位活动态', async () => {
    const a = document.createElement('div')
    document.body.appendChild(a)
    loadingBar.start()
    loadingBar.start({ to: a })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-loading-bar').length).toBe(2)
    destroyAll()
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-loading-bar').length).toBe(0)
    expect(loadingBar.active).toBe(false)
    expect(loadingBar.isActive(a)).toBe(false)
  })
})
