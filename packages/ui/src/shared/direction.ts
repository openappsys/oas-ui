/**
 * 书写方向（LTR/RTL）判定：逻辑方向化的全局基础件。
 *
 * 分层：DOM 通道（最近 `[dir]` → 可选 computed style → 根级 `dir`，无声明返回 null）
 * 在 `direction-dom.ts`（零依赖）；本模块叠加 config-provider 注入与 locale 回退。
 * 叶子 helper 链消费 `direction-dom` 即可，不背 core/i18n 闭包（实测 +8.4 KB gz）。
 *
 * 方向来源优先级：
 * 1. `<oas-config-provider direction|dir>`（全局方向注入点）
 * 2. DOM 通道（见 `direction-dom.ts`）：最近 `[dir]` → 可选 computed style → 根级 `dir`
 * 3. 当前 locale 的方向元数据（如 ar 语言包自带 rtl）
 * 4. 回退 ltr
 *
 * 说明：computed style 通道**按需开启**（`options.computed`，默认关）——四个方向敏感
 * 调用点（cart 滑动 / invoice 类型切换 / table-range 键盘 / questionnaire 动画轴）保留
 * 原先直读 computed style 的语义；其余 70+ 处在 update() 热路径上，默认不读（每次
 * `getComputedStyle` 触发样式重算，千行渲染的 2000 次更新实测把测试进程撑爆）。
 * 只取「rtl」判定：ltr 是默认值，不能据此短路 locale 回退（ar 等 rtl 语言包）。
 *
 * 消费方式：
 * - 浮层定位：`resolveDirection(el)` 传给 `computePosition` 的 `options.direction`
 *   （引擎据此镜像主轴 left↔right 与对齐 start↔end）
 * - 组件级 RTL 覆盖样式：`update()` 里 `this.toggleAttribute('data-rtl', isRtl(this))`，
 *   CSS 用 `:host([data-rtl])` 写镜像规则（chevron 翻转、缩进反向等）——
 *   不用 `:host-context`（跨浏览器支持不齐），data 属性方案 shadow 内稳定可用
 */
import { findConfigProvider } from '@oas-ui/core/config-context'
import { getDirection } from '@oas-ui/i18n/registry'
import { resolveDomDirection, type DirectionOptions } from './direction-dom.js'

const RTL = 'rtl'
const LTR = 'ltr'

export type { DirectionOptions } from './direction-dom.js'

/** 解析元素的有效书写方向（'ltr' | 'rtl'），供浮层定位与方向敏感逻辑消费 */
export function resolveDirection(el?: Element | null, options?: DirectionOptions): 'ltr' | 'rtl' {
  if (el) {
    const provider = findConfigProvider(el)
    const providerDir = provider?.getAttribute('dir') ?? provider?.getAttribute('direction')
    if (providerDir === RTL || providerDir === LTR) return providerDir
  }
  const domDir = resolveDomDirection(el, options)
  if (domDir) return domDir
  return getDirection()
}

/** 元素是否处于 RTL 书写方向（data-rtl 镜像 / 布尔判定用） */
export function isRtl(el?: Element | null, options?: DirectionOptions): boolean {
  return resolveDirection(el, options) === RTL
}
