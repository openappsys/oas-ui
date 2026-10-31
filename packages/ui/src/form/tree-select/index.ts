import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASTreeSelect } from './oas-tree-select.js'

if (!customElements.get('oas-tree-select')) {
  customElements.define('oas-tree-select', OASTreeSelect)
}

export { OASTreeSelect }
export type { TreeOption } from './oas-tree-select.js'
