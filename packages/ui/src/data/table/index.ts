import '@oas-ui/i18n'
import '../../navigation/pagination/index.js'
import { OASTableColumn } from './oas-table-column.js'
import {
  OASTableBase,
  type TableColumn,
  type TableEditDetail,
  type TableEditCapability,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
  } from './oas-table.js'
import { createColumnSettingsController } from './oas-table-column-settings.js'
import {
  registerTableCapability,
  registeredTableCapabilities,
  hasTableCapability,
} from './oas-table-capability.js'

/**
 * 组装后的 OASTable：核心骨架 + 能力控制器。
 * 当前 = 核心骨架 + 列设置能力（列拖拽重排 + 列宽调整，经 ReactiveController 注入）。
 *
 * 行内编辑（editable/editor/actions）为独立能力包（按需子路径
 * `@oas-ui/ui/data/table/edit`，import 即注册）：核心入口不依赖它——未 import 时
 * 编辑配置静默失效并 dev 告警。全量入口（@oas-ui/ui）与 CDN 数据族包已内含编辑能力。
 */
class OASTable extends OASTableBase {
  constructor() {
    super()
    this.addController(createColumnSettingsController(this))
  }
}
if (!customElements.get('oas-table')) {
  customElements.define('oas-table', OASTable)
}
if (!customElements.get('oas-table-column')) {
  customElements.define('oas-table-column', OASTableColumn)
}

export {
  OASTable,
  OASTableBase,
  OASTableColumn,
  createColumnSettingsController,
  registerTableCapability,
  registeredTableCapabilities,
  hasTableCapability,
  type TableColumn,
  type TableEditDetail,
  type TableEditCapability,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
}
