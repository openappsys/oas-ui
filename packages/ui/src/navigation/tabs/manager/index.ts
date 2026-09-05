import { registerTabsCapability } from '../oas-tabs-capability.js'
import {
  TabsManagerController,
  createTabsManagerController,
  type TabsManagerHost,
} from '../oas-tabs-manager.js'

/**
 * tabs manager 能力包入口（按需 ESM 子路径 `@oas-ui/ui/navigation/tabs/manager`）。
 *
 * import 即注册：本模块求值即把 manager 能力 controller 工厂写入 tabs 能力注册表，
 * 后续构造的 <oas-tabs>（OASTabs 遍历注册表注入）自动获得 editable 双击重命名 /
 * contextmenu 右键菜单 / sortable 拖拽排序能力。
 * 未 import 本模块时，核心入口（navigation/tabs）只含纯切换骨架，`context-menu` / `sortable`
 * 属性与面板 `editable` 配置静默失效并触发 dev 告警（见 oas-tabs.ts 的 warnManagerCapability）。
 *
 * 全量入口（@oas-ui/ui）与 CDN 导航族包（cdn/navigation）已内含本模块，其消费者无需显式引用。
 */
registerTabsCapability('manager', (host) =>
  createTabsManagerController(host as HTMLElement & TabsManagerHost),
)

export { TabsManagerController, createTabsManagerController }
export type { TabsManagerHost }
export type { TabsManagerCapability } from '../oas-tabs.js'
export type { OASTabs } from '../oas-tabs.js'
