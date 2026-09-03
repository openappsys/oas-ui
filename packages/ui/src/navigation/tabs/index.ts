import { OASTabs } from './oas-tabs.js'
import { OASTabPanel } from './oas-tab-panel.js'

if (!customElements.get('oas-tabs')) {
  customElements.define('oas-tabs', OASTabs)
}
if (!customElements.get('oas-tab-panel')) {
  customElements.define('oas-tab-panel', OASTabPanel)
}

export { OASTabs, OASTabPanel }
