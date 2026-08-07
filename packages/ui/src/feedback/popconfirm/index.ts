import { OASPopconfirm } from './oas-popconfirm.js'

if (!customElements.get('oas-popconfirm')) {
  customElements.define('oas-popconfirm', OASPopconfirm)
}

export { OASPopconfirm }
