// 纯核入口（core-only）：不含 manager 能力包（L3），context-menu 右键菜单 /
// sortable 拖拽 / editable 双击重命名 配置在此路径下静默失效并在 dev 告警一次
// （见 oas-tabs.ts 的 warnManagerNotImported）。
// 主路径 `@oas-ui/ui/navigation/tabs` 已默认内含 manager 能力——仅需纯核瘦身的
// 消费者显式选本路径，并按需 import './manager/index.js' 补能力。
import { OASTabs } from '../oas-tabs.js'
import { OASTabPanel } from '../oas-tab-panel.js'

if (!customElements.get('oas-tabs')) {
  customElements.define('oas-tabs', OASTabs)
}
if (!customElements.get('oas-tab-panel')) {
  customElements.define('oas-tab-panel', OASTabPanel)
}

export { OASTabs, OASTabPanel }
