import { useEffect, useRef, type RefObject } from 'react'

/**
 * oas-* 自定义事件处理函数。
 *
 * @typeParam TDetail 事件 detail 的类型（组件事件契约如 `{ value }` / `{ index }`）。
 * @param detail CustomEvent.detail
 * @param ev 原始事件（CustomEvent，可读 type / composedPath 等）
 */
export type OasEventHandler<TDetail = unknown> = (detail: TDetail, ev: Event) => void

/**
 * 把单个 `oas-*` 自定义事件桥接为 React hook。
 *
 * 背景：React 19 不会把 `onXxx` prop 桥接到 kebab-case 自定义事件
 * （`onOasSubmit` 只会被当作属性而非监听器，收不到组件派发的 `oas-submit`），
 * 需要手动 `addEventListener`。本 hook 封装这一过程：
 * - handler 存入 ref 每次渲染刷新 → 重渲染后事件触发走**最新**闭包，旧闭包不泄漏；
 * - 绑定 effect 只依赖 `[ref, type]` → 换 handler 不重复解绑/重绑；
 * - 卸载自动清理监听。
 *
 * @param ref 指向目标元素（宿主 ref，如 `<oas-button ref={...}>`）的 RefObject
 * @param type 事件名（带 `oas-` 前缀，如 `oas-submit`）
 * @param handler 事件处理函数
 */
export function useOasEvent<TDetail = unknown>(
  ref: RefObject<HTMLElement | null>,
  type: string,
  handler: OasEventHandler<TDetail>,
): void {
  // handler 最新化：每次渲染把最新引用写进 ref，绑定 effect 无需把 handler 放进依赖
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const listener = (ev: Event): void => {
      handlerRef.current((ev as CustomEvent<TDetail>).detail, ev)
    }
    el.addEventListener(type, listener)
    return () => {
      el.removeEventListener(type, listener)
    }
    // handler 刻意不入依赖：已由 handlerRef 最新化接管，避免每次渲染重复解绑/重绑
  }, [ref, type])
}
