/**
 * commerce 族注册入口（CDN 按需打包 → dist/cdn/commerce.js）
 *
 * 依赖：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等）。
 * 组件清单 = 源码顶层目录 commerce 下全部组件的 index.js（import 即注册，顺序与 src/index.ts 一致）。
 * 不 import 组件实现执行逻辑，唯一例外 = registry 侧 setLocale（全族统一，IIFE 暴露为 OASUI.setLocale）。
 */
import '@oas-ui/icons/register'
import '@oas-ui/i18n/registry'
import '../framework/config-provider/index.js'
import '../framework/app/index.js'
import '../framework/theme-editor/index.js'
import '../commerce/address/index.js'
import '../commerce/invoice/index.js'
import '../commerce/ecard/index.js'
import '../commerce/category/index.js'

// 唯一透传的 registry API（与全量入口一致）：OASUI.setLocale 可调用
export { setLocale } from '@oas-ui/i18n/registry'
