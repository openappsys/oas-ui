/**
 * 书写方向（LTR/RTL）判定：逻辑方向化的全局基础件。
 *
 * 方向来源优先级：
 * 1. `<oas-config-provider direction|dir>`（全局方向注入点）
 * 2. 最近 light DOM 祖先的 `[dir]` 显式声明（就近覆盖）
 * 3. `document.documentElement` 根级 `dir`
 * 4. 当前 locale 的方向元数据（如 ar 语言包自带 rtl）
 * 5. 回退 ltr
 *
 * 消费方式：
 * - 浮层定位：`resolveDirection(el)` 传给 `computePosition` 的 `options.direction`
 *   （引擎据此镜像主轴 left↔right 与对齐 start↔end）
 * - 组件级 RTL 覆盖样式：`update()` 里 `this.toggleAttribute('data-rtl', isRtl(this))`，
 *   CSS 用 `:host([data-rtl])` 写镜像规则（chevron 翻转、缩进反向等）——
 *   不用 `:host-context`（跨浏览器支持不齐），data 属性方案 shadow 内稳定可用
 */
import { findConfigProvider } from '@oas-ui/core'
import { getDirection } from '@oas-ui/i18n'

const RTL = 'rtl'
const LTR = 'ltr'

/** 解析元素的有效书写方向（'ltr' | 'rtl'），供浮层定位与方向敏感逻辑消费 */
export function resolveDirection(el?: Element | null): 'ltr' | 'rtl' {
  if (el) {
    const provider = findConfigProvider(el)
    const providerDir = provider?.getAttribute('dir') ?? provider?.getAttribute('direction')
    if (providerDir === RTL || providerDir === LTR) return providerDir
    const ancestorDir = el.closest('[dir]')?.getAttribute('dir')
    if (ancestorDir === RTL || ancestorDir === LTR) return ancestorDir
  }
  if (typeof document !== 'undefined') {
    const docDir = document.documentElement.getAttribute('dir')
    if (docDir === RTL || docDir === LTR) return docDir
  }
  return getDirection()
}

/** 元素是否处于 RTL 书写方向（data-rtl 镜像 / 布尔判定用） */
export function isRtl(el?: Element | null): boolean {
  return resolveDirection(el) === RTL
}
