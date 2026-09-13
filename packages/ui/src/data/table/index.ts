// 主路径默认含行内编辑能力（能力包 import 即注册，与全量入口/族包行为一致）；
// 纯核瘦身走 `@oas-ui/ui/data/table/core` 子路径（不含能力，见 ./core/index.ts）。
import './edit/index.js'
import '@oas-ui/i18n'
import '../../navigation/pagination/index.js'
import { OASTableColumn } from './oas-table-column.js'
import {
  OASTableBase,
  type TableColumn,
  type TableEditDetail,
  type TableEditCapability,
  type TableRowClass,
  type TableSpanMethod,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
} from './oas-table.js'
import { createColumnSettingsController } from './oas-table-column-settings.js'
import { registerTableCapability, registeredTableCapabilities, hasTableCapability } from './oas-table-capability.js'

/**
 * 组装后的 OASTable：核心骨架 + 能力控制器。
 * 当前 = 核心骨架 + 列设置能力（列拖拽重排 + 列宽调整，经 ReactiveController 注入）。
 *
 * 行内编辑（editable/editor/actions）为独立能力包（按需子路径
 * `@oas-ui/ui/data/table/edit`，import 即注册）：核心入口不依赖它——未 import 时
 * 编辑配置静默失效并 dev 告警。全量入口（@oas-ui/ui）与 CDN 数据族包已内含编辑能力。
 */
class OASTable extends OASTableBase {
  private colSettings: ReturnType<typeof createColumnSettingsController>
  constructor() {
    super()
    this.colSettings = createColumnSettingsController(this)
    this.addController(this.colSettings)
  }
  protected override update(): void {
    super.update()
    // 部分更新路径（core 的 locale/config 订阅回调）直调 update() 绕过 controller 通知，
    // 表头重建后此处补同步列设置能力（幂等：syncMoveButtons 按 .col-move 在场查重，
    // draggable 重写无副作用），保证触屏重排按钮与 DnD 在任意重渲染后都在场
    this.colSettings.hostUpdated()
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
  type TableRowClass,
  type TableSpanMethod,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
}
