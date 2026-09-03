/**
 * navigation 族注册入口（CDN 按需打包产物 dist/cdn/navigation.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = navigation 目录全部组件 index.js（import 即注册，与 src/index.ts 的 navigation 段完全一致）。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../floating/config-provider/index.js'
import '../floating/app/index.js'
import '../floating/theme-editor/index.js'
import '../navigation/breadcrumb/index.js'
import '../navigation/back-top/index.js'
import '../navigation/anchor/index.js'
import '../navigation/tour/index.js'
import '../navigation/bottom-navigation/index.js'
import '../navigation/stepper/index.js'
