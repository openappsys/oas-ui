import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useOasEvent } from './use-oas-event.js'

/**
 * @oas-ui/react useOasEvent 单测（happy-dom）。
 *
 * React 19 不会把 onXxx prop 桥接到 kebab-case 自定义事件（onOasSubmit 监听不到
 * oas-submit），因此提供手动 addEventListener 的 hook。断言三类契约：
 * 1. 事件触发 handler 收到 detail 与原始 Event；
 * 2. handler 闭包最新化——重渲染后旧闭包不泄漏、且不重复解绑/重绑；
 * 3. 卸载后解绑，事件不再触发。
 */

// 让 react act() 正常工作（避免 "not wrapped in act" 告警）
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

/** 事件触发记录 */
interface FiredRecord {
  detail: unknown
  ev: Event
}

/** 单事件宿主：把 hook 绑定到内部 div，事件结果上抛 */
function SingleEventHost(props: { type: string; onFired: (r: FiredRecord) => void }): ReturnType<typeof createElement> {
  const { type, onFired } = props
  const ref = useRef<HTMLDivElement | null>(null)
  useOasEvent<{ payload: string }>(ref, type, (detail, ev) => {
    onFired({ detail, ev })
  })
  return createElement('div', { ref })
}

/** 渲染辅助：挂到 body，返回容器与其首个元素 */
function mount(host: ReturnType<typeof createElement>): { root: Root; container: HTMLDivElement; el: HTMLDivElement } {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  // React 18 起 render 返回 void；用同步 act 包一层保证 effects 已 flush
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

describe('useOasEvent', () => {
  it('事件触发：handler 收到 detail 与原始 Event（含泛型 detail）', () => {
    const fired: FiredRecord[] = []
    const { root, container, el } = mount(
      createElement(SingleEventHost, {
        type: 'oas-submit',
        onFired: (r) => fired.push(r),
      }),
    )
    mounted.push({ root, container })

    const detail = { payload: 'hello' }
    const ev = dispatch(el, 'oas-submit', detail)

    expect(fired).toHaveLength(1)
    expect(fired[0]?.detail).toEqual(detail)
    expect(fired[0]?.ev).toBe(ev)
    expect(ev.type).toBe('oas-submit')
  })

  it('handler 闭包最新化：重渲染后触发走最新 handler，且不重绑监听', () => {
    const calls: string[] = []
    const { root, container, el } = mount(
      createElement(SingleEventHost, {
        type: 'oas-change',
        onFired: () => calls.push('first'),
      }),
    )
    mounted.push({ root, container })

    // 监听已就位后打桩，记录后续是否发生重绑
    const addSpy = vi.spyOn(el, 'addEventListener')
    const removeSpy = vi.spyOn(el, 'removeEventListener')

    // 重渲染：传入全新 handler 引用（闭包捕获 'second'）
    void act(() => {
      root.render(
        createElement(SingleEventHost, {
          type: 'oas-change',
          onFired: () => calls.push('second'),
        }),
      )
    })

    // handlers 引用变化不得触发解绑/重绑
    expect(addSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()

    dispatch(el, 'oas-change', { payload: 'x' })
    // 旧闭包（'first'）不得被调用
    expect(calls).toEqual(['second'])
  })

  it('卸载后解绑：事件不再触发 handler', () => {
    const calls: string[] = []
    const { root, container, el } = mount(
      createElement(SingleEventHost, {
        type: 'oas-close',
        onFired: () => calls.push('fired'),
      }),
    )

    dispatch(el, 'oas-close', {})
    expect(calls).toEqual(['fired'])

    // 卸载
    void act(() => {
      root.unmount()
    })
    container.remove()

    // 对已卸载元素再派发（引用仍持有），监听已移除则不触发
    dispatch(el, 'oas-close', {})
    expect(calls).toEqual(['fired'])
  })

  it('未匹配事件名不触发 handler（只监听指定类型）', () => {
    const fired: FiredRecord[] = []
    const { root, container, el } = mount(
      createElement(SingleEventHost, {
        type: 'oas-submit',
        onFired: (r) => fired.push(r),
      }),
    )
    mounted.push({ root, container })

    dispatch(el, 'oas-cancel', {})
    expect(fired).toHaveLength(0)
  })
})
