import { OASLoadingBar } from './oas-loading-bar.js'
import { resolveMessageHost } from '../../framework/app/app-host.js'

/**
 * loadingBar 命令式 API —— 全局/局部加载进度条服务。
 *
 * - 每容器独立单例（默认宿主 + 任意局部容器互不干扰）
 * - start 并发计数：多次 start 累加会话，最后一个 finish/error 才收尾
 * - 生命周期事件在元素上派发（oas-start/oas-finish/oas-error），getEl 可取元素挂监听
 */

export type LoadingBarPosition = 'top' | 'bottom'

/** 挂载目标：容器元素 / CSS 选择器 / 返回元素的函数 */
export type LoadingBarTarget = HTMLElement | string | (() => HTMLElement)

export interface LoadingBarOptions {
  /** 推进节拍（ms/拍）：越大推进越慢，默认 200 */
  speed?: number
  /** 挂载目标：默认最近 app 宿主或 body；传容器元素/选择器/函数挂局部加载条（容器需为定位上下文） */
  to?: LoadingBarTarget
  /** 条位置：top（默认）或 bottom */
  position?: LoadingBarPosition
  /** 反向推进：从行内末端（end）向起点生长；RTL 下默认从行内起点生长 */
  reverse?: boolean
}

export interface LoadingBarHandle {
  /** 加载条元素：可挂 oas-start/oas-finish/oas-error 生命周期事件监听 */
  el: OASLoadingBar
}

/** 容器 → 加载条单例登记（每容器独立，互不干扰） */
const bars = new Map<HTMLElement, OASLoadingBar>()

/** 解析挂载目标：选择器/元素/函数 → 元素；缺省回退全局宿主（app 容器或 body） */
function resolveTarget(to?: LoadingBarTarget): HTMLElement {
  if (typeof to === 'string') {
    const el = document.querySelector<HTMLElement>(to)
    if (!el) throw new Error(`[loadingBar] 未找到挂载容器：${to}`)
    return el
  }
  if (typeof to === 'function') return to()
  if (to instanceof HTMLElement) return to
  return resolveMessageHost()
}

function resolveOptions(opts: number | LoadingBarOptions | undefined): LoadingBarOptions {
  if (typeof opts === 'number') return { speed: opts }
  return opts ?? {}
}

/** 取指定目标的加载条：存在且仍在文档中则复用，否则新建（挂载参数仅在创建时生效） */
function ensure(options: LoadingBarOptions = {}): OASLoadingBar {
  const target = resolveTarget(options.to)
  const cached = bars.get(target)
  if (cached && target.contains(cached)) return cached
  const el = document.createElement('oas-loading-bar') as OASLoadingBar
  if (options.position) el.setAttribute('position', options.position)
  if (options.reverse) el.setAttribute('reverse', '')
  if (options.to !== undefined) el.setAttribute('local', '')
  target.appendChild(el)
  bars.set(target, el)
  return el
}

/** 取目标容器当前加载条（未 start 过则 null） */
function bar(target?: LoadingBarTarget): OASLoadingBar | null {
  const t = resolveTarget(target)
  const cached = bars.get(t)
  return cached && t.contains(cached) ? cached : null
}

export const loadingBar = {
  /** 开始加载（返回句柄）：多次 start 并发计数，最后一个 finish/error 才收尾 */
  start(options?: number | LoadingBarOptions): LoadingBarHandle {
    const opts = resolveOptions(options)
    const el = ensure(opts)
    el.start(opts.speed)
    return { el }
  },

  /** 完成一个会话；并发会话下仅最后一个 finish 触发收尾 */
  finish(target?: LoadingBarTarget): void {
    bar(target)?.finish()
  },

  /**
   * 失败收尾：批次内任一 error 决定终态。
   * 未 start 直接调用为兜底——同样以错误态满格收尾（不闪烁），保证失败可见。
   */
  error(target?: LoadingBarTarget): void {
    const el = bar(target)
    if (el) {
      el.error()
      return
    }
    ensure({ to: target }).error()
  },

  /** 手动推进 step（默认随机 0–10）；夹取 0–100 */
  increment(step?: number, target?: LoadingBarTarget): void {
    bar(target)?.increment(step)
  },

  /** 精确设置进度（0–100 夹取） */
  set(percent: number, target?: LoadingBarTarget): void {
    bar(target)?.set(percent)
  },

  /** 手动回退 step（默认随机 0–10）；夹取 0–100 */
  decrement(step?: number, target?: LoadingBarTarget): void {
    bar(target)?.decrement(step)
  },

  /** 默认宿主当前是否有活跃会话 */
  get active(): boolean {
    return bar()?.active ?? false
  },

  /** 指定目标容器当前是否有活跃会话 */
  isActive(target?: LoadingBarTarget): boolean {
    return bar(target)?.active ?? false
  },

  /** 取目标容器的加载条元素（可挂生命周期事件监听）；未 start 过返回 null */
  getEl(target?: LoadingBarTarget): OASLoadingBar | null {
    return bar(target)
  },
}

/** 移除全部加载条（跨容器） */
export function destroyAll(): void {
  for (const el of bars.values()) el.remove()
  bars.clear()
}
