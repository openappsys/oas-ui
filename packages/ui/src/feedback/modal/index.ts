import { OASModal } from './oas-modal.js'

if (!customElements.get('oas-modal')) {
  customElements.define('oas-modal', OASModal)
}

export { OASModal }
