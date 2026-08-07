import { OASTree, type TreeNode } from './oas-tree.js'

if (!customElements.get('oas-tree')) {
  customElements.define('oas-tree', OASTree)
}

export { OASTree, type TreeNode }
