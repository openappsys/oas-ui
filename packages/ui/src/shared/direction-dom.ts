/**
 * 书写方向 · DOM 通道（零依赖分层件）。
 *
 * 判定顺序：最近 light DOM 祖先 `[dir]` → 可选 computed style（仅 rtl）→
 * `document.documentElement` 根级 `dir`；无任何声明返回 null（由上层决定回落）。
 *
 * 为何单独成模块：完整 `direction.ts` 还要叠加 config-provider 注入与 locale 回退，
 * 其闭包会拉入 `@oas-ui/core` + `@oas-ui/i18n`（实测 +8.4 KB gz）。叶子 helper 链
 * （如 `data/table/range`，独立预算 15 KB）只需要 DOM 通道——消费本模块即不背这份闭包；
 * 完整链（组件本体）继续用 `direction.ts` 的 `isRtl` / `resolveDirection`。
 * 两层共用同一份 DOM 判定，不再有组件内联副本。
 *
 * 体积账（gz 实测）：313 B（`dist/shared/direction-dom.js`，gzipSync 默认档；零依赖，
 * 叶子 helper 链只背这一份，不背 core/i18n 闭包）。
 */

const RTL = 'rtl'
const LTR = 'ltr'

/** 方向解析选项（DOM 层） */
export interface DirectionOptions {
  /**
   * 读取 computed style 的 `direction`（宿主样式表只写 CSS 方向的通道）。
   * 默认关：`getComputedStyle` 每次调用触发样式重算，组件 update() 热路径上不开。
   */
  computed?: boolean
}

/**
 * DOM 层方向判定。
 *
 * @returns `'rtl' | 'ltr'`（DOM 有显式声明）；`null` = DOM 无声明（调用方可回落 locale）
 */
export function resolveDomDirection(el?: Element | null, options?: DirectionOptions): 'ltr' | 'rtl' | null {
  if (el) {
    const ancestorDir = el.closest('[dir]')?.getAttribute('dir')
    if (ancestorDir === RTL || ancestorDir === LTR) return ancestorDir
    if (options?.computed && typeof getComputedStyle === 'function') {
      try {
        if (getComputedStyle(el).direction === RTL) return RTL
      } catch {
        /* 取不到计算样式（异常环境）→ 走后续通道 */
      }
    }
  }
  if (typeof document !== 'undefined') {
    const docDir = document.documentElement.getAttribute('dir')
    if (docDir === RTL || docDir === LTR) return docDir
  }
  return null
}

/** DOM 层是否 RTL（叶子 helper 用；无声明按 LTR 处理） */
export function isRtlDom(el?: Element | null, options?: DirectionOptions): boolean {
  return resolveDomDirection(el, options) === RTL
}
