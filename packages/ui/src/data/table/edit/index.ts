import { registerTableCapability } from '../oas-table-capability.js'
import { TableEditController, createEditController, type TableEditHost } from '../oas-table-edit.js'
// type='checkbox' 列的编辑器走 oas-switch（editComponent 组件通道）——副作用注册随能力包
// 闭合：未引全量入口的消费者（core + edit 子路径）声明 checkbox 编辑时编辑器可正常升级，
// 否则挂载永不升级的白板元素（无 shadow 不可交互的死编辑态，交叉审实抓）
import '../../../form/switch/index.js'
/**
 * table 编辑能力包入口（ESM 子路径 `@oas-ui/ui/data/table/edit`）。
 *
 * import 即注册：本模块求值即把编辑能力 controller 工厂写入 table 能力注册表，
 * 后续构造的 <oas-table>（OASTableBase 遍历注册表注入）自动获得行内编辑能力。
 *
 * 主路径入口（data/table/index）已默认 import 本模块，其消费者无需显式引用；
 * 仅纯核入口（data/table/core）不含本能力——用到 `editable`/`actions` 配置时需显式
 * import 本模块（否则配置静默失效并 dev 告警一次，见 oas-table.ts 的 warnEditNotImported）。
 * 全量入口（@oas-ui/ui）与 CDN 数据族包同样已内含。
 */
registerTableCapability('edit', (host) => createEditController(host as HTMLElement & TableEditHost))

export { TableEditController, createEditController }
export type { TableEditHost }
export type { TableColumn, EditOption } from '../oas-table.js'
export type { TableEditCapability } from '../oas-table.js'
