/**
 * 会话 族注册入口（CDN 按需打包产物 dist/cdn/conversation.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = 源码顶层目录「会话」全部组件 index.js（import 即注册，与 src/index.ts 的 会话 段一致）。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../framework/config-provider/index.js'
import '../framework/app/index.js'
import '../framework/theme-editor/index.js'
import '../conversation/bubble/index.js'
import '../conversation/attachment/index.js'
import '../conversation/message-scroller/index.js'
import '../conversation/marker/index.js'
import '../conversation/message-row/index.js'
