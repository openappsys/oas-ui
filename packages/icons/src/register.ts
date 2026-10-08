/**
 * 内置全量图标集注册入口（副作用）。
 *
 * 用途：`import '@oas-ui/icons/register'` —— 把内置全量图标注册进运行时，使
 * `icon="check"` 这类**内置名**可被解析。
 *
 * 何时需要：
 * - 使用全量入口 `@oas-ui/ui`（含 CDN）时**已自动注册**，无需手动 import；
 * - 按需引入单个组件（`@oas-ui/ui/basic/button`）且用到**内置图名**时，import 本入口一次即可
 *   （否则仅**自定义注册** `registerIcon` / 远程库 / sprite / iconfont 来源的图标可用）。
 *
 * 这是「默认图标库 opt-in」的落点：让不需要全量图标的按需消费链不背整套图标体积。
 */
import { registerBuiltinIcons } from './runtime.js'
import { iconRegistry } from './registry.js'

registerBuiltinIcons(iconRegistry)
