import { OASLayout } from './oas-layout.js'
import { OASHeader } from './oas-header.js'
import { OASSider } from './oas-sider.js'
import { OASContent } from './oas-content.js'
import { OASFooter } from './oas-footer.js'

for (const [tag, cls] of [
  ['oas-layout', OASLayout],
  ['oas-header', OASHeader],
  ['oas-sider', OASSider],
  ['oas-content', OASContent],
  ['oas-footer', OASFooter],
] as const) {
  if (!customElements.get(tag)) customElements.define(tag, cls)
}

export { OASLayout, OASHeader, OASSider, OASContent, OASFooter }
