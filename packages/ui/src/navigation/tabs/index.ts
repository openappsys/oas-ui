// 主路径默认含 manager 能力（能力包 import 即注册，与全量入口/族包行为一致）；
// 纯核瘦身走 `@oas-ui/ui/navigation/tabs/core` 子路径（不含能力，见 ./core/index.ts）。
import './manager/index.js'
import { OASTabs } from './oas-tabs.js'
import { OASTabPanel } from './oas-tab-panel.js'

if (!customElements.get('oas-tabs')) {
  customElements.define('oas-tabs', OASTabs)
}
if (!customElements.get('oas-tab-panel')) {
  customElements.define('oas-tab-panel', OASTabPanel)
}

export { OASTabs, OASTabPanel }
