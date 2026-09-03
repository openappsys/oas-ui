/**
 * layout 族注册入口（CDN 按需打包产物 dist/cdn/layout.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = layout 目录全部组件 index.js（import 即注册，与 src/index.ts 的 layout 段完全一致）。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../floating/config-provider/index.js'
import '../floating/app/index.js'
import '../floating/theme-editor/index.js'
import '../layout/segmented/index.js'
import '../layout/flex/index.js'
import '../layout/steps/index.js'
import '../layout/pagination/index.js'
import '../layout/tabs/index.js'
import '../layout/affix/index.js'
import '../layout/splitter/index.js'
import '../layout/page-header/index.js'
import '../layout/float-button/index.js'
import '../layout/layout/index.js'
import '../layout/grid/index.js'
import '../layout/sidebar/index.js'
import '../layout/container/index.js'
