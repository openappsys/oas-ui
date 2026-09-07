import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useOasEvents, type OasEventHandlers } from './use-oas-events.js'

/**
 * @oas-ui/react useOasEvents 单测（happy-dom）。
 *
 * 多事件批量绑定契约：
 * 1. 单次 useEffect 统一绑定/解绑，多个事件类型各自命中对应 handler 与 detail；
 * 2. handlers 引用每次渲染都变，但不得重复解绑/重绑（靠 ref 最新化）；
 * 3. 事件名集合变化（增删类型）时重新绑定，新类型生效、旧类型保留；
 * 4. 卸载后全部解绑，事件不再触发。
 */

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

interface FiredRecord {
  type: string
  detail: unknown
}

/** 多事件宿主：handlers 由外部传入（测试用字面量新引用模拟每渲染变化） */
function MultiEventHost(props: {
  handlers: OasEventHandlers
  onFired: (r: FiredRecord) => void
}): ReturnType<typeof createElement> {
  const { handlers, onFired } = props
  const ref = useRef<HTMLDivElement | null>(null)
  useOasEvents(ref, handlers)
  return createElement('div', { ref })
}

function mount(host: ReturnType<typeof createElement>): { root: Root; container: HTMLDivElement; el: HTMLDivElement } {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  void act(() => {
    root.render(host)
  })
  const el = container.firstElementChild as HTMLDivElement
  return { root, container, el }
}

const mounted: Array<{ root: Root; container: HTMLDivElement }> = []

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    void act(() => {
      root.unmount()
    })
    container.remove()
  }
})

function dispatch(el: HTMLElement, type: string, detail?: unknown): Event {
  const ev = new CustomEvent(type, { detail, bubbles: true, composed: true })
  void act(() => {
    el.dispatchEvent(ev)
  })
  return ev
}

describe('useOasEvents', () => {
  it('批量绑定：多个事件类型各自命中对应 handler，detail 与事件名正确', () => {
    const fired: FiredRecord[] = []
    const { root, container, el } = mount(
      createElement(MultiEventHost, {
        handlers: {
          'oas-change': (detail) => fired.push({ type: 'oas-change', detail }),
          'oas-close': (detail) => fired.push({ type: 'oas-close', detail }),
        },
        onFired: () => {},
      }),
    )
    mounted.push({ root, container })

    const changeDetail = { value: 'a' }
    const closeDetail = { source: 'close-btn' }
    const ev = dispatch(el, 'oas-change', changeDetail)
    dispatch(el, 'oas-close', closeDetail)

    expect(ev.type).toBe('oas-change')
    expect(fired).toEqual([
      { type: 'oas-change', detail: changeDetail },
      { type: 'oas-close', detail: closeDetail },
    ])
  })

  it('handlers 引用变化不重复解绑：重渲染传新引用后监听零重绑、走最新闭包', () => {
    const calls: string[] = []
    const { root, container, el } = mount(
      createElement(MultiEventHost, {
        handlers: { 'oas-change': () => calls.push('first') },
        onFired: () => {},
      }),
    )
    mounted.push({ root, container })

    const addSpy = vi.spyOn(el, 'addEventListener')
    const removeSpy = vi.spyOn(el, 'removeEventListener')

    // 重渲染：handlers 是新字面量引用，但事件名集合未变
    void act(() => {
      root.render(
        createElement(MultiEventHost, {
          handlers: { 'oas-change': () => calls.push('second') },
          onFired: () => {},
        }),
      )
    })

    expect(addSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()

    dispatch(el, 'oas-change', { value: 'x' })
    expect(calls).toEqual(['second'])
  })

  it('事件名集合变化时重绑：新增类型生效、移除类型解绑', () => {
    const fired: FiredRecord[] = []
    const { root, container, el } = mount(
      createElement(MultiEventHost, {
        handlers: { 'oas-change': (detail) => fired.push({ type: 'oas-change', detail }) },
        onFired: () => {},
      }),
    )
    mounted.push({ root, container })

    const addSpy = vi.spyOn(el, 'addEventListener')
    const removeSpy = vi.spyOn(el, 'removeEventListener')

    // 集合由 {oas-change} → {oas-change, oas-close}：单个 effect 重绑当前完整集合
    void act(() => {
      root.render(
        createElement(MultiEventHost, {
          handlers: {
            'oas-change': (detail) => fired.push({ type: 'oas-change', detail }),
            'oas-close': (detail) => fired.push({ type: 'oas-close', detail }),
          },
          onFired: () => {},
        }),
      )
    })

    expect(removeSpy).toHaveBeenCalledTimes(1) // 清理旧集合（仅 oas-change）
    expect(removeSpy.mock.calls[0]?.[0]).toBe('oas-change')
    // 重绑当前完整集合（oas-change + 新增的 oas-close）
    expect(addSpy).toHaveBeenCalledTimes(2)
    expect(new Set(addSpy.mock.calls.map((c) => c[0]))).toEqual(new Set(['oas-change', 'oas-close']))

    const changeDetail = { value: 'a' }
    dispatch(el, 'oas-change', changeDetail)
    dispatch(el, 'oas-close', { source: 'x' })

    expect(fired).toEqual([
      { type: 'oas-change', detail: changeDetail },
      { type: 'oas-close', detail: { source: 'x' } },
    ])

    // 移除类型：集合 → {oas-change}，oas-close 解绑后不再触发
    void act(() => {
      root.render(
        createElement(MultiEventHost, {
          handlers: { 'oas-change': (detail) => fired.push({ type: 'oas-change', detail }) },
          onFired: () => {},
        }),
      )
    })
    const firedBefore = fired.length
    dispatch(el, 'oas-close', { source: 'y' })
    expect(fired).toHaveLength(firedBefore)
  })

  it('卸载后全部解绑：各事件不再触发', () => {
    const fired: FiredRecord[] = []
    const { root, container, el } = mount(
      createElement(MultiEventHost, {
        handlers: {
          'oas-change': (detail) => fired.push({ type: 'oas-change', detail }),
          'oas-close': (detail) => fired.push({ type: 'oas-close', detail }),
        },
        onFired: () => {},
      }),
    )

    dispatch(el, 'oas-change', { value: 'a' })
    expect(fired).toHaveLength(1)

    void act(() => {
      root.unmount()
    })
    container.remove()

    dispatch(el, 'oas-change', { value: 'b' })
    dispatch(el, 'oas-close', { source: 'y' })
    expect(fired).toHaveLength(1)
  })
})
