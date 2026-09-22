import { describe, it, expect, vi, afterEach } from 'vitest'
import { onMeasurable, type MeasureWhenVisibleEnv } from './measure-when-visible.js'

interface FakeObserver {
  cb: () => void
  targets: Element[]
  disconnectCount: number
}

/** 可注入环境：假 ResizeObserver + 手动 rAF 队列，测试不依赖真实计时/布局 */
function createEnv() {
  const observers: FakeObserver[] = []
  class FakeRO {
    cb: () => void
    targets: Element[] = []
    disconnectCount = 0
    constructor(cb: () => void) {
      this.cb = cb
      observers.push(this)
    }
    observe(el: Element): void {
      this.targets.push(el)
    }
    disconnect(): void {
      this.disconnectCount++
    }
    unobserve(): void {}
  }
  const rafs: Array<() => void> = []
  const cancelled: number[] = []
  let seq = 0
  const env: Partial<MeasureWhenVisibleEnv> = {
    ResizeObserver: FakeRO as unknown as typeof ResizeObserver,
    requestAnimationFrame: (cb: () => void): number => {
      rafs.push(cb)
      return ++seq
    },
    cancelAnimationFrame: (id: number): void => {
      cancelled.push(id)
    },
  }
  return {
    env,
    observers,
    /** 执行队列中最早的 rAF 回调（模拟一帧） */
    flushRaf: (): void => {
      const cb = rafs.shift()
      cb?.()
    },
    pendingRafCount: (): number => rafs.length,
    cancelled,
  }
}

/** 已连接的宿主（助手仅在宿主连接时才安排一次性 rAF） */
function host(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('onMeasurable 隐藏容器测量自愈助手', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('不以 measure 的首次执行作为触发（调用方已在判定不可测后调用，助手仅安排重试）', () => {
    const { env } = createEnv()
    const measure = vi.fn(() => false)
    onMeasurable(host(), measure, { env })
    expect(measure).not.toHaveBeenCalled()
  })

  it('待测时懒建 ResizeObserver 观察 host，并安排一次性 rAF 复测', () => {
    const { env, observers, pendingRafCount } = createEnv()
    const h = host()
    onMeasurable(h, () => false, { env })
    expect(observers).toHaveLength(1)
    expect(observers[0]!.targets).toContain(h)
    expect(pendingRafCount()).toBe(1)
  })

  it('RO 回调重试：先不可测保持待测，后测到有效即收敛（断开 RO + 取消 rAF + onSettle）', () => {
    const { env, observers, cancelled } = createEnv()
    let usable = false
    const measure = vi.fn(() => usable)
    const onSettle = vi.fn()
    onMeasurable(host(), measure, { env, onSettle })
    const ro = observers[0]!
    ro.cb()
    expect(measure).toHaveBeenCalledTimes(1)
    expect(ro.disconnectCount).toBe(0)
    expect(onSettle).not.toHaveBeenCalled()
    usable = true
    ro.cb()
    expect(measure).toHaveBeenCalledTimes(2)
    expect(ro.disconnectCount).toBe(1)
    expect(onSettle).toHaveBeenCalledTimes(1)
    // 收敛后再触发也不重复 measure
    ro.cb()
    expect(measure).toHaveBeenCalledTimes(2)
    expect(cancelled.length).toBeGreaterThan(0)
  })

  it('连接后一次性 rAF 复测到有效即收敛', () => {
    const { env, observers, flushRaf, pendingRafCount } = createEnv()
    const measure = vi.fn(() => true)
    const onSettle = vi.fn()
    onMeasurable(host(), measure, { env, onSettle })
    expect(pendingRafCount()).toBe(1)
    flushRaf()
    expect(measure).toHaveBeenCalledTimes(1)
    expect(observers[0]!.disconnectCount).toBe(1)
    expect(onSettle).toHaveBeenCalledTimes(1)
  })

  it('rAF 复测仍不可测时保持待测，RO 保留以捕捉后续 0→非 0', () => {
    const { env, observers, flushRaf } = createEnv()
    const measure = vi.fn(() => false)
    onMeasurable(host(), () => measure(), { env })
    flushRaf()
    expect(measure).toHaveBeenCalledTimes(1)
    expect(observers[0]!.disconnectCount).toBe(0)
  })

  it('observeResize:false 复用调用方已有尺寸观察器：不创建 RO，仅安排 rAF', () => {
    const { env, observers, flushRaf } = createEnv()
    const measure = vi.fn(() => true)
    onMeasurable(host(), measure, { env, observeResize: false })
    expect(observers).toHaveLength(0)
    flushRaf()
    expect(measure).toHaveBeenCalledTimes(1)
  })

  it('rafRetry:false 时不安排 rAF，仅靠 RO 触发', () => {
    const { env, observers, pendingRafCount } = createEnv()
    const measure = vi.fn(() => false)
    onMeasurable(host(), measure, { env, rafRetry: false })
    expect(pendingRafCount()).toBe(0)
    expect(measure).not.toHaveBeenCalled()
    observers[0]!.cb()
    expect(measure).toHaveBeenCalledTimes(1)
  })

  it('ResizeObserver 不可用时降级：只走一次性 rAF，不抛错', () => {
    const { env, observers, flushRaf } = createEnv()
    const measure = vi.fn(() => true)
    onMeasurable(host(), measure, { env: { ...env, ResizeObserver: undefined } })
    expect(observers).toHaveLength(0)
    flushRaf()
    expect(measure).toHaveBeenCalledTimes(1)
  })

  it('同步注入的 rAF 不在构造期重入 measure（延后到微任务），避免调用方句柄未赋值时递归', async () => {
    const syncEnv: Partial<MeasureWhenVisibleEnv> = {
      ResizeObserver: undefined,
      requestAnimationFrame: (cb: () => void): number => {
        cb()
        return 1
      },
      cancelAnimationFrame: () => {},
    }
    const measure = vi.fn(() => false)
    let ensureCalls = 0
    let handle: (() => void) | null = null
    const ensure = (): void => {
      if (handle) return
      ensureCalls++
      handle = onMeasurable(host(), measure, { env: syncEnv, onSettle: () => (handle = null) })
    }
    // 模拟调用方：measure 内部会因「不可测」再次 ensure（构造期重入将无限递归）
    measure.mockImplementation(() => {
      ensure()
      return false
    })
    ensure()
    expect(ensureCalls).toBe(1)
    expect(measure).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(measure).toHaveBeenCalledTimes(1)
    expect(ensureCalls).toBe(1)
  })

  it('disposer 幂等：重复调用只断一次，释放后 RO 回调不再 measure', () => {
    const { env, observers } = createEnv()
    const measure = vi.fn(() => false)
    const dispose = onMeasurable(host(), measure, { env })
    const ro = observers[0]!
    dispose()
    dispose()
    expect(ro.disconnectCount).toBe(1)
    ro.cb()
    expect(measure).not.toHaveBeenCalled()
  })

  it('onSettle 用于重新武装：收敛后再次 onMeasurable 可重新建立链路', () => {
    const { env, observers, flushRaf, pendingRafCount } = createEnv()
    let armed: (() => void) | null = null
    const ensure = (): void => {
      if (armed) return
      armed = onMeasurable(host(), () => true, { env, onSettle: () => (armed = null) })
    }
    ensure()
    expect(pendingRafCount()).toBe(1)
    flushRaf() // 收敛
    expect(armed).toBeNull()
    ensure() // 重新武装
    expect(observers).toHaveLength(2)
    expect(pendingRafCount()).toBe(1)
  })
})
