/**
 * 布局 族注册入口（CDN 按需打包产物 dist/cdn/layout.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = 源码顶层目录「布局」全部组件 index.js（import 即注册，与 src/index.ts 的 布局 段一致）。
 * 纯 import 组装，无执行逻辑；唯一导出 = registry 的 setLocale（与全量入口一致，IIFE 暴露为 OASUI.setLocale）。
 */
import '@oas-ui/icons/register'
import '@oas-ui/i18n/registry'
import '../framework/config-provider/index.js'
import '../framework/app/index.js'
import '../framework/theme-editor/index.js'
import '../layout/scroll-area/index.js'
import '../layout/flex/index.js'
import '../layout/splitter/index.js'
import '../layout/layout/index.js'
import '../layout/grid/index.js'
import '../layout/sidebar/index.js'
import '../layout/container/index.js'
import '../layout/aspect-ratio/index.js'
import '../layout/masonry/index.js'

// 唯一透传的 registry API（与全量入口一致）：OASUI.setLocale 切语言；其余 registry API 不进导出面
export { setLocale } from '@oas-ui/i18n/registry'
