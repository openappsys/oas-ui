import '@oas-ui/i18n'
import {
  OASTableBase,
  type TableColumn,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
} from './oas-table.js'
import { createColumnSettingsController } from './oas-table-column-settings.js'

/**
 * 组装后的 OASTable：核心骨架 + 能力控制器。
 * 当前=核心骨架 + 列设置能力（列拖拽重排 + 列宽调整，经 ReactiveController 注入）；
 * 后续能力以 controller 逐个 addController（作为能力级按需分包的基础）。
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

export {
  OASTable,
  OASTableBase,
  createColumnSettingsController,
  type TableColumn,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
}
