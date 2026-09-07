import { useEffect, useRef, type RefObject } from 'react'
import type { OasEventHandler } from './use-oas-event.js'

/**
 * 多个 `oas-*` 自定义事件 → 处理函数的映射。
 *
 * key 为事件名（带 `oas-` 前缀）。各事件的 detail 结构由组件事件契约决定，
 * 类型各异、无法用单一泛型静态约束，因此统一放宽为 `any` 并允许调用方在
 * 单个处理函数上自行标注参数类型（标注后该函数内部的 detail 即有类型提示）。
 * `any` 仅收敛在这一个类型别名上，hook 内部不做其它逃逸。
 */
export type OasEventHandlers = Record<string, OasEventHandler<any>>

/**
 * 批量把多个 `oas-*` 自定义事件桥接为 React hook（单事件场景用 useOasEvent）。
 *
 * - 单个 useEffect 统一绑定/解绑全部事件，卸载自动清理；
 * - handlers 放进 ref 每次渲染刷新 → 传新字面量/新引用**不**重复解绑/重绑，
 *   事件触发始终走最新闭包；
 * - 绑定 effect 依赖事件名集合（`Object.keys(handlers)` 有序拼接）：只有事件
 *   类型集合变化（增删 key）才重绑——新增类型即时生效、移除类型即时解绑。
 *
 * @param ref 指向目标元素（宿主 ref）的 RefObject
 * @param handlers 事件名 → 处理函数映射
 */
export function useOasEvents(
  ref: RefObject<HTMLElement | null>,
  handlers: OasEventHandlers,
): void {
  // handlers 最新化：事件触发时按 ev.type 从 ref 取最新处理函数（引用变化不重绑）
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  // 事件名集合（有序拼接），仅集合变化时触发重绑
  const typesKey = Object.keys(handlers).sort().join('\u0001')

  useEffect(() => {
    const el = ref.current
    if (!el || typesKey === '') return
    const types = typesKey.split('\u0001')

    const listener = (ev: Event): void => {
      const handler = handlersRef.current[ev.type]
      if (handler) handler((ev as CustomEvent).detail, ev)
    }

    for (const type of types) {
      el.addEventListener(type, listener)
    }
    return () => {
      for (const type of types) {
        el.removeEventListener(type, listener)
      }
    }
    // handlers 刻意不入依赖：已由 handlersRef 最新化接管；仅事件名集合变化需重绑
  }, [ref, typesKey])
}
