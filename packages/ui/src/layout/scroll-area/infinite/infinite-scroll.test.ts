import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASScrollArea } from '../index.js'
import { createInfiniteScroll } from './index.js'
import type { InfiniteScrollLoadContext } from './index.js'

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

const rect = (top: number, height: number): DOMRect =>
  ({
    top,
    bottom: top + height,
    left: 0,
    right: 200,
    width: 200,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect

interface Geometry {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/** happy-dom 无布局：手动覆写滚动几何，scrollTop 写入按 maxScroll 夹取 */
function mountViewport(geo: Geometry): { el: HTMLElement; state: Geometry } {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const state = geo
  Object.defineProperty(el, 'scrollHeight', { get: () => state.scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { get: () => state.clientHeight, configurable: true })
  Object.defineProperty(el, 'scrollTop', {
    get: () => state.scrollTop,
    set: (value: number) => {
      const max = Math.max(0, state.scrollHeight - state.clientHeight)
      state.scrollTop = Math.max(0, Math.min(max, value))
    },
    configurable: true,
  })
  el.getBoundingClientRect = () => rect(0, state.clientHeight)
  return { el, state }
}

/** 内容项：rect.top = 内容坐标 - 当前 scrollTop（模拟真实滚动位移） */
function mountItem(state: Geometry, key: string, contentTop: () => number): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-key', key)
  el.getBoundingClientRect = () => rect(contentTop() - state.scrollTop, 50)
  return el
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createInfiniteScroll', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---------- 方向 / 阈值 / 边缘状态 ----------

  it('默认 bottom：距底 > 阈值不触发，进入阈值才触发（默认阈值 0）', () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: el, load })
    controller.attach()

    expect(load).toHaveBeenCalledTimes(0)
    state.scrollTop = 198.5 // 距底 1.5px > 1px 容差
    controller.update()
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 200
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)
    expect((load.mock.calls[0]![0] as InfiniteScrollLoadContext).edge).toBe('bottom')
    controller.destroy()
  })

  it('threshold 为距边缘像素：阈值 + 1px 容差内触发，超出不触发', () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: el, threshold: 24, load })
    controller.attach()

    state.scrollTop = 174.5 // 距底 25.5px > 24 + 1
    controller.update()
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 175 // 距底 25px = 阈值 24 + 1px 容差
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)
    controller.destroy()
  })

  it('bottom 含 1px 亚像素容差（小数/取整几何）；top 仍严格 <= threshold', () => {
    // 199.94 / 300 / 100：距底 0.06px，浏览器在亚像素/取整几何下常见此残留
    const sub = mountViewport({ scrollTop: 199.94, scrollHeight: 300, clientHeight: 100 })
    const subLoad = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const subController = createInfiniteScroll({ root: sub.el, load: subLoad })
    subController.attach()
    expect(subLoad).toHaveBeenCalledTimes(1)
    subController.destroy()

    // 198.99：距底 1.01px，超出容差仍不触发；199（正好 1px）触发
    const near = mountViewport({ scrollTop: 198.99, scrollHeight: 300, clientHeight: 100 })
    const nearLoad = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const nearController = createInfiniteScroll({ root: near.el, load: nearLoad })
    nearController.attach()
    expect(nearLoad).toHaveBeenCalledTimes(0)
    near.state.scrollTop = 199
    nearController.update()
    expect(nearLoad).toHaveBeenCalledTimes(1)
    nearController.destroy()

    // 顶部不享受 1px 容差：0.5 > threshold 0 不触发，0 才触发
    const topGeo = mountViewport({ scrollTop: 0.5, scrollHeight: 300, clientHeight: 100 })
    const topLoad = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const topController = createInfiniteScroll({ root: topGeo.el, direction: 'top', load: topLoad })
    topController.attach()
    expect(topLoad).toHaveBeenCalledTimes(0)
    topGeo.state.scrollTop = 0
    topController.update()
    expect(topLoad).toHaveBeenCalledTimes(1)
    topController.destroy()
  })

  it('direction=top：仅顶部阈值触发，bottom 边缘不触发', () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: el, direction: 'top', threshold: 24, load })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 24
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)
    expect((load.mock.calls[0]![0] as InfiniteScrollLoadContext).edge).toBe('top')
    controller.destroy()
  })

  it('direction 非法回退 bottom；threshold 非法/负数回退 0', () => {
    const { el, state } = mountViewport({ scrollTop: 198.5, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({
      root: el,
      direction: 'sideways' as never,
      threshold: -12,
      load,
    })
    controller.attach()
    controller.update()
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 200
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)
    expect(controller.direction).toBe('bottom')
    controller.destroy()
  })

  it('direction=both：top/bottom 双边缘独立并发，互不阻塞', async () => {
    const { el } = mountViewport({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })
    const top = deferred<Record<string, never>>()
    const bottom = deferred<Record<string, never>>()
    const load = vi.fn((ctx: InfiniteScrollLoadContext) => (ctx.edge === 'top' ? top.promise : bottom.promise))
    const controller = createInfiniteScroll({ root: el, direction: 'both', load })
    controller.attach()

    expect(load).toHaveBeenCalledTimes(2)
    expect(load.mock.calls.map(([ctx]) => (ctx as InfiniteScrollLoadContext).edge)).toEqual(['top', 'bottom'])
    expect(controller.state.top.status).toBe('loading')
    expect(controller.state.bottom.status).toBe('loading')

    top.resolve({})
    await flushMicrotasks()
    expect(controller.state.top.status).toBe('idle')
    expect(controller.state.bottom.status).toBe('loading')

    bottom.resolve({})
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
  })

  // ---------- 并发去重 ----------

  it('同一 edge 在途时重复 update 不再请求；不同 edge 可同时请求', async () => {
    const { el } = mountViewport({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })
    const pending: Array<ReturnType<typeof deferred<Record<string, never>>>> = []
    const load = vi.fn(() => {
      const d = deferred<Record<string, never>>()
      pending.push(d)
      return d.promise
    })
    const controller = createInfiniteScroll({ root: el, direction: 'both', load })
    controller.attach()
    expect(load).toHaveBeenCalledTimes(2)

    controller.update()
    controller.update()
    el.dispatchEvent(new Event('scroll'))
    expect(load).toHaveBeenCalledTimes(2)

    pending[0]!.resolve({})
    await flushMicrotasks()
    expect(controller.state.top.status).toBe('idle')
    expect(controller.state.bottom.status).toBe('loading')
    controller.update()
    expect(load).toHaveBeenCalledTimes(2)

    pending[1]!.resolve({})
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
  })

  it('无内容增长时不自动连发（避免空结果死循环）', async () => {
    const { el } = mountViewport({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: el, threshold: 1000, load })
    controller.attach()
    expect(load).toHaveBeenCalledTimes(1)

    await flushMicrotasks()
    await flushRaf()
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)
    controller.destroy()
  })

  // ---------- load / complete / error / retry / reset / destroy ----------

  it('load 完成派发 start/end + 状态序列；complete:true 后不再加载且 onComplete 只一次', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const events: string[] = []
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({ complete: true }))
    const controller = createInfiniteScroll({
      root: el,
      load,
      onLoadStart: ({ edge }) => events.push(`start:${edge}`),
      onLoadEnd: ({ edge }, result) => events.push(`end:${edge}:${result.complete === true}`),
      onStateChange: ({ edge, state: edgeState }) => events.push(`${edge}:${edgeState.status}`),
      onComplete: ({ edge }) => events.push(`complete:${edge}`),
    })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(1)
    expect(controller.state.bottom).toMatchObject({ status: 'complete', error: null, loads: 1 })
    expect(events).toEqual(['bottom:loading', 'start:bottom', 'bottom:complete', 'end:bottom:true', 'complete:bottom'])

    controller.update()
    state.scrollTop = 200
    el.dispatchEvent(new Event('scroll'))
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(1)
    expect(events.filter((event) => event === 'complete:bottom')).toHaveLength(1)
    controller.destroy()
  })

  it('load 返回 false 等价 complete；显式 complete(edge) 幂等', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const onComplete = vi.fn()
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => false)
    const controller = createInfiniteScroll({ root: el, load, onComplete })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('complete')

    controller.complete('bottom')
    controller.complete('bottom')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({ edge: 'bottom' })
    controller.destroy()
  })

  it('hasMore:false 等价 complete：进入 complete 并派发一次 onComplete', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const onComplete = vi.fn()
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({ hasMore: false }))
    const controller = createInfiniteScroll({ root: el, load, onComplete })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()
    expect(controller.state.bottom).toMatchObject({ status: 'complete', error: null, loads: 1 })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({ edge: 'bottom' })
    controller.destroy()
  })

  it('失败进入 error 并只回调一次；自动 update 不重试，retry 成功恢复 idle', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const onError = vi.fn()
    const onLoadEnd = vi.fn()
    let attempt = 0
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      if (attempt++ === 0) throw new Error('network')
      return {}
    })
    const controller = createInfiniteScroll({ root: el, load, onError, onLoadEnd })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(1)
    expect(controller.state.bottom.status).toBe('error')
    expect(controller.state.bottom.error).toBeInstanceOf(Error)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0].edge).toBe('bottom')
    expect(onLoadEnd).toHaveBeenCalledTimes(0)

    controller.update()
    expect(load).toHaveBeenCalledTimes(1)

    await expect(controller.retry('bottom')).resolves.toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
    expect((load.mock.calls[1]![0] as InfiniteScrollLoadContext).retry).toBe(true)
    expect(controller.state.bottom).toMatchObject({ status: 'idle', error: null, loads: 1 })
    controller.destroy()
  })

  it('retry 只作用于 error edge；非 error 时返回 false 不发请求', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: el, load })
    controller.attach()

    await expect(controller.retry('bottom')).resolves.toBe(false)
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 200
    controller.update()
    await expect(controller.retry('bottom')).resolves.toBe(false)
    expect(load).toHaveBeenCalledTimes(1)
    controller.destroy()
  })

  it('retry() 省略 edge 时同时重试双 error 边缘；任一成功 resolve true', async () => {
    const { el } = mountViewport({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })
    const failing = new Set(['top', 'bottom'])
    const load = vi.fn(async (ctx: InfiniteScrollLoadContext) => {
      if (failing.has(ctx.edge)) {
        failing.delete(ctx.edge)
        throw new Error(ctx.edge)
      }
      return {}
    })
    const controller = createInfiniteScroll({ root: el, direction: 'both', load })
    controller.attach()
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(2)
    expect(controller.state.top.status).toBe('error')
    expect(controller.state.bottom.status).toBe('error')

    await expect(controller.retry()).resolves.toBe(true)
    expect(load).toHaveBeenCalledTimes(4)
    expect(controller.state.top.status).toBe('idle')
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
  })

  it('complete 中止在途请求：迟到结果不写状态、不发 onLoadEnd', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const pending = deferred<Record<string, never>>()
    const contexts: InfiniteScrollLoadContext[] = []
    const onLoadEnd = vi.fn()
    const onComplete = vi.fn()
    const load = vi.fn((ctx: InfiniteScrollLoadContext) => {
      contexts.push(ctx)
      return pending.promise
    })
    const controller = createInfiniteScroll({ root: el, load, onLoadEnd, onComplete })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    expect(controller.state.bottom.status).toBe('loading')

    controller.complete('bottom')
    expect(contexts[0]!.signal.aborted).toBe(true)
    expect(controller.state.bottom).toMatchObject({ status: 'complete', loads: 0 })
    expect(onComplete).toHaveBeenCalledTimes(1)

    pending.resolve({})
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('complete')
    expect(controller.state.bottom.loads).toBe(0)
    expect(onLoadEnd).toHaveBeenCalledTimes(0)
    expect(onComplete).toHaveBeenCalledTimes(1)
    controller.destroy()
  })

  it('reset 中止在途请求、清空 complete/error 并重新武装；迟到结果不写状态不回调', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const pending = deferred<Record<string, never>>()
    const contexts: InfiniteScrollLoadContext[] = []
    const onLoadEnd = vi.fn()
    const load = vi.fn((ctx: InfiniteScrollLoadContext) => {
      contexts.push(ctx)
      return pending.promise
    })
    const controller = createInfiniteScroll({ root: el, load, onLoadEnd })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    expect(controller.state.bottom.status).toBe('loading')

    controller.reset()
    expect(contexts[0]!.signal.aborted).toBe(true)
    expect(controller.state.bottom).toMatchObject({ status: 'idle', error: null, loads: 0 })

    pending.resolve({})
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('idle')
    expect(onLoadEnd).toHaveBeenCalledTimes(0)

    state.scrollTop = 200
    controller.update()
    expect(load).toHaveBeenCalledTimes(2)
    controller.destroy()
  })

  it('destroy 中止在途请求并忽略迟到结果；之后 load/attach 均 no-op', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const pending = deferred<Record<string, never>>()
    const contexts: InfiniteScrollLoadContext[] = []
    const onLoadEnd = vi.fn()
    const onError = vi.fn()
    const load = vi.fn((ctx: InfiniteScrollLoadContext) => {
      contexts.push(ctx)
      return pending.promise
    })
    const controller = createInfiniteScroll({ root: el, load, onLoadEnd, onError })
    controller.attach()

    state.scrollTop = 200
    controller.update()
    expect(contexts[0]!.signal.aborted).toBe(false)

    controller.destroy()
    expect(contexts[0]!.signal.aborted).toBe(true)
    expect(controller.state.bottom.status).toBe('idle')

    pending.resolve({})
    await flushMicrotasks()
    expect(onLoadEnd).toHaveBeenCalledTimes(0)
    expect(onError).toHaveBeenCalledTimes(0)
    expect(controller.state.bottom.status).toBe('idle')
    await expect(controller.load('bottom')).resolves.toBe(false)
    expect(controller.attach(el)).toBe(false)
    controller.destroy()
  })

  it('attach(null) 等价 detach：中止在途请求，迟到结果不写状态', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const pending = deferred<Record<string, never>>()
    const contexts: InfiniteScrollLoadContext[] = []
    const onLoadEnd = vi.fn()
    const load = vi.fn((ctx: InfiniteScrollLoadContext) => {
      contexts.push(ctx)
      return pending.promise
    })
    const controller = createInfiniteScroll({ root: el, load, onLoadEnd })
    controller.attach()
    state.scrollTop = 200
    controller.update()

    expect(controller.attach(null)).toBe(false)
    expect(contexts[0]!.signal.aborted).toBe(true)
    expect(controller.viewport).toBeNull()
    expect(controller.state.bottom.status).toBe('idle')

    pending.resolve({})
    await flushMicrotasks()
    expect(onLoadEnd).toHaveBeenCalledTimes(0)
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
  })

  it('attach→loading→detach→attach→update：loading 复位后重新武装，可再次加载', async () => {
    const { el, state } = mountViewport({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
    const first = deferred<Record<string, never>>()
    const contexts: InfiniteScrollLoadContext[] = []
    const load = vi.fn((ctx: InfiniteScrollLoadContext) => {
      contexts.push(ctx)
      return contexts.length === 1 ? first.promise : Promise.resolve({})
    })
    const controller = createInfiniteScroll({ root: el, load })
    controller.attach()
    expect(load).toHaveBeenCalledTimes(1)
    expect(controller.state.bottom.status).toBe('loading')

    controller.detach()
    expect(contexts[0]!.signal.aborted).toBe(true)
    expect(controller.state.bottom.status).toBe('idle')

    controller.attach(el)
    controller.update()
    expect(load).toHaveBeenCalledTimes(2)
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('idle')

    // 迟到结果按代际丢弃，不覆盖新一轮状态
    first.resolve({})
    await flushMicrotasks()
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
  })

  it('detach 不复活 error/complete：重新 attach 后 update 不自动加载', async () => {
    const failing = mountViewport({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
    const failLoad = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      throw new Error('network')
    })
    const errorController = createInfiniteScroll({ root: failing.el, load: failLoad })
    errorController.attach()
    await flushMicrotasks()
    expect(errorController.state.bottom.status).toBe('error')

    errorController.detach()
    errorController.attach(failing.el)
    errorController.update()
    expect(failLoad).toHaveBeenCalledTimes(1)
    expect(errorController.state.bottom.status).toBe('error')
    errorController.destroy()

    const done = mountViewport({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
    const doneLoad = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({ complete: true }))
    const completeController = createInfiniteScroll({ root: done.el, load: doneLoad })
    completeController.attach()
    await flushMicrotasks()
    expect(completeController.state.bottom.status).toBe('complete')

    completeController.detach()
    completeController.attach(done.el)
    completeController.update()
    expect(doneLoad).toHaveBeenCalledTimes(1)
    expect(completeController.state.bottom.status).toBe('complete')
    completeController.destroy()
  })

  it('detach 的 idle 回调内 update 不新起请求；迟到结果不回调', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const pending = deferred<Record<string, never>>()
    const onLoadEnd = vi.fn()
    let idleUpdates = 0
    let controller!: ReturnType<typeof createInfiniteScroll>
    const load = vi.fn((_ctx: InfiniteScrollLoadContext) => pending.promise)
    controller = createInfiniteScroll({
      root: el,
      load,
      onLoadEnd,
      onStateChange: ({ state: edgeState }) => {
        if (edgeState.status === 'idle') {
          idleUpdates += 1
          // 旧实现 detach 先 emit 再拆环境：这里 update 会重新发起请求
          controller.update()
        }
      },
    })
    controller.attach()
    state.scrollTop = 200
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)

    controller.detach()
    expect(idleUpdates).toBe(1)
    expect(load).toHaveBeenCalledTimes(1)
    expect(controller.viewport).toBeNull()

    pending.resolve({})
    await flushMicrotasks()
    expect(onLoadEnd).toHaveBeenCalledTimes(0)
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
  })

  it('onLoadStart 内 reset：代际已推进，不发起请求', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    let controller!: ReturnType<typeof createInfiniteScroll>
    controller = createInfiniteScroll({
      root: el,
      load,
      onLoadStart: () => controller.reset(),
    })
    controller.attach()
    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(0)
    expect(controller.state.bottom.status).toBe('idle')
  })

  it('onLoadStart 内 destroy：不发起请求，后续回调全静默', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const onError = vi.fn()
    let controller!: ReturnType<typeof createInfiniteScroll>
    controller = createInfiniteScroll({
      root: el,
      load,
      onLoadStart: () => controller.destroy(),
      onError,
    })
    controller.attach()
    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(0)
    expect(controller.state.bottom.status).toBe('idle')
    expect(onError).toHaveBeenCalledTimes(0)
  })

  it('onLoadEnd 内 destroy：不再发 onComplete / 不写锚点', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const onComplete = vi.fn()
    let controller!: ReturnType<typeof createInfiniteScroll>
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({ complete: true }))
    controller = createInfiniteScroll({
      root: el,
      load,
      onComplete,
      onLoadEnd: () => controller.destroy(),
    })
    controller.attach()
    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(0)
    expect(controller.state.bottom.status).toBe('idle')
  })

  it('load 同步抛错进入 error 并只回调一次，不产生未处理拒绝', async () => {
    const { el, state } = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(() => {
      throw new Error('sync boom')
    })
    const onError = vi.fn()
    const controller = createInfiniteScroll({ root: el, load, onError })
    controller.attach()
    state.scrollTop = 200
    controller.update()
    await flushMicrotasks()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(controller.state.bottom.status).toBe('error')
    controller.destroy()
  })

  // ---------- prepend 锚定 / 异步撑高 / keyed 重查 ----------

  it('top 加载后按锚点视口位移补偿 scrollTop；keyed 替换后仍保位', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    let anchorTop = 0
    const oldAnchor = mountItem(state, 'a', () => anchorTop)
    el.append(
      oldAnchor,
      mountItem(state, 'b', () => 50),
    )

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      // 宿主重渲染：旧锚点被移除，同 key 新节点位于新插入的 60px 内容之后
      oldAnchor.remove()
      anchorTop = 60
      el.prepend(
        mountItem(state, 'x', () => 0),
        mountItem(state, 'a', () => anchorTop),
      )
      state.scrollHeight = 360
      return {}
    })
    const controller = createInfiniteScroll({ root: el, direction: 'top', load })
    controller.attach()
    expect(load).toHaveBeenCalledTimes(1)

    await flushMicrotasks()
    expect(controller.state.top.loads).toBe(1)
    expect(state.scrollTop).toBe(60)
    const anchor = el.querySelector('[data-key="a"]')!
    expect(anchor.getBoundingClientRect().top).toBe(0)
    controller.destroy()
  })

  it("keyAttribute: '' 关闭属性键：仅按 id 重查（忽略 data-key）", async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    let anchorTop = 0
    const oldAnchor = mountItem(state, 'stale', () => anchorTop)
    oldAnchor.id = 'row-a'
    el.append(
      oldAnchor,
      mountItem(state, 'b', () => 50),
    )

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      oldAnchor.remove()
      anchorTop = 60
      const replacement = mountItem(state, 'ignored', () => anchorTop)
      replacement.id = 'row-a'
      el.prepend(
        mountItem(state, 'x', () => 0),
        replacement,
      )
      state.scrollHeight = 360
      return {}
    })
    const controller = createInfiniteScroll({ root: el, direction: 'top', keyAttribute: '', load })
    controller.attach()
    await flushMicrotasks()

    expect(state.scrollTop).toBe(60)
    expect(el.querySelector('#row-a')!.getBoundingClientRect().top).toBe(0)
    controller.destroy()
  })

  it('top 加载抛错但内容已落地位移：先补偿再释放锚点', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    let anchorTop = 0
    const oldAnchor = mountItem(state, 'a', () => anchorTop)
    el.append(
      oldAnchor,
      mountItem(state, 'b', () => 50),
    )

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      oldAnchor.remove()
      anchorTop = 60
      el.prepend(
        mountItem(state, 'x', () => 0),
        mountItem(state, 'a', () => anchorTop),
      )
      state.scrollHeight = 360
      throw new Error('partial render')
    })
    const controller = createInfiniteScroll({ root: el, direction: 'top', load })
    controller.attach()
    await flushMicrotasks()

    expect(controller.state.top.status).toBe('error')
    // 失败也会守住读者视线：已落地的前插位移先补偿
    expect(state.scrollTop).toBe(60)

    // 锚点已释放：后续异步撑高不再补偿
    anchorTop = 100
    state.scrollHeight = 400
    controller.update()
    expect(state.scrollTop).toBe(60)
    controller.destroy()
  })

  it('content 指向真实列表容器：wrapper 结构下按条目而非 wrapper 锚定', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const list = document.createElement('div')
    el.append(list)
    let anchorTop = 0
    const oldAnchor = mountItem(state, 'a', () => anchorTop)
    list.append(oldAnchor)

    const load = vi.fn(async () => {
      oldAnchor.remove()
      anchorTop = 60
      list.prepend(
        mountItem(state, 'x', () => 0),
        mountItem(state, 'a', () => anchorTop),
      )
      state.scrollHeight = 360
      return {}
    })
    const controller = createInfiniteScroll({
      root: el,
      content: () => list,
      direction: 'top',
      load,
    })
    controller.attach()
    await flushMicrotasks()

    expect(state.scrollTop).toBe(60)
    expect(list.querySelector('[data-key="a"]')!.getBoundingClientRect().top).toBe(0)
    controller.destroy()
  })

  it('静态 root + content getter：加载中替换列表容器仍补偿，loads 不增长', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const first = document.createElement('div')
    el.append(first)
    let anchorTop = 0
    first.append(mountItem(state, 'a', () => anchorTop))
    let list = first

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      // 宿主重挂列表：root 不变，content getter 指向全新容器
      first.remove()
      const second = document.createElement('div')
      list = second
      el.append(second)
      anchorTop = 60
      second.prepend(
        mountItem(state, 'x', () => 0),
        mountItem(state, 'a', () => anchorTop),
      )
      state.scrollHeight = 360
      return {}
    })
    const controller = createInfiniteScroll({
      root: el,
      content: () => list,
      direction: 'top',
      load,
    })
    controller.attach()
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(1)
    expect(state.scrollTop).toBe(60)
    expect(list.querySelector('[data-key="a"]')!.getBoundingClientRect().top).toBe(0)
    expect(controller.state.top.loads).toBe(1)

    // 防御：内容已增长但不能再在 scrollTop=0 处自动续载
    controller.update()
    await flushRaf()
    expect(load).toHaveBeenCalledTimes(1)
    controller.destroy()
  })

  it('top 增长但锚点丢失：停在顶部期间停止自动续载，离开顶部后恢复', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const list = document.createElement('div')
    el.append(list)
    list.append(mountItem(state, 'a', () => 0))

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      // 新内容落地但稳定 key 丢失：无法补偿，必须就地停住
      list.replaceChildren(
        mountItem(state, 'x', () => 0),
        mountItem(state, 'y', () => 50),
      )
      state.scrollHeight = 400
      return {}
    })
    const controller = createInfiniteScroll({
      root: el,
      content: () => list,
      direction: 'top',
      load,
    })
    controller.attach()
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(1)
    expect(state.scrollTop).toBe(0)

    controller.update()
    await flushRaf()
    expect(load).toHaveBeenCalledTimes(1)

    // 离开顶部解除封锁
    state.scrollTop = 100
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)

    // 再次回顶：允许一次新的自动加载（第二次结果无增长，不再续）
    state.scrollTop = 0
    controller.update()
    expect(load).toHaveBeenCalledTimes(2)
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(2)
    controller.destroy()
  })

  it('attach 同 viewport 重挂：content getter 指向新容器时重绑内容侧观察', () => {
    const observed = new Set<Element>()
    class FakeResizeObserver {
      constructor(_cb: () => void) {}
      observe(el: Element) {
        observed.add(el)
      }
      unobserve(el: Element) {
        observed.delete(el)
      }
      disconnect() {
        observed.clear()
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const first = document.createElement('div')
    el.append(first)
    let list = first
    list.append(mountItem(state, 'a', () => 0))
    const controller = createInfiniteScroll({
      root: el,
      content: () => list,
      direction: 'top',
      load: async () => ({}),
    })
    controller.attach()
    expect(observed.has(first), 'attach 后应观察 content 容器').toBe(true)

    // 宿主替换列表容器后原样重挂（同一 viewport）：不能只换引用而留下旧容器的观察
    first.remove()
    const second = document.createElement('div')
    el.append(second)
    list = second
    expect(controller.attach(el)).toBe(true)
    expect(observed.has(second), '重挂后必须观察新 content 容器').toBe(true)
    expect(observed.has(first), '旧容器的观察应解除').toBe(false)
    controller.destroy()
  })

  it('detach 不保留 top 未补偿封锁：重新 attach 后内容增长可再次自动续载', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const list = document.createElement('div')
    el.append(list)
    list.append(mountItem(state, 'a', () => 0))

    let call = 0
    const load = vi.fn(async () => {
      call += 1
      if (call === 1) {
        // 首次：增长但稳定 key 丢失 → 无法补偿 → 进入 blocked
        list.replaceChildren(
          mountItem(state, 'x', () => 0),
          mountItem(state, 'y', () => 50),
        )
        state.scrollHeight = 400
      } else {
        // 重挂后的第二次：正常 prepend 并补偿
        list.prepend(mountItem(state, 'z', () => 0))
        state.scrollHeight = 450
      }
      return {}
    })
    const controller = createInfiniteScroll({ root: el, content: () => list, direction: 'top', load })
    controller.attach()
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(1)

    // blocked 期间：停在顶部 + 内容增长也不续载
    state.scrollHeight = 420
    controller.update()
    expect(load).toHaveBeenCalledTimes(1)

    // 摘挂是一次环境重置：blocked 不跨 re-attach 保持，否则重挂后永久停在顶部
    controller.detach()
    controller.attach(el)
    controller.update()
    state.scrollHeight = 500
    controller.update()
    await flushMicrotasks()
    expect(load, '重挂后增长应重新武装并允许一次自动续载').toHaveBeenCalledTimes(2)
    controller.destroy()
  })

  it('异步撑高：ResizeObserver 触发继续补偿；用户滚动后释放锚点不再补偿', async () => {
    let roCallback: (() => void) | null = null
    class FakeResizeObserver {
      constructor(cb: () => void) {
        roCallback = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    let anchorTop = 0
    const oldAnchor = mountItem(state, 'a', () => anchorTop)
    el.append(
      oldAnchor,
      mountItem(state, 'b', () => 50),
    )

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      oldAnchor.remove()
      anchorTop = 60
      el.prepend(
        mountItem(state, 'x', () => 0),
        mountItem(state, 'a', () => anchorTop),
      )
      state.scrollHeight = 360
      return {}
    })
    const controller = createInfiniteScroll({ root: el, direction: 'top', load })
    controller.attach()
    await flushMicrotasks()
    expect(state.scrollTop).toBe(60)
    expect(typeof roCallback).toBe('function')

    // 锚点上方图片异步加载完成：内容再撑高 40px
    anchorTop = 100
    state.scrollHeight = 400
    roCallback!()
    expect(state.scrollTop).toBe(100)
    expect(el.querySelector('[data-key="a"]')!.getBoundingClientRect().top).toBe(0)

    // 读者真实滚动 → 释放保位锚
    state.scrollTop = 160
    el.dispatchEvent(new Event('scroll'))
    anchorTop = 140
    state.scrollHeight = 440
    roCallback!()
    expect(state.scrollTop).toBe(160)
    controller.destroy()
  })

  it('异步资源观察只在锚点活跃时建立；释放后 unobserve 且不再新增', async () => {
    const observed = new Set<Element>()
    class FakeResizeObserver {
      constructor(_cb: () => void) {}
      observe(el: Element): void {
        observed.add(el)
      }
      unobserve(el: Element): void {
        observed.delete(el)
      }
      disconnect(): void {
        observed.clear()
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const anchorEl = mountItem(state, 'a', () => 0)
    el.append(
      anchorEl,
      mountItem(state, 'b', () => 50),
    )
    const pending = deferred<Record<string, never>>()
    const load = vi.fn((_ctx: InfiniteScrollLoadContext) => pending.promise)
    const controller = createInfiniteScroll({ root: el, direction: 'top', load })
    controller.attach()
    expect(controller.state.top.status).toBe('loading')
    expect(observed.has(anchorEl)).toBe(true)

    // 锚点活跃期间的异步图片加载 → 纳入观察（撑高后由 RO 继续补偿）
    const image = document.createElement('img')
    el.append(image)
    image.dispatchEvent(new Event('load'))
    expect(observed.has(image)).toBe(true)

    // 读者真实滚动 → 释放锚点：锚点与资源观察一并解除
    state.scrollTop = 20
    el.dispatchEvent(new Event('scroll'))
    expect(observed.has(image)).toBe(false)
    expect(observed.has(anchorEl)).toBe(false)

    // 释放后到达的图片事件不再建立新观察（无锚点不观察）
    image.dispatchEvent(new Event('load'))
    expect(observed.has(image)).toBe(false)

    pending.resolve({})
    await flushMicrotasks()
    controller.destroy()
  })

  it('程序补偿产生的 scroll 回声不释放锚点', async () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    let anchorTop = 0
    const oldAnchor = mountItem(state, 'a', () => anchorTop)
    el.append(oldAnchor)

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => {
      oldAnchor.remove()
      anchorTop = 60
      el.prepend(mountItem(state, 'a', () => anchorTop))
      state.scrollHeight = 360
      return {}
    })
    const controller = createInfiniteScroll({ root: el, direction: 'top', load })
    controller.attach()
    await flushMicrotasks()
    expect(state.scrollTop).toBe(60)

    // 浏览器对 scrollTop 赋值异步派发 scroll：值等于控制器写入值 → 回声，不释放锚点
    el.dispatchEvent(new Event('scroll'))
    anchorTop = 100
    state.scrollHeight = 400
    controller.update()
    expect(state.scrollTop).toBe(100)
    controller.destroy()
  })

  // ---------- reverse / ScrollArea shadow viewport ----------

  it('reverse = top + 初始滚到底；随后滚到顶触发 top 加载', () => {
    const { el, state } = mountViewport({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: el, reverse: true, load })
    expect(controller.direction).toBe('top')
    controller.attach()

    expect(state.scrollTop).toBe(200)
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 0
    el.dispatchEvent(new Event('scroll'))
    expect(load).toHaveBeenCalledTimes(1)
    expect((load.mock.calls[0]![0] as InfiniteScrollLoadContext).edge).toBe('top')
    controller.destroy()
  })

  it('动态 root getter 切换：update 重定向到新 viewport，旧视口监听解绑', async () => {
    const first = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    const second = mountViewport({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
    let current: HTMLElement = first.el
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: () => current, load })
    controller.attach()
    expect(controller.viewport).toBe(first.el)

    first.state.scrollTop = 200
    first.el.dispatchEvent(new Event('scroll'))
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(1)

    current = second.el
    controller.update()
    expect(controller.viewport).toBe(second.el)

    // 旧视口已解绑：滚动不再触发；新视口照常触发
    first.state.scrollTop = 200
    first.el.dispatchEvent(new Event('scroll'))
    expect(load).toHaveBeenCalledTimes(1)
    second.state.scrollTop = 200
    second.el.dispatchEvent(new Event('scroll'))
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(2)
    controller.destroy()
  })

  it('oas-scroll-area：解析 shadow viewport 并监听其 scroll', async () => {
    const area = new OASScrollArea()
    document.body.appendChild(area)
    const viewport = area.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    const state = { scrollTop: 100, scrollHeight: 300, clientHeight: 100 }
    Object.defineProperty(viewport, 'scrollHeight', { get: () => state.scrollHeight, configurable: true })
    Object.defineProperty(viewport, 'clientHeight', { get: () => state.clientHeight, configurable: true })
    Object.defineProperty(viewport, 'scrollTop', {
      get: () => state.scrollTop,
      set: (value: number) => {
        state.scrollTop = Math.max(0, Math.min(200, value))
      },
      configurable: true,
    })
    viewport.getBoundingClientRect = () => rect(0, state.clientHeight)

    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: area, load })
    expect(controller.attach()).toBe(true)
    expect(controller.viewport).toBe(viewport)
    expect(load).toHaveBeenCalledTimes(0)

    state.scrollTop = 200
    viewport.dispatchEvent(new Event('scroll'))
    await flushMicrotasks()
    expect(load).toHaveBeenCalledTimes(1)
    expect((load.mock.calls[0]![0] as InfiniteScrollLoadContext).edge).toBe('bottom')
    controller.destroy()
  })

  // ---------- 无 DOM / SSR 安全降级 ----------

  it('root=null / 无 viewport：attach/update 安全降级，手动 load 可用，destroy 后失效', async () => {
    const load = vi.fn(async (_ctx: InfiniteScrollLoadContext) => ({}))
    const controller = createInfiniteScroll({ root: null, load })

    expect(controller.attach()).toBe(false)
    expect(controller.viewport).toBeNull()
    controller.update()
    expect(load).toHaveBeenCalledTimes(0)

    await expect(controller.load('bottom')).resolves.toBe(true)
    expect(load).toHaveBeenCalledTimes(1)

    controller.reset()
    expect(controller.state.bottom.status).toBe('idle')
    controller.destroy()
    await expect(controller.load('bottom')).resolves.toBe(false)
    controller.destroy()
  })
})
