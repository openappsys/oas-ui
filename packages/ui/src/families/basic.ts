/**
 * basic 族注册入口（CDN 按需打包产物 dist/cdn/basic.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = basic 目录全部组件 index.js（import 即注册，与 src/index.ts 的 basic 段完全一致）。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../floating/config-provider/index.js'
import '../floating/app/index.js'
import '../floating/theme-editor/index.js'
import '../basic/button/index.js'
import '../basic/icon/index.js'
import '../basic/tag/index.js'
import '../basic/badge/index.js'
import '../basic/space/index.js'
import '../basic/divider/index.js'
import '../basic/link/index.js'
import '../basic/typography/index.js'
import '../basic/button-group/index.js'
import '../basic/label/index.js'
import '../basic/kbd/index.js'
import '../basic/visually-hidden/index.js'
