import { OASTreeSelect } from './oas-tree-select.js'

if (!customElements.get('oas-tree-select')) {
  customElements.define('oas-tree-select', OASTreeSelect)
}

export { OASTreeSelect }
