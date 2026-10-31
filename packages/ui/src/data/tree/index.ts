import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASTree, type TreeNode } from './oas-tree.js'

if (!customElements.get('oas-tree')) {
  customElements.define('oas-tree', OASTree)
}

export { OASTree, type TreeNode }
