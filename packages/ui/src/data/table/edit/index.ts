import { registerTableCapability } from '../oas-table-capability.js'
import {
  TableEditController,
  createEditController,
  type TableEditHost,
} from '../oas-table-edit.js'

/**
 * table 编辑能力包入口（按需 ESM 子路径 `@oas-ui/ui/data/table/edit`）。
 *
 * import 即注册：本模块求值即把编辑能力 controller 工厂写入 table 能力注册表，
 * 后续构造的 <oas-table>（OASTableBase 遍历注册表注入）自动获得行内编辑能力。
 * 未 import 本模块时，核心入口（data/table）只含骨架 + 列设置，`editable`/`actions`
 * 配置静默失效并触发 dev 告警（见 oas-table.ts 的 warnEditCapability）。
 *
 * 全量入口（@oas-ui/ui）与 CDN 数据族包（cdn/data）已内含本模块，其消费者无需显式引用。
 */
registerTableCapability('edit', (host) => createEditController(host as HTMLElement & TableEditHost))

export { TableEditController, createEditController }
export type { TableEditHost }
export type { TableColumn, EditOption } from '../oas-table.js'
export type { TableEditCapability } from '../oas-table.js'
