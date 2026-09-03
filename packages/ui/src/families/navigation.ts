/**
 * 导航 族注册入口（CDN 按需打包产物 dist/cdn/navigation.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = 源码顶层目录「导航」全部组件 index.js（import 即注册，与 src/index.ts 的 导航 段一致）。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../framework/config-provider/index.js'
import '../framework/app/index.js'
import '../framework/theme-editor/index.js'
import '../navigation/menu/index.js'
import '../navigation/dropdown/index.js'
import '../navigation/contextmenu/index.js'
import '../navigation/command/index.js'
import '../navigation/menubar/index.js'
import '../navigation/navigation-menu/index.js'
import '../navigation/toolbar/index.js'
import '../navigation/speed-dial/index.js'
import '../navigation/breadcrumb/index.js'
import '../navigation/back-top/index.js'
import '../navigation/anchor/index.js'
import '../navigation/tour/index.js'
import '../navigation/bottom-navigation/index.js'
import '../navigation/stepper/index.js'
import '../navigation/steps/index.js'
import '../navigation/pagination/index.js'
import '../navigation/tabs/index.js'
import '../navigation/affix/index.js'
import '../navigation/page-header/index.js'
import '../navigation/float-button/index.js'
