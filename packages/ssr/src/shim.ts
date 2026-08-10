/**
 * 最小 DOM shim —— 基于 happy-dom Window 为组件求值与渲染提供全局环境。
 *
 * 为什么需要 shim：
 * - 组件类声明（class X extends OASElement extends HTMLElement）在模块求值时就需要
 *   全局 `HTMLElement`；目录 index.ts 的 `customElements.define(...)` 需要全局
 *   `customElements`。因此必须先装 shim 再 import 组件模块（renderToString 内部保证顺序）。
 * - happy-dom 是仓库已有测试栈，零新运行时依赖类型，覆盖组件渲染所需的 DOM API 面。
 *
 * 幂等：模块级单例，多次调用不重复建 Window；同一进程内所有渲染复用同一个 DOM 环境。
 */
import { Window } from 'happy-dom'

/**
 * 需要装到 globalThis 的最小全局集。
 * - 组件类求值：HTMLElement、customElements
 * - 组件 render()/update() 实例执行：document、ShadowRoot 相关、CustomEvent/Event、MutationObserver
 * - config-context 的 instanceof 判定：Node、Element、ShadowRoot
 * - 实例期可选的浏览器 API（happy-dom 均有）：navigator、getComputedStyle、requestAnimationFrame、
 *   cancelAnimationFrame、ResizeObserver
 */
const GLOBALS = [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'Node',
  'Element',
  'ShadowRoot',
  'DocumentFragment',
  'CustomEvent',
  'Event',
  'MutationObserver',
  'navigator',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'ResizeObserver',
] as const

export interface Shim {
  /** happy-dom Window（含 document/customElements 等全部全局对象） */
  window: Window
  /** 视为 DOM Document 使用（运行时为 happy-dom 的 document） */
  document: Document
  customElements: CustomElementRegistry
}

let cached: Shim | null = null

/** 获取（必要时创建并安装）DOM shim。幂等。 */
export function ensureShim(): Shim {
  if (cached) return cached
  cached = createShim()
  return cached
}

function createShim(): Shim {
  const win = new Window({ url: 'http://localhost/' })
  installGlobals(win)
  return {
    window: win,
    // happy-dom 自带类型与其类实现存在差异，这里按 DOM 契约收窄类型
    document: win.document as unknown as Document,
    customElements: win.customElements as unknown as CustomElementRegistry,
  }
}

function installGlobals(win: Window): void {
  for (const name of GLOBALS) {
    const value = (win as unknown as Record<string, unknown>)[name]
    if (value === undefined) continue
    try {
      Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    } catch {
      // 环境已声明同名全局且不可重定义（如 vitest happy-dom 环境）：
      // 尽力赋值，失败则忽略（环境自带等价全局，渲染仍以 shim.document 为准）。
      try {
        ;(globalThis as unknown as Record<string, unknown>)[name] = value
      } catch {
        // 忽略
      }
    }
  }
  assertCriticalGlobals(win)
}

/** 关键全局必须真正生效，否则组件会注册到别的 customElements 上导致渲染错乱 */
function assertCriticalGlobals(win: Window): void {
  const g = globalThis as unknown as Record<string, unknown>
  if (g.document !== win.document || g.customElements !== win.customElements) {
    throw new Error(
      `[oas-ui/ssr] DOM shim 安装失败：document/customElements 未指向 happy-dom Window，当前环境不允许覆盖全局`,
    )
  }
}
