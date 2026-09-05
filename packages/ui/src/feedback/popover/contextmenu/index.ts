import { registerPopoverCapability } from '../oas-popover-capability.js'
import {
  PopoverContextmenuController,
  createContextmenuController,
  type PopoverContextmenuHost,
} from '../oas-popover-contextmenu.js'

/**
 * popover contextmenu 能力包入口（按需 ESM 子路径 `@oas-ui/ui/feedback/popover/contextmenu`）。
 *
 * import 即注册：本模块求值即把 contextmenu 能力 controller 工厂写入 popover 能力注册表，
 * 后续构造的 <oas-popover>（OASPopover 构造时遍历注册表注入）自动获得右键族增强：
 * 右键光标定位（指针坐标锚点打开）+ 触屏长按 + placement/size 断点响应。
 * 未 import 本模块时，核心入口（feedback/popover）只含基础浮层——`trigger="contextmenu"`
 * 的右键触发开面板仍可用（core 行为），但光标定位 / 长按 / 断点简写静默失效并触发
 * dev 告警（见 oas-popover.ts 的 warnContextmenuCapability）。
 *
 * 全量入口（@oas-ui/ui）与 CDN 反馈族包已内含本模块，其消费者无需显式引用。
 */
registerPopoverCapability('contextmenu', (host) =>
  createContextmenuController(host as HTMLElement & PopoverContextmenuHost),
)

export { PopoverContextmenuController, createContextmenuController }
export type { PopoverContextmenuHost }
