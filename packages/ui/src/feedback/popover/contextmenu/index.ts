import { registerPopoverCapability } from '../oas-popover-capability.js'
import {
  PopoverContextmenuController,
  createContextmenuController,
  type PopoverContextmenuHost,
} from '../oas-popover-contextmenu.js'

/**
 * popover contextmenu 能力包入口（ESM 子路径 `@oas-ui/ui/feedback/popover/contextmenu`）。
 *
 * import 即注册：本模块求值即把 contextmenu 能力 controller 工厂写入 popover 能力注册表，
 * 后续构造的 <oas-popover>（OASPopover 构造时遍历注册表注入）自动获得右键族增强：
 * 右键光标定位（指针坐标锚点打开）+ 触屏长按 + placement/size 断点响应。
 *
 * 主路径入口（feedback/popover/index）已默认 import 本模块，其消费者无需显式引用；
 * 仅纯核入口（feedback/popover/core）不含这些增强——`trigger="contextmenu"` 的右键触发
 * 开面板仍可用（core 行为），但光标定位 / 长按 / 断点简写静默失效并 dev 告警一次
 * （见 oas-popover.ts 的 warnContextmenuNotImported），需显式 import 本模块。
 * 全量入口（@oas-ui/ui）与 CDN 反馈族包同样已内含。
 */
registerPopoverCapability('contextmenu', (host) =>
  createContextmenuController(host as HTMLElement & PopoverContextmenuHost),
)

export { PopoverContextmenuController, createContextmenuController }
export type { PopoverContextmenuHost }
