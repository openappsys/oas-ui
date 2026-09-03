/**
 * 反馈与浮层 族注册入口（CDN 按需打包产物 dist/cdn/feedback.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = 源码顶层目录「反馈与浮层」全部组件 index.js（import 即注册，与 src/index.ts 的 反馈与浮层 段一致）。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../framework/config-provider/index.js'
import '../framework/app/index.js'
import '../framework/theme-editor/index.js'
import '../feedback/message/index.js'
import '../feedback/notification/index.js'
import '../feedback/toast/index.js'
import '../feedback/snackbar/index.js'
import '../feedback/backdrop/index.js'
import '../feedback/modal/index.js'
import '../feedback/confirm/index.js'
import '../feedback/drawer/index.js'
import '../feedback/popconfirm/index.js'
import '../feedback/alert/index.js'
import '../feedback/progress/index.js'
import '../feedback/loading-bar/index.js'
import '../feedback/spin/index.js'
import '../feedback/skeleton/index.js'
import '../feedback/empty/index.js'
import '../feedback/result/index.js'
import '../feedback/tooltip/index.js'
import '../feedback/popover/index.js'
import '../feedback/hover-card/index.js'
