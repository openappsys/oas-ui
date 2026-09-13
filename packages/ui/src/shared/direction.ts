/**
 * 书写方向（LTR/RTL）判定：逻辑方向化的全局基础件。
 *
 * 方向来源：`<oas-config-provider direction="rtl">` 会给宿主写 `dir` 属性，
 * CSS `direction` 可继承穿透 shadow DOM——故优先沿 light DOM 祖先找最近的
 * `[dir]` 显式声明（host.closest 可达宿主自身与 light 祖先），无声明时回退
 * 计算样式（覆盖 html 根级 `dir`）。
 *
 * 消费方式：
 * - 浮层定位：`directionOf(el)` 传给 `computePosition` 的 `options.direction`
 *   （引擎据此镜像主轴 left↔right 与对齐 start↔end）
 * - 组件级 RTL 覆盖样式：`update()` 里 `this.toggleAttribute('data-rtl', isRtl(this))`，
 *   CSS 用 `:host([data-rtl])` 写镜像规则（chevron 翻转、缩进反向等）——
 *   不用 `:host-context`（跨浏览器支持不齐），data 属性方案 shadow 内稳定可用
 */

const RTL = 'rtl'
const LTR = 'ltr'

/** 元素是否处于 RTL 书写方向 */
export function isRtl(el: HTMLElement): boolean {
  const declared = el.closest('[dir]')?.getAttribute('dir')
  if (declared === RTL) return true
  if (declared === LTR) return false
  return typeof getComputedStyle === 'function' && getComputedStyle(el).direction === RTL
}

/** computePosition 的 direction 选项值（'ltr' | 'rtl'） */
export function directionOf(el: HTMLElement): 'ltr' | 'rtl' {
  return isRtl(el) ? RTL : LTR
}
