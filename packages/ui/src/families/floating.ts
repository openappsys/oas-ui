/**
 * floating 族注册入口（CDN 按需打包产物 dist/cdn/floating.js）。
 * 基座内联：@oas-ui/i18n + config-provider/app/theme-editor 框架级三件（每族都 import，幂等守卫防重）。
 * 族内容 = floating 目录组件 index.js（import 即注册）：config-provider/app/theme-editor 属框架级基座已在上方
 * import，此处只列目录其余组件（tooltip/popover/menu/dropdown/contextmenu/hover-card/command/menubar/
 * navigation-menu/toolbar/scroll-area/speed-dial），与 src/index.ts 的 floating 段覆盖范围一致。
 * 纯 import 组装，无执行逻辑。
 */
import '@oas-ui/i18n'
import '../floating/config-provider/index.js'
import '../floating/app/index.js'
import '../floating/theme-editor/index.js'
import '../floating/tooltip/index.js'
import '../floating/popover/index.js'
import '../floating/menu/index.js'
import '../floating/dropdown/index.js'
import '../floating/contextmenu/index.js'
import '../floating/hover-card/index.js'
import '../floating/command/index.js'
import '../floating/menubar/index.js'
import '../floating/navigation-menu/index.js'
import '../floating/toolbar/index.js'
import '../floating/scroll-area/index.js'
import '../floating/speed-dial/index.js'
